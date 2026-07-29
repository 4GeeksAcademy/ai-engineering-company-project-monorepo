import os
import uuid
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Load environment variables from .env file
load_dotenv()

COLLECTION_NAME = "brasaland_kb"
EMBEDDING_MODEL = "text-embedding-3-small"

# Ensure API key and Base URL are set
api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL")

client = OpenAI(api_key=api_key, base_url=base_url) if base_url else OpenAI(api_key=api_key)
qdrant_client = QdrantClient(host=os.getenv("QDRANT_HOST", "localhost"), port=int(os.getenv("QDRANT_PORT", 6333)))

def embed(text: str) -> list[float]:
    response = client.embeddings.create(input=text, model=EMBEDDING_MODEL)
    return response.data[0].embedding

def setup(docs_dir: str = "docs/company-knowledge-base/"):
    
    # 1. NEW LOGIC: Check and Create instead of Recreate
    if qdrant_client.collection_exists(collection_name=COLLECTION_NAME):
        qdrant_client.delete_collection(collection_name=COLLECTION_NAME)
        
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
    )
    
    points = []
    # Search for markdown files in docs
    doc_paths = list(Path(docs_dir).rglob("*.md")) if Path(docs_dir).exists() else list(Path(".").rglob("*.en.md"))
    
    for filepath in doc_paths:
        content = filepath.read_text(encoding="utf-8")
        chunks = [c.strip() for c in content.split("\n\n") if len(c.strip()) > 50]
        doc_name = filepath.name.replace("brasaland-", "").replace(".en.md", "")
        
        for idx, chunk in enumerate(chunks):
            vector = embed(chunk)
            payload = {
                "company": "brasaland",
                "source_document": doc_name,
                "section": f"Chunk {idx+1}",
                "language": "en",
                "chunk_index": idx,
                "text": chunk
            }
            points.append(PointStruct(id=str(uuid.uuid4()), vector=vector, payload=payload))
            
    if points:
        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"✅ Successfully indexed {len(points)} chunks into '{COLLECTION_NAME}'.")
    else:
        print(f"❌ No documents found in '{docs_dir}'. Please verify the document path.")

if __name__ == "__main__":
    setup()
