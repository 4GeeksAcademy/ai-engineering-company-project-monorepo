"""Corpus preparation, embeddings, and idempotent Qdrant indexing for TrackFlow."""

from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
CORPUS_DIR = ROOT / "docs" / "company-knowledge-base"
COLLECTION_NAME = "trackflow_knowledge"
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"

# Load repo configuration regardless of the process working directory.
# Explicit environment variables take precedence by default.
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "services" / "api" / ".env")


@dataclass(frozen=True)
class Chunk:
    source_document: str
    section: str
    language: str
    chunk_index: int
    text: str

    def payload(self) -> dict[str, Any]:
        return {
            "company": "trackflow",
            "source_document": self.source_document,
            "section": self.section,
            "language": self.language,
            "chunk_index": self.chunk_index,
            "text": self.text,
        }


def _settings() -> tuple[str, str, str, int]:
    base_url = os.getenv("EMBEDDING_API_BASE_URL", os.getenv("LLM_API_BASE_URL", ""))
    api_key = os.getenv("EMBEDDING_API_KEY", os.getenv("LLM_API_KEY", ""))
    model = os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL)
    dimension = int(os.getenv("EMBEDDING_DIMENSION", "1536"))
    return base_url.rstrip("/"), api_key, model, dimension


def _source_name(path: Path) -> str:
    name = path.name.removesuffix(".md").removesuffix(".es")
    return name.removeprefix("trackflow-")


def chunk_document(path: Path) -> list[Chunk]:
    """Split a source into section-aware semantic chunks.

    Consecutive paragraphs are grouped under their nearest heading, every
    chunk is prefixed with the document title and section so retrieval can
    disambiguate similar topics across documents, and header-only fragments
    are never indexed.
    """
    text = path.read_text(encoding="utf-8").strip()
    lines = text.splitlines()
    title = next((line.lstrip("# ").strip() for line in lines if line.startswith("#")), path.stem)
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]

    sections: list[tuple[str, list[str]]] = []
    current_section = title
    buffer: list[str] = []
    for paragraph in paragraphs:
        if paragraph.startswith("#"):
            if buffer:
                sections.append((current_section, buffer))
                buffer = []
            current_section = paragraph.lstrip("# ").strip()
        else:
            buffer.append(paragraph)
    if buffer:
        sections.append((current_section, buffer))

    chunks: list[Chunk] = []
    index = 0
    for section, parts in sections:
        prefix = title if section == title else f"{title} — {section}"
        groups: list[str] = []
        bullets: list[str] = []
        for part in parts:
            if part.startswith("- "):
                bullets.append(part.removeprefix("- "))
                continue
            if bullets:
                groups.append("\n".join(bullets))
                bullets = []
            groups.append(part)
        if bullets:
            groups.append("\n".join(bullets))
        for group in groups:
            chunks.append(
                Chunk(
                    source_document=_source_name(path),
                    section=section,
                    language="es",
                    chunk_index=index,
                    text=f"{prefix}: {group}",
                )
            )
            index += 1
    return chunks


def load_chunks(corpus_dir: Path = CORPUS_DIR) -> list[Chunk]:
    """Load all four TrackFlow source documents and their semantic chunks."""
    paths = sorted(corpus_dir.glob("trackflow-*.es.md"))
    if len(paths) != 4:
        raise ValueError(f"Expected 4 TrackFlow source documents, found {len(paths)}")
    chunks = [chunk for path in paths for chunk in chunk_document(path)]
    counts = {path: sum(1 for chunk in chunks if chunk.source_document == _source_name(path)) for path in paths}
    if any(count < 3 for count in counts.values()):
        raise ValueError(f"Every source must produce at least 3 chunks: {counts}")
    return chunks


def embed(text: str) -> list[float]:
    """Create an embedding with the dedicated embedding model, never the generator."""
    base_url, api_key, model, _ = _settings()
    if not base_url:
        raise RuntimeError("EMBEDDING_API_BASE_URL or LLM_API_BASE_URL is required")
    response = httpx.post(
        f"{base_url}/embeddings",
        headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
        json={"model": model, "input": text},
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()["data"][0]["embedding"]
    return [float(value) for value in data]


def _point_id(chunk: Chunk) -> str:
    return hashlib.sha256(
        f"{chunk.source_document}:{chunk.chunk_index}:{chunk.text}".encode("utf-8")
    ).hexdigest()[:32]


def _qdrant_client() -> Any:
    from qdrant_client import QdrantClient

    url = os.getenv("QDRANT_URL", "http://localhost:6333")
    api_key = os.getenv("QDRANT_API_KEY") or None
    return QdrantClient(url=url, api_key=api_key)


def setup(corpus_dir: Path = CORPUS_DIR) -> dict[str, int | str]:
    """Recreate and populate Qdrant, making repeated setup calls idempotent."""
    from qdrant_client.models import Distance, PointStruct, VectorParams

    _, _, _, dimension = _settings()
    chunks = load_chunks(corpus_dir)
    client = _qdrant_client()
    client.recreate_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=dimension, distance=Distance.COSINE),
    )
    points = [
        PointStruct(id=_point_id(chunk), vector=embed(chunk.text), payload=chunk.payload())
        for chunk in chunks
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)
    return {"collection": COLLECTION_NAME, "chunks": len(points)}
