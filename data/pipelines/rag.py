import os

from qdrant_client import QdrantClient

from data.process.rag import COLLECTION_NAME, embed
from shared.llm_config import GENERATION_MODEL_ID, generation_client

DEFAULT_K = 5
MIN_SCORE = 0.69  # Calibrated for pplx-embed-v1-0.6b (valid matches often score ~0.69–0.85)

qdrant_client = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", 6333)),
)

SYSTEM_PROMPT = (
    "You are an expert sales and operational assistant for Brasaland, a grilled-food restaurant chain "
    "in Colombia and Florida. Answer using ONLY the provided internal document context. "
    "Adopt a professional, helpful salesperson perspective. "
    "Never claim zero allergen risk or 100% safety. "
    "Keep currency values (USD $, COP $) exactly as written. "
    "Do not invent numbers, weights, or percentages. "
    'If the context is insufficient, say exactly: "There is not enough information available."'
)


def retrieve(query_str: str, k: int = DEFAULT_K, min_score: float = MIN_SCORE) -> list[dict]:
    query_vector = embed(query_str)
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
    return surviving


def query(question: str) -> str:
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
