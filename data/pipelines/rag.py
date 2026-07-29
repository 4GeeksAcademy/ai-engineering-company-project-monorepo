import os
from openai import OpenAI
from qdrant_client import QdrantClient
from data.process.rag import embed, COLLECTION_NAME

GENERATION_MODEL = "gpt-4o-mini"
MIN_SCORE = 0.40  # Threshold to prevent hallucination

client = OpenAI()
qdrant_client = QdrantClient(host=os.getenv("QDRANT_HOST", "localhost"), port=6333)

def retrieve(query_str: str, k: int = 3, min_score: float = MIN_SCORE) -> list[dict]:
    query_vector = embed(query_str)
    search_results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        limit=k
    )
    return [hit.payload for hit in search_results if hit.score >= min_score]

def query(question: str) -> str:
    retrieved_chunks = retrieve(question)
    
    if not retrieved_chunks:
        return "There is not enough information available to answer this question."
    
    context = "\n\n".join([f"--- {chunk['source_document']} ---\n{chunk['text']}" for chunk in retrieved_chunks])
    
    prompt = f"""
    You are an expert sales and operational assistant for Brasaland. 

    STRICT BUSINESS RULES:
    1. Base your answer ONLY on the provided Context.
    2. NEVER say 'zero risk' or '100% safe' for allergen questions. Follow the literal wording in the context.
    3. Keep all currency values (USD $, COP $) EXACTLY as they appear in the source text. DO NOT convert currencies.
    4. Do NOT invent or estimate any numerical values, weights, percentages, or quantities not present in the context.
    5. If the context does not contain enough information, say: "There is not enough information available."

    Context:
    {context}

    Question: {question}
    """
    
    response = client.chat.completions.create(
        model=GENERATION_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0
    )
    return response.choices[0].message.content
