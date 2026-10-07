"""Retrieve and answer from the Brasaland knowledge index.

Canonical query path for ``POST /knowledge/query``. Indexing lives in
``data/process/rag.py`` (collection ``brasaland_kb``).

Default (no API keys):

- retrieval uses local hashed embeddings plus token overlap
- the answer is an extractive quote of the cited chunks

Live generation and Qdrant are opt-in:

- ``BRASALAND_RAG_LLM=openai`` and ``OPENAI_API_KEY`` — chat completion
- ``BRASALAND_RAG_BACKEND=qdrant`` — search the vector collection
"""
from __future__ import annotations

import os

from data.process.rag import (
    COLLECTION_NAME,
    content_tokens,
    embed,
    embed_local,
    local_index,
    match_blob,
    qdrant_client,
    rag_backend,
    tokens,
)
from services.safe_errors import ExternalServiceError, call_external

MIN_SCORE_LOCAL = 0.30
MIN_SCORE_QDRANT = 0.40
DEFAULT_K = 5
INSUFFICIENT = "There is not enough information available to answer this question."

SYSTEM_RULES = """You are the Brasaland knowledge assistant for restaurant staff and leadership.

STRICT BUSINESS RULES:
1. Base your answer ONLY on the provided Context.
2. NEVER say 'zero risk' or '100% safe' for allergen questions. Follow the literal wording in the context.
3. Keep all currency values (USD and COP) EXACTLY as they appear in the source text. DO NOT convert currencies.
4. Do NOT invent or estimate any numerical values, weights, percentages, or quantities not present in the context.
5. If the context does not contain enough information, say: "There is not enough information available to answer this question."
6. Brasa Points runs on physical stamp cards unless the context explicitly says a digital app is available today.
7. Cite the source document name in the answer.
"""


def llm_backend() -> str:
    return os.getenv("BRASALAND_RAG_LLM", "extractive").strip().lower() or "extractive"


def _token_matches(query_token: str, chunk_tokens: set[str]) -> bool:
    if query_token in chunk_tokens:
        return True
    if len(query_token) < 4:
        return False
    for chunk_token in chunk_tokens:
        if len(chunk_token) < 4:
            continue
        if query_token.startswith(chunk_token) or chunk_token.startswith(query_token):
            return True
    return False


def token_recall(question: str, text: str) -> float:
    query_tokens = content_tokens(question)
    if not query_tokens:
        return 0.0
    chunk_tokens = set(tokens(text))
    hits = sum(1 for token in query_tokens if _token_matches(token, chunk_tokens))
    return hits / len(query_tokens)


def _dot(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


def hybrid_score(question: str, chunk: dict, query_vector: list[float]) -> float:
    lexical = token_recall(question, match_blob(chunk))
    cosine = max(0.0, _dot(query_vector, chunk["vector"]))
    return (0.75 * lexical) + (0.25 * cosine)


def _public(chunk: dict, score: float) -> dict:
    return {
        "source_document": chunk.get("source_document", ""),
        "section": chunk.get("section", ""),
        "text": chunk.get("text", ""),
        "score": round(float(score), 4),
        "chunk_index": int(chunk.get("chunk_index", 0)),
        "language": chunk.get("language", "en"),
    }


def search_qdrant(vector: list[float], k: int) -> list[tuple[float, dict]]:
    """Return ``(score, payload)`` from collection ``brasaland_kb``."""

    def _run():
        client = qdrant_client()
        if hasattr(client, "search"):
            hits = client.search(
                collection_name=COLLECTION_NAME,
                query_vector=vector,
                limit=k,
            )
        else:
            response = client.query_points(
                collection_name=COLLECTION_NAME,
                query=vector,
                limit=k,
            )
            hits = response.points
        pairs: list[tuple[float, dict]] = []
        for hit in hits:
            payload = dict(getattr(hit, "payload", None) or {})
            pairs.append((float(getattr(hit, "score", 0.0) or 0.0), payload))
        return pairs

    return call_external("vector store", _run)


def retrieve(query_str: str, k: int = DEFAULT_K, min_score: float | None = None) -> list[dict]:
    """Top chunks for ``query_str``. Local hybrid score, or Qdrant cosine when configured."""
    if rag_backend() == "qdrant":
        floor = MIN_SCORE_QDRANT if min_score is None else min_score
        vector = embed(query_str)
        found = []
        for score, payload in search_qdrant(vector, k):
            if score < floor or not payload.get("text"):
                continue
            found.append(_public(payload, score))
        return found

    floor = MIN_SCORE_LOCAL if min_score is None else min_score
    query_vector = embed_local(query_str)
    ranked: list[tuple[float, dict]] = []
    for chunk in local_index():
        score = hybrid_score(query_str, chunk, query_vector)
        if score >= floor:
            ranked.append((score, chunk))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [_public(chunk, score) for score, chunk in ranked[:k]]


def build_prompt(question: str, chunks: list[dict]) -> str:
    context = "\n\n".join(
        f"--- {chunk.get('source_document', 'document')} / {chunk.get('section', '')} ---\n{chunk.get('text', '')}"
        for chunk in chunks
    )
    return (
        f"{SYSTEM_RULES}\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n"
    )


def extractive_answer(chunks: list[dict]) -> str:
    if not chunks:
        return INSUFFICIENT
    blocks = [
        f"Source: {chunk['source_document']} ({chunk['section']})\n{chunk['text']}"
        for chunk in chunks
    ]
    return "\n\n".join(blocks)


def generate_openai(question: str, chunks: list[dict]) -> str:
    """One chat completion. Caller must set ``BRASALAND_RAG_LLM=openai``."""
    from data.process.rag import _openai

    prompt = build_prompt(question, chunks)
    model = os.getenv("BRASALAND_RAG_LLM_MODEL", "gpt-4o-mini")

    def _run():
        # Reuse the embeddings client factory; a missing key raises ExternalServiceError
        # with service name "embeddings". Map that to the language model for this call.
        try:
            client = _openai()
        except ExternalServiceError as error:
            raise ExternalServiceError("language model") from error
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
        )
        content = response.choices[0].message.content
        return content or ""

    return call_external("language model", _run)


def answer_question(question: str, k: int = DEFAULT_K) -> dict:
    """Grounded answer plus the source chunks that support it."""
    cleaned = (question or "").strip()
    if not cleaned:
        return {"answer": INSUFFICIENT, "sources": []}
    sources = retrieve(cleaned, k=k)
    if not sources:
        return {"answer": INSUFFICIENT, "sources": []}
    if llm_backend() == "openai":
        generated = generate_openai(cleaned, sources).strip()
        answer = generated or extractive_answer(sources)
    else:
        answer = extractive_answer(sources)
    return {"answer": answer, "sources": sources}


def query(question: str) -> str:
    """Answer text only. Prefer ``answer_question`` when citations are required."""
    return answer_question(question)["answer"]
