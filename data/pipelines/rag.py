"""Retrieval-augmented generation pipeline for TrackFlow knowledge queries."""

from __future__ import annotations

import os
import re
import unicodedata
from typing import Any

import httpx

from data.process.rag import COLLECTION_NAME, embed

DEFAULT_GENERATION_MODEL = "gpt-4o-mini"
DEFAULT_MIN_SCORE = 0.35

# Hybrid retrieval: dense similarity gates candidates (min_score requirement),
# keyword overlap only re-ranks what already passed the threshold.
DENSE_WEIGHT = 0.7
KEYWORD_WEIGHT = 0.3

_QUESTION_STOPWORDS = {
    "a", "al", "como", "con", "cual", "cuales", "cuando", "cuanto", "de", "del",
    "donde", "el", "en", "es", "esta", "estan", "ha", "hay", "la", "las", "lo",
    "los", "para", "por", "que", "se", "son", "su", "sus", "un", "una", "y", "o",
}


def _normalize_tokens(text: str) -> list[str]:
    lowered = unicodedata.normalize("NFD", text.lower())
    lowered = "".join(char for char in lowered if unicodedata.category(char) != "Mn")
    tokens = re.findall(r"[a-z0-9]{3,}", lowered)
    return [token for token in tokens if token not in _QUESTION_STOPWORDS]


def _keyword_score(tokens: list[str], text: str) -> float:
    """Fraction of query tokens matched in a chunk, accent-insensitive."""
    if not tokens:
        return 0.0
    lowered = unicodedata.normalize("NFD", text.lower())
    lowered = "".join(char for char in lowered if unicodedata.category(char) != "Mn")
    words = set(re.findall(r"[a-z0-9]{3,}", lowered))
    matched = sum(1 for token in tokens if any(word.startswith(token) or token.startswith(word) for word in words))
    return matched / len(tokens)


def _client() -> Any:
    from qdrant_client import QdrantClient

    return QdrantClient(
        url=os.getenv("QDRANT_URL", "http://localhost:6333"),
        api_key=os.getenv("QDRANT_API_KEY") or None,
    )


def retrieve(query: str, *, k: int = 5, min_score: float = DEFAULT_MIN_SCORE) -> list[dict[str, Any]]:
    """Return only payloads whose semantic score meets the relevance threshold."""
    if k < 1:
        return []
    # Over-fetch candidates so the hybrid re-rank can promote chunks the
    # dense ranking alone would leave out of the top-k (single search call).
    results = _client().search(
        collection_name=COLLECTION_NAME,
        query_vector=embed(query),
        limit=max(k * 4, 20),
        with_payload=True,
    )
    selected: list[dict[str, Any]] = []
    for result in results:
        score = float(getattr(result, "score", 0.0))
        if score < min_score:
            continue
        payload = dict(getattr(result, "payload", {}) or {})
        payload["score"] = score
        selected.append(payload)

    # Hybrid re-rank: keyword overlap boosts chunks whose text literally
    # contains the query terms; dense score still dominates the ranking.
    tokens = _normalize_tokens(query)
    for payload in selected:
        keyword = _keyword_score(tokens, payload.get("text", ""))
        payload["keyword_score"] = keyword
        payload["score"] = round(DENSE_WEIGHT * payload["score"] + KEYWORD_WEIGHT * keyword, 4)
    selected.sort(key=lambda item: item["score"], reverse=True)
    return selected[:k]


def _generation_settings() -> tuple[str, str, str]:
    base_url = os.getenv("GENERATION_API_BASE_URL", os.getenv("LLM_API_BASE_URL", ""))
    api_key = os.getenv("GENERATION_API_KEY", os.getenv("LLM_API_KEY", ""))
    model = os.getenv("GENERATION_MODEL", DEFAULT_GENERATION_MODEL)
    return base_url.rstrip("/"), api_key, model


def _fallback_answer() -> str:
    return (
        "No encuentro información suficientemente relevante en la base de conocimiento "
        "de TrackFlow para responder con seguridad. Recomiendo confirmar el caso con "
        "el account manager antes de comprometer una condición."
    )


def generate_answer(question: str, context: list[dict[str, Any]]) -> str:
    """Generate a cautious salesperson answer without exposing raw retrieval chunks."""
    if not context:
        return _fallback_answer()
    base_url, api_key, model = _generation_settings()
    if not base_url:
        raise RuntimeError("GENERATION_API_BASE_URL or LLM_API_BASE_URL is required")
    context_text = "\n\n".join(
        f"[{item.get('source_document')} · {item.get('section')}] {item.get('text', '')}"
        for item in context
    )
    system = (
        "Eres un account manager de TrackFlow. Responde en español, con precisión y cautela. "
        "Usa únicamente el contexto entregado; si falta información, dilo explícitamente. "
        "No prometas SLA en Black Friday, Navidad ni Rebajas de enero. Las devoluciones "
        "internacionales requieren gestión manual de Sofía Ramos. Los descuentos de almacén "
        "requieren aprobación de Miguel Torres y las excepciones de transportista de Carlos Vega. "
        "Devuelve solo la respuesta final para el cliente, sin listar chunks ni puntuaciones."
    )
    response = httpx.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
        json={
            "model": model,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": f"Contexto:\n{context_text}\n\nPregunta: {question}"},
            ],
        },
        timeout=90,
    )
    response.raise_for_status()
    answer = response.json()["choices"][0]["message"]["content"].strip()
    return answer or _fallback_answer()


def query(question: str) -> str:
    """Compose retrieval and generation; this is the public application entry point."""
    context = retrieve(question)
    return generate_answer(question, context)
