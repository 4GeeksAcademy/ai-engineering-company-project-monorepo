import os
from qdrant_client import QdrantClient
from openai import OpenAI
from data.process.rag import embed

# Initialize Qdrant client
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

# Match your collection name and field names from CONTEXT-company.md
COLLECTION_NAME = "company_knowledge_base"
DEFAULT_MIN_SCORE = 0.70

# Generation LLM Client (using student key/proxy env vars)
llm_client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
)
GENERATION_MODEL_ID = "gpt-4o-mini"  # Must be a chat/generation model ID


def retrieve(
    query: str, *, k: int = 5, min_score: float = DEFAULT_MIN_SCORE
) -> list[dict]:
    """
    Embeds the user query, searches Qdrant for top-k vectors,
    filters out hits below min_score, and returns surviving payloads.
    """
    # 1. Embed query using dedicated embedding function from Phase 1
    query_vector = embed(query)

    # 2. Search Qdrant collection
    search_results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        limit=k,
    )

    # 3. Filter hits by min_score and extract payloads
    surviving_payloads = []
    for hit in search_results:
        if hit.score >= min_score:
            payload = hit.payload or {}
            payload["_score"] = hit.score
            surviving_payloads.append(payload)

    return surviving_payloads


def query(question: str) -> str:
    """
    Main pipeline entry point:
    Orchestrates retrieve() -> prompt assembly -> generation LLM call -> returns answer string.
    """
    # 1. Retrieve top context chunks
    chunks = retrieve(question, k=5, min_score=DEFAULT_MIN_SCORE)

    # 2. Assemble context text
    if not chunks:
        context_str = (
            "No relevant documents found in the internal knowledge base."
        )
    else:
        context_str = "\n\n---\n\n".join(
            [chunk.get("text", "") for chunk in chunks]
        )

    # 3. Construct system and user prompts (Salesperson Perspective)
    system_prompt = (
        "You are an expert sales assistant helping the commercial team answer prospect and client questions. "
        "Answer the question accurately using ONLY the provided internal document context. "
        "Adopt a professional, helpful salesperson's perspective with the voice and priorities of the business. "
        "If the context does not contain enough information to answer, state clearly that you do not have that information."
    )

    user_prompt = f"Context:\n{context_str}\n\nQuestion: {question}"

    # 4. Call Generation LLM
    response = llm_client.chat.completions.create(
        model=GENERATION_MODEL_ID,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content