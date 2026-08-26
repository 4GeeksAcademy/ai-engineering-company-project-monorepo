import os
import re
import uuid
from pathlib import Path

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from shared.llm_config import EMBEDDING_DIMENSION, EMBEDDING_MODEL_ID, embedding_client

load_dotenv()

COLLECTION_NAME = "brasaland_kb"  # from CONTEXT-company.md
COMPANY_SLUG = "brasaland"  # from CONTEXT-company.md
DEFAULT_LANGUAGE = "en"
REQUIRED_PAYLOAD_FIELDS = (
    "source_document",
    "section",
    "company",
    "language",
    "chunk_index",
    "text",
)
# Namespace for deterministic Qdrant point IDs (secondary idempotency guard).
_POINT_ID_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_DNS, COLLECTION_NAME)
DEFAULT_DOCS_DIR = "docs/company-knowledge-base/"
# Corpus filenames from CONTEXT-company.md (indexed in this order).
CORPUS_FILENAMES = (
    "brasaland-supplier-ordering.en.md",
    "brasaland-waste-protocol.en.md",
    "brasaland-loyalty-program.en.md",
    "brasaland-menu-allergens.en.md",
)
SUPPORTED_EXTENSIONS = {".md", ".txt"}
MIN_CHUNK_CHARS = 40
MAX_CHUNK_CHARS = 2000

qdrant_client = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", 6333)),
)

_HEADING_RE = re.compile(r"^#{1,6}\s+(.+)$")
_NUMBERED_ITEM_RE = re.compile(r"^\d+\.\s+")
_BULLET_ITEM_RE = re.compile(r"^-\s+")


def embed(text: str) -> list[float]:
    """Return a dense vector for a single text using the dedicated 4Geeks embedding model.

    This function is the single embedding entry point for the RAG pipeline:
    - Index time: called once per semantic chunk inside ``setup()``.
    - Query time: called for the user question inside ``retrieve()`` (via
      ``data.pipelines.rag``).

    Uses ``EMBEDDING_MODEL_ID`` and ``embedding_client`` only — never the
    generation/chat model.
    """
    normalized = text.strip()
    if not normalized:
        raise ValueError("embed() requires non-empty text")

    response = embedding_client.embeddings.create(
        input=normalized,
        model=EMBEDDING_MODEL_ID,
    )
    vector = response.data[0].embedding

    if len(vector) != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Expected embedding dimension {EMBEDDING_DIMENSION}, got {len(vector)}"
        )

    return vector


def parse_document(filepath: Path) -> str:
    """Read a source document (Markdown or plain text)."""
    if filepath.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported document format: {filepath.suffix}")
    return filepath.read_text(encoding="utf-8")


def discover_source_documents(docs_dir: Path) -> list[Path]:
    """Return corpus files listed in CONTEXT-company.md."""
    documents: list[Path] = []
    for filename in CORPUS_FILENAMES:
        path = docs_dir / filename
        if path.exists():
            documents.append(path)
    return documents


def _join_wrapped_lines(lines: list[str]) -> str:
    return " ".join(line.strip() for line in lines if line.strip())


def _split_at_sentence_boundaries(section: str, text: str) -> list[tuple[str, str]]:
    """Split oversized prose on sentence boundaries — never mid-sentence."""
    if len(text) <= MAX_CHUNK_CHARS:
        return [(section, text)]

    sentences = re.split(r"(?<=[.!?])\s+", text)
    parts: list[tuple[str, str]] = []
    buffer = ""
    part_idx = 1

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        candidate = f"{buffer} {sentence}".strip() if buffer else sentence
        if len(candidate) <= MAX_CHUNK_CHARS:
            buffer = candidate
            continue
        if buffer:
            label = f"{section} (part {part_idx})" if part_idx > 1 else section
            parts.append((label, buffer))
            part_idx += 1
        buffer = sentence

    if buffer:
        label = f"{section} (part {part_idx})" if part_idx > 1 else section
        parts.append((label, buffer))
    return parts


def _emit_chunk(
    chunks: list[tuple[str, str]],
    section: str,
    text: str,
    *,
    allow_short: bool = False,
) -> None:
    cleaned = text.strip()
    if not cleaned:
        return
    if not allow_short and len(cleaned) < MIN_CHUNK_CHARS:
        return
    for section_label, chunk_text in _split_at_sentence_boundaries(section, cleaned):
        chunks.append((section_label, chunk_text))


def _is_continuation_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if _HEADING_RE.match(stripped):
        return False
    if _NUMBERED_ITEM_RE.match(stripped) or _BULLET_ITEM_RE.match(stripped):
        return False
    return line.startswith((" ", "\t")) or not stripped.endswith((":", "."))


def _collect_list_item(lines: list[str], start_index: int) -> tuple[str, int]:
    item_lines = [lines[start_index].strip()]
    index = start_index + 1
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            break
        if _NUMBERED_ITEM_RE.match(line.strip()) or _BULLET_ITEM_RE.match(line.strip()):
            break
        if _is_continuation_line(line):
            item_lines.append(line.strip())
            index += 1
            continue
        break
    return _join_wrapped_lines(item_lines), index


def _chunk_section_body(section: str, body_lines: list[str]) -> list[tuple[str, str]]:
    chunks: list[tuple[str, str]] = []
    pending_intro = ""
    index = 0

    while index < len(body_lines):
        line = body_lines[index]
        stripped = line.strip()

        if not stripped:
            index += 1
            continue

        if _NUMBERED_ITEM_RE.match(stripped) or _BULLET_ITEM_RE.match(stripped):
            if pending_intro:
                item_text, index = _collect_list_item(body_lines, index)
                combined = f"{pending_intro} {item_text}".strip()
                _emit_chunk(chunks, section, combined, allow_short=True)
                pending_intro = ""
                continue

            item_text, index = _collect_list_item(body_lines, index)
            _emit_chunk(chunks, section, item_text, allow_short=True)
            continue

        paragraph_lines = [line]
        index += 1
        while index < len(body_lines):
            next_line = body_lines[index]
            if not next_line.strip():
                break
            if _NUMBERED_ITEM_RE.match(next_line.strip()) or _BULLET_ITEM_RE.match(next_line.strip()):
                break
            paragraph_lines.append(next_line)
            index += 1

        paragraph = _join_wrapped_lines(paragraph_lines)
        if paragraph.endswith(":") and len(paragraph) < MAX_CHUNK_CHARS:
            pending_intro = paragraph
            continue

        if pending_intro:
            paragraph = f"{pending_intro} {paragraph}".strip()
            pending_intro = ""

        _emit_chunk(chunks, section, paragraph)

    if pending_intro:
        _emit_chunk(chunks, section, pending_intro)

    return chunks


def chunk_markdown(content: str) -> list[tuple[str, str]]:
    """Split Markdown into self-contained semantic chunks (headings, lists, paragraphs)."""
    return chunk_document(content, source_format="markdown")


def chunk_plain_text(content: str) -> list[tuple[str, str]]:
    """Split plain text on blank-line paragraphs and sentence boundaries."""
    chunks: list[tuple[str, str]] = []
    blocks = re.split(r"\n\s*\n", content.strip())
    for block_index, block in enumerate(blocks, start=1):
        section = f"Section {block_index}"
        body_lines = block.splitlines()
        if any(_NUMBERED_ITEM_RE.match(line.strip()) or _BULLET_ITEM_RE.match(line.strip()) for line in body_lines):
            chunks.extend(_chunk_section_body(section, body_lines))
        else:
            _emit_chunk(chunks, section, _join_wrapped_lines(body_lines))
    return chunks


def chunk_document(content: str, *, source_format: str = "markdown") -> list[tuple[str, str]]:
    if source_format == "plain":
        return chunk_plain_text(content)

    chunks: list[tuple[str, str]] = []
    current_section = "Introduction"
    section_lines: list[str] = []

    for line in content.splitlines():
        heading_match = _HEADING_RE.match(line.strip())
        if heading_match:
            if section_lines:
                chunks.extend(_chunk_section_body(current_section, section_lines))
            current_section = heading_match.group(1).strip()
            section_lines = []
        else:
            section_lines.append(line)

    if section_lines:
        chunks.extend(_chunk_section_body(current_section, section_lines))

    return chunks


def _document_label(filepath: Path) -> str:
    name = filepath.name
    for suffix in (".en.md", ".md", ".txt"):
        if name.endswith(suffix):
            name = name[: -len(suffix)]
            break
    return name.replace("brasaland-", "")


def _source_format(filepath: Path) -> str:
    return "plain" if filepath.suffix.lower() == ".txt" else "markdown"


def build_chunk_payload(
    *,
    source_document: str,
    section: str,
    chunk_index: int,
    text: str,
    language: str = DEFAULT_LANGUAGE,
    company: str = COMPANY_SLUG,
) -> dict:
    """Build the Qdrant payload required by CONTEXT-company.md."""
    payload = {
        "source_document": source_document,
        "section": section,
        "company": company,
        "language": language,
        "chunk_index": chunk_index,
        "text": text,
    }
    missing = [field for field in REQUIRED_PAYLOAD_FIELDS if field not in payload]
    if missing:
        raise ValueError(f"Missing required payload fields: {missing}")
    return payload


def deterministic_point_id(source_document: str, chunk_index: int, section: str) -> str:
    """Stable Qdrant point ID for a chunk — upserts replace instead of duplicating."""
    identity = f"{COMPANY_SLUG}:{source_document}:{chunk_index}:{section}"
    return str(uuid.uuid5(_POINT_ID_NAMESPACE, identity))


def recreate_collection() -> None:
    """Clear-and-reload: atomically replace the collection before each index run."""
    qdrant_client.recreate_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=EMBEDDING_DIMENSION, distance=Distance.COSINE),
    )


def setup(docs_dir: str = DEFAULT_DOCS_DIR) -> int:
    """Index the company knowledge base into Qdrant.

    Idempotency strategy (documented in ``docs/rag/rag-design.md``):

    1. **Clear-and-reload (primary):** delete and recreate ``brasaland_kb`` on every run
       so removed or renamed source files do not leave stale vectors behind.
    2. **Deterministic point IDs (secondary):** each chunk gets a stable UUID derived from
       ``company + source_document + chunk_index + section`` so ``upsert`` replaces existing
       points instead of creating duplicates if the collection is not cleared.
    """
    docs_path = Path(docs_dir)
    if not docs_path.exists():
        raise FileNotFoundError(f"Knowledge base folder not found: {docs_dir}")

    doc_paths = discover_source_documents(docs_path)
    if not doc_paths:
        print(f"❌ No .md or .txt documents found in '{docs_dir}'.")
        return 0

    recreate_collection()

    points: list[PointStruct] = []
    total_chunks = 0

    for filepath in doc_paths:
        content = parse_document(filepath)
        doc_name = _document_label(filepath)
        doc_chunks = chunk_document(content, source_format=_source_format(filepath))

        for idx, (section, chunk_text) in enumerate(doc_chunks):
            vector = embed(chunk_text)
            payload = build_chunk_payload(
                source_document=doc_name,
                section=section,
                chunk_index=idx,
                text=chunk_text,
            )
            points.append(
                PointStruct(
                    id=deterministic_point_id(doc_name, idx, section),
                    vector=vector,
                    payload=payload,
                )
            )

        total_chunks += len(doc_chunks)
        print(f"  • {filepath.name}: {len(doc_chunks)} chunks")

    qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
    print(
        f"✅ Indexed {total_chunks} semantic chunks from {len(doc_paths)} documents into '{COLLECTION_NAME}'."
    )
    return total_chunks


if __name__ == "__main__":
    setup()
