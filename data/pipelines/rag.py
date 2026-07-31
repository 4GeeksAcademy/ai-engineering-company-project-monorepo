import logging
import os

from qdrant_client import QdrantClient

from data.process.rag import COLLECTION_NAME, embed
from shared.llm_config import GENERATION_MODEL_ID, generation_client

logger = logging.getLogger(__name__)

DEFAULT_K = 5
MIN_SCORE = 0.68  # Calibrated for pplx-embed-v1-0.6b (valid matches often score ~0.68–0.85)

qdrant_client = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", 6333)),
)

SYSTEM_PROMPT = (
    "You are a Brasaland sales representative helping the commercial team answer prospect and "
    "client questions about our grilled-food restaurant chain in Colombia and Florida. "
    "Answer from a salesperson's perspective — professional, helpful, and aligned with how "
    "Brasaland presents itself to customers. "
    "Use ONLY the retrieved context provided in the user message; do not rely on outside knowledge "
    "or invent company facts, numbers, weights, or percentages. "
    "Keep currency values (USD $, COP $) exactly as written — never convert. "
    "Never claim zero allergen risk or 100% safety; follow the source wording. "
    'If the retrieved context is insufficient, say exactly: "There is not enough information available."'
)


def retrieve(query: str, *, k: int = DEFAULT_K, min_score: float = MIN_SCORE) -> list[dict]:
    """Embed the query, search Qdrant for top-k neighbors, and return surviving payloads.

    Hits below ``min_score`` are dropped. Each returned dict is a plain payload copy
    (source_document, section, text, etc.) plus a ``_score`` field — never raw SDK objects.
    """
    query_vector = embed(query)
    search_results = qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=k,
    ).points

    surviving: list[dict] = []
    for hit in search_results:
        if hit.score >= min_score and hit.payload:
            payload = dict(hit.payload)
            payload["_score"] = hit.score
            surviving.append(payload)

    if os.getenv("RAG_DEBUG", "").lower() in {"1", "true", "yes"}:
        for chunk in surviving:
            logger.debug(
                "rag retrieve hit: source=%s section=%s score=%.3f",
                chunk.get("source_document"),
                chunk.get("section"),
                chunk.get("_score", 0.0),
            )

    return surviving


def query(question: str) -> str:
    """Public RAG entry point: retrieve → prompt assembly → generation → answer string.

    External consumers (API, UI, scripts) should call only this function — not ``retrieve()``
    or ``embed()`` directly.

    Uses the dedicated generation model (``GENERATION_MODEL_ID`` via 4Geeks gateway), never the
    embedding model. When ``retrieve()`` finds no chunks above ``min_score``, returns an honest
    fallback without calling the LLM so company facts are never invented.
    """
    retrieved_chunks = retrieve(question, k=DEFAULT_K, min_score=MIN_SCORE)

    if not retrieved_chunks:
        return "There is not enough information available to answer this question."

    context = "\n\n".join(
        [
            f"--- {chunk.get('source_document', 'unknown')} / {chunk.get('section', '')} ---\n{chunk.get('text', '')}"
            for chunk in retrieved_chunks
        ]
    )

    user_prompt = f"Context:\n{context}\n\nQuestion: {question}"

    response = generation_client.chat.completions.create(
        model=GENERATION_MODEL_ID,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.0,
    )
    return response.choices[0].message.content or "There is not enough information available."
