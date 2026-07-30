import os

from qdrant_client import QdrantClient

from data.process.rag import embed
from shared.llm_config import GENERATION_MODEL_ID, generation_client

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

COLLECTION_NAME = "company_knowledge_base"
DEFAULT_MIN_SCORE = 0.70


def retrieve(
    query: str, *, k: int = 5, min_score: float = DEFAULT_MIN_SCORE
) -> list[dict]:
    query_vector = embed(query)

    search_results = qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=k,
    ).points

    surviving_payloads = []
    for hit in search_results:
        if hit.score >= min_score:
            payload = hit.payload or {}
            payload["_score"] = hit.score
            surviving_payloads.append(payload)

    return surviving_payloads


def query(question: str) -> str:
    chunks = retrieve(question, k=5, min_score=DEFAULT_MIN_SCORE)

    if not chunks:
        context_str = "No relevant documents found in the internal knowledge base."
    else:
        context_str = "\n\n---\n\n".join([chunk.get("text", "") for chunk in chunks])

    system_prompt = (
        "You are an expert sales assistant helping the commercial team answer prospect and client questions. "
        "Answer the question accurately using ONLY the provided internal document context. "
        "Adopt a professional, helpful salesperson's perspective with the voice and priorities of the business. "
        "If the context does not contain enough information to answer, state clearly that you do not have that information."
    )

    user_prompt = f"Context:\n{context_str}\n\nQuestion: {question}"

    response = generation_client.chat.completions.create(
        model=GENERATION_MODEL_ID,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content
