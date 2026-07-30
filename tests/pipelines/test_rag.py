from unittest.mock import MagicMock, patch

import pytest

from data.pipelines.rag import DEFAULT_K, MIN_SCORE, query, retrieve
from data.process.rag import chunk_markdown, embed


@patch("data.pipelines.rag.qdrant_client")
@patch("data.pipelines.rag.embed")
def test_retrieve_filters_by_min_score(mock_embed, mock_qdrant):
    mock_embed.return_value = [0.1] * 1024

    hit_high = MagicMock(score=0.85, payload={"text": "High score chunk", "source_document": "supplier-ordering"})
    hit_low = MagicMock(score=0.50, payload={"text": "Low score chunk", "source_document": "waste-protocol"})
    mock_qdrant.query_points.return_value = MagicMock(points=[hit_high, hit_low])

    results = retrieve("sample query", k=5, min_score=0.70)

    assert len(results) == 1
    assert results[0]["text"] == "High score chunk"
    assert results[0]["_score"] == 0.85
    mock_embed.assert_called_once_with("sample query")


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


@patch("data.pipelines.rag.retrieve")
def test_query_returns_fallback_when_no_chunks(mock_retrieve):
    mock_retrieve.return_value = []

    answer = query("Unknown topic?")

    assert answer == "There is not enough information available to answer this question."


def test_chunk_markdown_splits_by_heading():
    content = "# Supplier Ordering\n\nFirst paragraph with enough characters to pass the minimum chunk size filter.\n\n## Emergency orders\n\nSecond paragraph also long enough to become its own semantic chunk in the index."
    chunks = chunk_markdown(content)

    assert len(chunks) >= 2
    assert any("Supplier Ordering" in section for section, _ in chunks)
    assert any("Emergency orders" in section for section, _ in chunks)


@patch("data.process.rag.embedding_client")
def test_embed_calls_embedding_model(mock_embedding_client):
    mock_embedding_client.embeddings.create.return_value = MagicMock(
        data=[MagicMock(embedding=[0.5, 0.25, 0.125])]
    )

    vector = embed("sample text for embedding")

    assert vector == [0.5, 0.25, 0.125]
    mock_embedding_client.embeddings.create.assert_called_once()
