import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from shared.llm_config import EMBEDDING_DIMENSION, EMBEDDING_MODEL_ID, embedding_client

load_dotenv()

COLLECTION_NAME = "brasaland_kb"

qdrant_client = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", 6333)),
)


def embed(text: str) -> list[float]:
    response = embedding_client.embeddings.create(
        input=text,
        model=EMBEDDING_MODEL_ID,
    )
    return response.data[0].embedding


def setup(docs_dir: str = "docs/company-knowledge-base/"):
    if qdrant_client.collection_exists(collection_name=COLLECTION_NAME):
        qdrant_client.delete_collection(collection_name=COLLECTION_NAME)

    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=EMBEDDING_DIMENSION, distance=Distance.COSINE),
    )

    points = []
    doc_paths = (
        list(Path(docs_dir).rglob("*.md"))
        if Path(docs_dir).exists()
        else list(Path(".").rglob("*.en.md"))
    )

    for filepath in doc_paths:
        content = filepath.read_text(encoding="utf-8")
        chunks = [c.strip() for c in content.split("\n\n") if len(c.strip()) > 50]
        doc_name = filepath.name.replace("brasaland-", "").replace(".en.md", "")

        for idx, chunk in enumerate(chunks):
            vector = embed(chunk)
            payload = {
                "company": "brasaland",
                "source_document": doc_name,
                "section": f"Chunk {idx + 1}",
                "language": "en",
                "chunk_index": idx,
                "text": chunk,
            }
            points.append(PointStruct(id=str(uuid.uuid4()), vector=vector, payload=payload))

    if points:
        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"✅ Successfully indexed {len(points)} chunks into '{COLLECTION_NAME}'.")
    else:
        print(f"❌ No documents found in '{docs_dir}'. Please verify the document path.")


if __name__ == "__main__":
    setup()
