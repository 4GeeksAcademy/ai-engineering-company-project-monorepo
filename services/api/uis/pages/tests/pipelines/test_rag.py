# ✅ Correct import:
from data.pipelines.rag import retrieve, query


@patch("data.pipelines.rag.qdrant_client")
@patch("data.pipelines.rag.embed")
def test_retrieve_filters_by_min_score(mock_embed, mock_qdrant):
    """Verify that retrieve() excludes results below min_score and returns payloads."""
    # Mock embedding function return value
    mock_embed.return_value = [0.1] * 1536

    # Mock Qdrant search response with items above and below min_score (0.70)
    hit1 = MagicMock()
    hit1.score = 0.85
    hit1.payload = {"text": "High score chunk", "source_document": "doc1.md"}

    hit2 = MagicMock()
    hit2.score = 0.50  # Should be filtered out
    hit2.payload = {"text": "Low score chunk", "source_document": "doc2.md"}

    mock_qdrant.search.return_value = [hit1, hit2]

    results = retrieve("sample query", k=5, min_score=0.70)

    # Assertions
    assert len(results) == 1
    assert results[0]["text"] == "High score chunk"
    assert results[0]["_score"] == 0.85
    mock_embed.assert_called_once_with("sample query")


@patch("data.pipelines.rag.llm_client")
@patch("data.pipelines.rag.retrieve")
def test_query_orchestrates_retrieval_and_generation(mock_retrieve, mock_llm):
    """Verify that query() calls retrieve() and passes context to the LLM."""
    # Mock retrieved chunks
    mock_retrieve.return_value = [
        {"text": "Company return policy allows 30-day refunds."}
    ]

    # Mock LLM completion response
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content="We offer a 30-day return policy."))
    ]
    mock_llm.chat.completions.create.return_value = mock_response

    answer = query("What is the return policy?")

    # Assertions
    assert answer == "We offer a 30-day return policy."
    mock_retrieve.assert_called_once_with(
        "What is the return policy?", k=5, min_score=0.70
    )
    mock_llm.chat.completions.create.assert_called_once()