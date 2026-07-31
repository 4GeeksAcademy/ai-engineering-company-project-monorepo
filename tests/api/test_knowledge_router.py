from unittest.mock import patch

from fastapi.testclient import TestClient

from api.app import app

client = TestClient(app)


def test_knowledge_router_delegates_only_to_pipeline_query():
    import inspect

    import routers.knowledge as knowledge_router

    module_source = inspect.getsource(knowledge_router)

    assert "from data.pipelines.rag import query" in module_source
    assert "retrieve(" not in module_source
    assert "embed(" not in module_source
    assert "generation_client" not in module_source
    assert "QdrantClient" not in module_source


@patch("routers.knowledge.query")
def test_knowledge_query_returns_answer_only(mock_query):
    mock_query.return_value = "Locations must keep at least 3 days of protein stock."

    response = client.post(
        "/knowledge/query",
        json={"question": "What is the minimum stock rule for proteins?"},
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"answer"}
    assert body == {
        "answer": "Locations must keep at least 3 days of protein stock."
    }
    assert "_score" not in body
    assert "chunks" not in body
    mock_query.assert_called_once_with("What is the minimum stock rule for proteins?")


def test_knowledge_query_rejects_empty_question():
    response = client.post("/knowledge/query", json={"question": ""})

    assert response.status_code == 422


@patch("routers.knowledge.query")
def test_knowledge_query_strips_question_whitespace(mock_query):
    mock_query.return_value = "Answer text."

    response = client.post("/knowledge/query", json={"question": "  protein stock?  "})

    assert response.status_code == 200
    mock_query.assert_called_once_with("protein stock?")
