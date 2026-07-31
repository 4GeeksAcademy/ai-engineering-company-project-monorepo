from unittest.mock import MagicMock, patch

import pytest

from data.pipelines.rag import DEFAULT_K, MIN_SCORE, query, retrieve
from data.process.rag import (
    COLLECTION_NAME,
    COMPANY_SLUG,
    REQUIRED_PAYLOAD_FIELDS,
    build_chunk_payload,
    chunk_document,
    chunk_markdown,
    chunk_plain_text,
    deterministic_point_id,
    discover_source_documents,
    embed,
    parse_document,
    setup,
)
from shared.llm_config import EMBEDDING_MODEL_ID, GENERATION_MODEL_ID


@patch("data.pipelines.rag.qdrant_client")
@patch("data.pipelines.rag.embed")
def test_retrieve_filters_by_min_score(mock_embed, mock_qdrant):
    mock_embed.return_value = [0.1] * 1024

    hit_high = MagicMock(score=0.85, payload={"text": "High score chunk", "source_document": "supplier-ordering"})
    hit_low = MagicMock(score=0.50, payload={"text": "Low score chunk", "source_document": "waste-protocol"})
    mock_qdrant.query_points.return_value = MagicMock(points=[hit_high, hit_low])

    results = retrieve("sample query", k=5, min_score=0.70)

    assert len(results) == 1
    assert isinstance(results[0], dict)
    assert results[0]["text"] == "High score chunk"
    assert results[0]["_score"] == 0.85
    mock_embed.assert_called_once_with("sample query")
    mock_qdrant.query_points.assert_called_once_with(
        collection_name=COLLECTION_NAME,
        query=mock_embed.return_value,
        limit=5,
    )


@patch("data.pipelines.rag.qdrant_client")
@patch("data.pipelines.rag.embed")
def test_retrieve_can_return_fewer_than_k_results(mock_embed, mock_qdrant):
    mock_embed.return_value = [0.1] * 1024

    hits = [
        MagicMock(score=0.90, payload={"text": "First chunk", "source_document": "supplier-ordering"}),
        MagicMock(score=0.55, payload={"text": "Below threshold", "source_document": "waste-protocol"}),
    ]
    mock_qdrant.query_points.return_value = MagicMock(points=hits)

    results = retrieve("protein stock", k=5, min_score=0.70)

    assert len(results) < 5
    assert len(results) == 1
    assert results[0]["text"] == "First chunk"


@patch("data.pipelines.rag.generation_client")
@patch("data.pipelines.rag.retrieve")
def test_query_returns_model_output_not_raw_chunks(mock_retrieve, mock_generation_client):
    raw_chunk_text = "Minimum stock rule: 3 days of main protein inventory."
    mock_retrieve.return_value = [
        {"text": raw_chunk_text, "source_document": "supplier-ordering", "section": "Minimum stock rule"}
    ]

    generated_answer = "Every Brasaland location must maintain at least three days of protein stock."
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content=generated_answer))
    ]
    mock_generation_client.chat.completions.create.return_value = mock_response

    answer = query("What is the minimum stock rule for proteins?")

    assert answer == generated_answer
    assert answer != raw_chunk_text
    mock_generation_client.chat.completions.create.assert_called_once()


@patch("data.pipelines.rag.generation_client")
@patch("data.pipelines.rag.retrieve")
def test_query_orchestrates_retrieval_and_generation(mock_retrieve, mock_generation_client):
    mock_retrieve.return_value = [
        {"text": "Minimum stock rule: 3 days of main protein inventory.", "source_document": "supplier-ordering", "section": "Minimum stock rule"}
    ]

    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content="Locations must keep at least 3 days of protein stock."))
    ]
    mock_generation_client.chat.completions.create.return_value = mock_response

    answer = query("What is the minimum stock rule for proteins?")

    assert answer == "Locations must keep at least 3 days of protein stock."
    mock_retrieve.assert_called_once_with("What is the minimum stock rule for proteins?", k=DEFAULT_K, min_score=MIN_SCORE)
    mock_generation_client.chat.completions.create.assert_called_once()
    call_kwargs = mock_generation_client.chat.completions.create.call_args.kwargs
    assert call_kwargs["model"] == GENERATION_MODEL_ID
    assert "Minimum stock rule" in call_kwargs["messages"][1]["content"]
    system_message = call_kwargs["messages"][0]["content"]
    assert "salesperson" in system_message.lower()
    assert "only the retrieved context" in system_message.lower()


@patch("data.pipelines.rag.generation_client")
@patch("data.pipelines.rag.retrieve")
def test_query_returns_fallback_when_no_chunks(mock_retrieve, mock_generation_client):
    mock_retrieve.return_value = []

    answer = query("Unknown topic?")

    assert answer == "There is not enough information available to answer this question."
    mock_generation_client.chat.completions.create.assert_not_called()


def test_chunk_markdown_splits_by_heading():
    content = "# Supplier Ordering\n\nFirst paragraph with enough characters to pass the minimum chunk size filter.\n\n## Emergency orders\n\nSecond paragraph also long enough to become its own semantic chunk in the index."
    chunks = chunk_markdown(content)

    assert len(chunks) >= 2
    assert any("Supplier Ordering" in section for section, _ in chunks)
    assert any("Emergency orders" in section for section, _ in chunks)


def test_chunk_markdown_keeps_bullet_items_intact():
    content = """# Menu Allergen Guide

Main dishes and their declared allergens:
- Grilled Sirloin (Lomo a la Brasa): gluten-free, dairy-free. Marinade contains soy.
- Brasaland BBQ Ribs: contains soy (sauce) and may contain trace peanuts on some production lines of the imported sauce.
"""
    chunks = chunk_markdown(content)
    texts = [text for _, text in chunks]

    assert any("Grilled Sirloin" in text and "Marinade contains soy" in text for text in texts)
    assert any("BBQ Ribs" in text and "trace peanuts" in text for text in texts)
    assert not any(text.endswith("on") for text in texts)


def test_chunk_markdown_keeps_numbered_steps_intact():
    content = """# Waste Control Protocol

Daily procedure:
1. At the close of each shift, the kitchen lead weighs and logs waste by category in the operations app.
2. Any waste over 2 kg of meat protein in a single shift requires a mandatory explanatory note.
"""
    chunks = chunk_markdown(content)
    texts = [text for _, text in chunks]

    assert any("kitchen lead weighs and logs waste" in text for text in texts)
    assert any("2 kg of meat protein" in text for text in texts)


def test_chunk_markdown_prefixes_list_intro():
    content = """# Supplier Ordering

Supplier categories and order frequency:
- Proteins (beef, chicken): weekly order, 48-hour delivery.
"""
    chunks = chunk_markdown(content)
    assert len(chunks) == 1
    assert "Supplier categories and order frequency" in chunks[0][1]
    assert "Proteins (beef, chicken)" in chunks[0][1]


def test_chunk_plain_text_splits_paragraphs():
    content = "First complete paragraph with enough characters to be indexed as its own semantic unit.\n\nSecond complete paragraph that should also remain intact as a separate chunk."
    chunks = chunk_plain_text(content)

    assert len(chunks) == 2
    assert "First complete paragraph" in chunks[0][1]
    assert "Second complete paragraph" in chunks[1][1]


def test_discover_source_documents_finds_corpus(tmp_path):
    for filename in (
        "brasaland-supplier-ordering.en.md",
        "brasaland-waste-protocol.en.md",
        "brasaland-loyalty-program.en.md",
        "brasaland-menu-allergens.en.md",
    ):
        (tmp_path / filename).write_text("# Doc", encoding="utf-8")
    (tmp_path / "ignore.csv").write_text("skip", encoding="utf-8")

    found = discover_source_documents(tmp_path)
    assert len(found) == 4
    assert {path.name for path in found} == {
        "brasaland-supplier-ordering.en.md",
        "brasaland-waste-protocol.en.md",
        "brasaland-loyalty-program.en.md",
        "brasaland-menu-allergens.en.md",
    }


def test_parse_document_reads_markdown_and_text(tmp_path):
    md_path = tmp_path / "sample.en.md"
    txt_path = tmp_path / "sample.txt"
    md_path.write_text("# Title", encoding="utf-8")
    txt_path.write_text("Plain body", encoding="utf-8")

    assert parse_document(md_path) == "# Title"
    assert parse_document(txt_path) == "Plain body"


def test_build_chunk_payload_matches_context_fields():
    payload = build_chunk_payload(
        source_document="supplier-ordering",
        section="Minimum stock rule",
        chunk_index=2,
        text="Minimum stock rule: no location should operate with less than 3 days of main protein inventory.",
    )

    assert set(payload.keys()) == set(REQUIRED_PAYLOAD_FIELDS)
    assert payload["company"] == COMPANY_SLUG
    assert payload["language"] == "en"
    assert payload["chunk_index"] == 2
    assert "protein inventory" in payload["text"]


def test_deterministic_point_id_is_stable():
    first = deterministic_point_id("supplier-ordering", 0, "Minimum stock rule")
    second = deterministic_point_id("supplier-ordering", 0, "Minimum stock rule")
    different = deterministic_point_id("supplier-ordering", 1, "Minimum stock rule")

    assert first == second
    assert first != different


@patch("data.process.rag.embed")
@patch("data.process.rag.qdrant_client")
def test_setup_recreates_collection_and_uses_stable_point_ids(mock_qdrant, mock_embed, tmp_path):
    mock_embed.return_value = [0.1] * 1024

    doc_path = tmp_path / "brasaland-supplier-ordering.en.md"
    doc_path.write_text(
        "# Supplier Ordering\n\n"
        "Minimum stock rule: no location should operate with less than 3 days of main protein inventory.\n",
        encoding="utf-8",
    )

    setup(str(tmp_path))
    setup(str(tmp_path))

    assert mock_qdrant.recreate_collection.call_count == 2
    mock_qdrant.recreate_collection.assert_called_with(
        collection_name=COLLECTION_NAME,
        vectors_config=mock_qdrant.recreate_collection.call_args.kwargs["vectors_config"],
    )

    upsert_calls = mock_qdrant.upsert.call_args_list
    assert len(upsert_calls) == 2
    first_ids = {point.id for point in upsert_calls[0].kwargs["points"]}
    second_ids = {point.id for point in upsert_calls[1].kwargs["points"]}
    assert first_ids == second_ids
    assert len(first_ids) == len(upsert_calls[0].kwargs["points"])


@patch("data.process.rag.embedding_client")
def test_embed_calls_embedding_model(mock_embedding_client):
    mock_embedding_client.embeddings.create.return_value = MagicMock(
        data=[MagicMock(embedding=[0.5] * 1024)]
    )

    vector = embed("sample text for embedding")

    assert isinstance(vector, list)
    assert all(isinstance(value, float) for value in vector)
    assert len(vector) == 1024
    mock_embedding_client.embeddings.create.assert_called_once_with(
        input="sample text for embedding",
        model=EMBEDDING_MODEL_ID,
    )


@patch("data.process.rag.embedding_client")
def test_embed_rejects_empty_text(mock_embedding_client):
    with pytest.raises(ValueError, match="non-empty"):
        embed("   ")
    mock_embedding_client.embeddings.create.assert_not_called()


@patch("data.pipelines.rag.embed")
def test_retrieve_uses_shared_embed_for_query(mock_embed):
    mock_embed.return_value = [0.1] * 1024

    with patch("data.pipelines.rag.qdrant_client") as mock_qdrant:
        mock_qdrant.query_points.return_value = MagicMock(points=[])
        retrieve("user question about supplier ordering")

    mock_embed.assert_called_once_with("user question about supplier ordering")
