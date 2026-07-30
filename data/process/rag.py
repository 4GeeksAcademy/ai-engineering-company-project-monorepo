import os
import re
import uuid
from pathlib import Path

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from shared.llm_config import EMBEDDING_DIMENSION, EMBEDDING_MODEL_ID, embedding_client

load_dotenv()

COLLECTION_NAME = "brasaland_kb"
COMPANY_SLUG = "brasaland"
DEFAULT_DOCS_DIR = "docs/company-knowledge-base/"
MIN_CHUNK_CHARS = 50
MAX_CHUNK_CHARS = 2000

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


def _split_oversized_block(section: str, text: str) -> list[tuple[str, str]]:
    if len(text) <= MAX_CHUNK_CHARS:
        return [(section, text)]

    parts: list[tuple[str, str]] = []
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    buffer = ""
    part_idx = 1
    for paragraph in paragraphs:
        candidate = f"{buffer}\n\n{paragraph}".strip() if buffer else paragraph
        if len(candidate) <= MAX_CHUNK_CHARS:
            buffer = candidate
            continue
        if buffer:
            parts.append((f"{section} (part {part_idx})", buffer))
            part_idx += 1
        buffer = paragraph
    if buffer:
        parts.append((f"{section} (part {part_idx})", buffer) if part_idx > 1 else (section, buffer))
    return parts


def chunk_markdown(content: str) -> list[tuple[str, str]]:
    """Split markdown into semantic sections, then paragraph blocks."""
    chunks: list[tuple[str, str]] = []
    current_section = "Introduction"
    section_lines: list[str] = []

    for line in content.splitlines():
        heading_match = re.match(r"^#{1,6}\s+(.+)$", line.strip())
        if heading_match:
            if section_lines:
                body = "\n".join(section_lines).strip()
                for paragraph in [p.strip() for p in body.split("\n\n") if len(p.strip()) >= MIN_CHUNK_CHARS]:
                    chunks.extend(_split_oversized_block(current_section, paragraph))
            current_section = heading_match.group(1).strip()
            section_lines = []
        else:
            section_lines.append(line)

    if section_lines:
        body = "\n".join(section_lines).strip()
        for paragraph in [p.strip() for p in body.split("\n\n") if len(p.strip()) >= MIN_CHUNK_CHARS]:
            chunks.extend(_split_oversized_block(current_section, paragraph))

    return chunks


def _document_label(filepath: Path) -> str:
    return filepath.name.replace("brasaland-", "").replace(".en.md", "")


def setup(docs_dir: str = DEFAULT_DOCS_DIR) -> int:
    docs_path = Path(docs_dir)
    if not docs_path.exists():
        raise FileNotFoundError(f"Knowledge base folder not found: {docs_dir}")

    if qdrant_client.collection_exists(collection_name=COLLECTION_NAME):
        qdrant_client.delete_collection(collection_name=COLLECTION_NAME)

    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=EMBEDDING_DIMENSION, distance=Distance.COSINE),
    )

    points: list[PointStruct] = []
    doc_paths = sorted(docs_path.glob("*.md"))

    for filepath in doc_paths:
        content = filepath.read_text(encoding="utf-8")
        doc_name = _document_label(filepath)
        for idx, (section, chunk_text) in enumerate(chunk_markdown(content)):
            vector = embed(chunk_text)
            payload = {
                "company": COMPANY_SLUG,
                "source_document": doc_name,
                "section": section,
                "language": "en",
                "chunk_index": idx,
                "text": chunk_text,
            }
            points.append(PointStruct(id=str(uuid.uuid4()), vector=vector, payload=payload))

    if not points:
        print(f"❌ No documents found in '{docs_dir}'. Add Brasaland source .md files.")
        return 0

    qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
    print(f"✅ Successfully indexed {len(points)} chunks from {len(doc_paths)} documents into '{COLLECTION_NAME}'.")
    return len(points)


if __name__ == "__main__":
    setup()
