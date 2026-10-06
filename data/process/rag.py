"""Index Brasaland knowledge documents.

This is the single indexing path for milestone 7. Source files live in
``docs/company-knowledge-base/``. The default store is an in-process index
with deterministic local embeddings so tests and CI do not need API keys.

Optional live backends (env):

- ``BRASALAND_RAG_EMBEDDINGS=openai`` plus ``OPENAI_API_KEY`` — OpenAI
  embeddings (``text-embedding-3-small``).
- ``BRASALAND_RAG_BACKEND=qdrant`` plus a reachable Qdrant — ``setup()``
  upserts collection ``brasaland_kb``. Requires the ``qdrant-client``
  package, which is imported only on that path.

``scripts/rag.py`` is a deprecated delegate of this stack. It used to
search a different collection name (``company_knowledge_base``).
"""
from __future__ import annotations

import hashlib
import logging
import math
import os
import re
import uuid
from pathlib import Path

from services.safe_errors import ExternalServiceError, call_external

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger("brasaland.embeddings")

COLLECTION_NAME = "brasaland_kb"
EMBEDDING_MODEL = "text-embedding-3-small"
LOCAL_DIM = 384
_NAMESPACE = uuid.UUID("6f0b9a3e-4c21-5e1a-9b7c-0a1b2c3d4e5f")

_TOKEN = re.compile(r"[a-z0-9]+")
_STOP = frozenset(
    """
    a an the of to and or in on for is are was were be been being by at from
    with that this these those what which who whom how when where does do did
    can could should would i me my we our you your it its if as than then
    there their they them about into over under per not no yes any all each
    other another brasaland
    """.split()
)

_index: list[dict] | None = None
_index_key: str | None = None
_openai_client = None
_qdrant_client = None
_qdrant_key: tuple[str, str] | None = None


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def knowledge_docs_dir() -> Path:
    override = os.getenv("BRASALAND_KNOWLEDGE_DIR")
    if override:
        return Path(override)
    return repo_root() / "docs" / "company-knowledge-base"


def rag_backend() -> str:
    return os.getenv("BRASALAND_RAG_BACKEND", "local").strip().lower() or "local"


def embeddings_backend() -> str:
    return os.getenv("BRASALAND_RAG_EMBEDDINGS", "local").strip().lower() or "local"


def tokens(text: str) -> list[str]:
    cleaned = text.lower().replace("-", " ").replace("/", " ")
    return _TOKEN.findall(cleaned)


def content_tokens(text: str) -> list[str]:
    return [token for token in tokens(text) if token not in _STOP and len(token) > 1]


def embed_local(text: str) -> list[float]:
    """Deterministic hashed bag-of-tokens embedding. Same text, same vector."""
    vector = [0.0] * LOCAL_DIM
    toks = tokens(text)
    if not toks:
        return vector
    features = list(toks)
    features.extend(f"{left}_{right}" for left, right in zip(toks, toks[1:]))
    for feature in features:
        digest = hashlib.sha256(feature.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % LOCAL_DIM
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def _openai():
    global _openai_client
    if _openai_client is not None:
        return _openai_client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ExternalServiceError("embeddings")
    try:
        from openai import OpenAI
    except ImportError as error:
        raise ExternalServiceError("embeddings") from error
    base_url = os.getenv("OPENAI_BASE_URL")
    try:
        _openai_client = (
            OpenAI(api_key=api_key, base_url=base_url, timeout=30.0)
            if base_url
            else OpenAI(api_key=api_key, timeout=30.0)
        )
    except Exception as error:
        logger.exception("openai client init failed")
        raise ExternalServiceError("embeddings") from error
    return _openai_client


def embed_openai(text: str) -> list[float]:
    def _run():
        response = _openai().embeddings.create(input=text, model=EMBEDDING_MODEL)
        return list(response.data[0].embedding)

    return call_external("embeddings", _run)


def embed(text: str) -> list[float]:
    """Embed for the active backend. Local unless ``BRASALAND_RAG_EMBEDDINGS=openai``."""
    if embeddings_backend() == "openai":
        return embed_openai(text)
    return embed_local(text)


def _title(content: str, path: Path) -> str:
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()
    return path.stem


def load_chunks(docs_dir: Path | None = None) -> list[dict]:
    """Paragraph chunks from the Brasaland knowledge markdown files."""
    directory = docs_dir or knowledge_docs_dir()
    if not directory.exists():
        return []
    chunks: list[dict] = []
    for path in sorted(directory.glob("*.md")):
        try:
            content = path.read_text(encoding="utf-8")
        except OSError:
            logger.warning("skipped unreadable knowledge document")
            continue
        title = _title(content, path)
        language = "en" if ".en." in path.name else "und"
        paragraphs = [part.strip() for part in re.split(r"\n\s*\n", content) if part.strip()]
        index = 0
        for paragraph in paragraphs:
            if paragraph.startswith("#") and len(paragraph) < 80:
                continue
            if len(paragraph) < 40:
                continue
            chunk_id = str(uuid.uuid5(_NAMESPACE, f"{path.name}:{index}"))
            chunks.append(
                {
                    "id": chunk_id,
                    "company": "brasaland",
                    "source_document": path.name,
                    "section": f"{title} · part {index + 1}",
                    "language": language,
                    "chunk_index": index,
                    "text": paragraph,
                }
            )
            index += 1
    return chunks


def match_blob(chunk: dict) -> str:
    stem = chunk["source_document"].replace(".en.md", "").replace("-", " ")
    return f"{chunk.get('section', '')}\n{stem}\n{chunk.get('text', '')}"


def reset_local_index() -> None:
    global _index, _index_key
    _index = None
    _index_key = None


def local_index(docs_dir: Path | None = None) -> list[dict]:
    """In-memory chunks with local embedding vectors. Built from markdown on first use."""
    global _index, _index_key
    directory = docs_dir or knowledge_docs_dir()
    key = str(directory.resolve()) if directory.exists() else str(directory)
    if _index is not None and _index_key == key:
        return _index
    built: list[dict] = []
    for chunk in load_chunks(directory):
        stored = dict(chunk)
        stored["vector"] = embed_local(match_blob(stored))
        built.append(stored)
    _index = built
    _index_key = key
    return _index


def qdrant_client():
    """Lazy Qdrant client. Imported only when the qdrant backend is used."""
    global _qdrant_client, _qdrant_key
    host = os.getenv("QDRANT_HOST", "localhost")
    port = os.getenv("QDRANT_PORT", "6333")
    key = (host, port)
    if _qdrant_client is not None and _qdrant_key == key:
        return _qdrant_client
    try:
        from qdrant_client import QdrantClient
    except ImportError as error:
        raise ExternalServiceError("vector store") from error
    try:
        _qdrant_client = QdrantClient(host=host, port=int(port), timeout=10)
    except Exception as error:
        logger.exception("qdrant client init failed")
        raise ExternalServiceError("vector store") from error
    _qdrant_key = key
    return _qdrant_client


def setup(docs_dir: str | None = None) -> int:
    """Build the active index. Local mode does not call the network."""
    directory = Path(docs_dir) if docs_dir else knowledge_docs_dir()
    if rag_backend() == "qdrant":
        return _setup_qdrant(directory)
    reset_local_index()
    chunks = local_index(directory)
    print(f"Local knowledge index ready: {len(chunks)} chunks from '{directory}'.")
    return len(chunks)


def _setup_qdrant(directory: Path) -> int:
    def _ensure(store, size: int) -> None:
        from qdrant_client.models import Distance, VectorParams

        if store.collection_exists(collection_name=COLLECTION_NAME):
            store.delete_collection(collection_name=COLLECTION_NAME)
        store.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=size, distance=Distance.COSINE),
        )

    store = qdrant_client()
    sample = embed("brasaland knowledge")
    call_external("vector store", lambda: _ensure(store, len(sample)))

    from qdrant_client.models import PointStruct

    points = []
    for chunk in load_chunks(directory):
        vector = embed(match_blob(chunk))
        payload = {
            "company": chunk["company"],
            "source_document": chunk["source_document"],
            "section": chunk["section"],
            "language": chunk["language"],
            "chunk_index": chunk["chunk_index"],
            "text": chunk["text"],
        }
        points.append(PointStruct(id=chunk["id"], vector=vector, payload=payload))

    if points:
        call_external(
            "vector store",
            lambda: store.upsert(collection_name=COLLECTION_NAME, points=points),
        )
    print(f"Indexed {len(points)} chunks into '{COLLECTION_NAME}'.")
    return len(points)


if __name__ == "__main__":
    try:
        setup()
    except ExternalServiceError:
        raise SystemExit(1)
