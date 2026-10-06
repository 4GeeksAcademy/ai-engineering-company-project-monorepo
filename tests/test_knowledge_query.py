"""Central API knowledge query: offline RAG, citations, and the golden set."""
from __future__ import annotations

import importlib
import sys
import warnings
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


@pytest.fixture(autouse=True)
def _offline_rag(monkeypatch):
    monkeypatch.setenv("BRASALAND_RAG_BACKEND", "local")
    monkeypatch.setenv("BRASALAND_RAG_EMBEDDINGS", "local")
    monkeypatch.setenv("BRASALAND_RAG_LLM", "extractive")


@pytest.fixture(scope="module")
def client():
    from api.app import app

    return TestClient(app)


def test_openapi_lists_knowledge_query(client):
    document = client.get("/openapi.json")
    assert document.status_code == 200
    path = document.json()["paths"]["/knowledge/query"]["post"]
    assert path["tags"] == ["knowledge"]
    schema = path["responses"]["200"]["content"]["application/json"]["schema"]
    assert "answer" in str(schema) or "$ref" in schema


def test_docs_page_is_served(client):
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger" in response.text.lower() or "openapi" in response.text.lower()


def test_house_sauce_returns_cited_chunk(client):
    response = client.post(
        "/knowledge/query",
        json={"question": "What does the House Sauce contain?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "soy" in body["answer"].lower()
    assert "sulfites" in body["answer"].lower()
    assert body["sources"]
    assert any(
        source["source_document"] == "brasaland-menu-allergens.en.md" for source in body["sources"]
    )
    assert "text" in body["sources"][0]
    assert "score" in body["sources"][0]


def test_unknown_question_has_no_sources(client):
    response = client.post(
        "/knowledge/query",
        json={"question": "What is the capital of Japan?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "not enough information" in body["answer"].lower()
    assert body["sources"] == []


def test_blank_question_is_400(client):
    response = client.post("/knowledge/query", json={"question": "   "})
    assert response.status_code == 400
    body = response.json()
    assert body["status"] == 400
    assert body["code"] == "bad_request"
    assert "empty" in body["message"].lower()


def test_missing_question_is_422(client):
    response = client.post("/knowledge/query", json={})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_local_embedding_is_deterministic():
    process = importlib.import_module("data.process.rag")
    first = process.embed_local("House Sauce soy sulfites")
    second = process.embed_local("House Sauce soy sulfites")
    assert first == second
    assert len(first) == process.LOCAL_DIM
    norm = sum(value * value for value in first) ** 0.5
    assert norm == pytest.approx(1.0, abs=1e-6)


def test_prompt_keeps_allergen_and_currency_rules():
    pipelines = importlib.import_module("data.pipelines.rag")
    prompt = pipelines.build_prompt(
        "Is the ribs sauce safe?",
        [{"source_document": "brasaland-menu-allergens.en.md", "section": "part", "text": "contains soy"}],
    )
    assert "100% safe" in prompt
    assert "COP" in prompt
    assert "contains soy" in prompt
    assert "physical stamp cards" in prompt


def test_openai_mode_returns_model_text_and_sources(client, monkeypatch):
    monkeypatch.setenv("BRASALAND_RAG_LLM", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-not-a-real-key")

    def _fake(question: str, chunks: list[dict]) -> str:
        assert chunks
        assert "House" in question or question
        return "House Sauce contains soy and sulfites."

    monkeypatch.setattr("data.pipelines.rag.generate_openai", _fake)
    response = client.post(
        "/knowledge/query",
        json={"question": "What does the House Sauce contain?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == "House Sauce contains soy and sulfites."
    assert body["sources"]
    assert "sk-test" not in response.text


def test_openai_mode_without_key_is_503(client, monkeypatch):
    monkeypatch.setenv("BRASALAND_RAG_LLM", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    process = importlib.import_module("data.process.rag")
    process._openai_client = None
    response = client.post(
        "/knowledge/query",
        json={"question": "What does the House Sauce contain?"},
    )
    assert response.status_code == 503
    body = response.json()
    assert body["code"] == "service_unavailable"
    assert "language model" in body["message"].lower()
    assert "traceback" not in response.text.lower()
    assert "sk-" not in response.text


def test_qdrant_backend_uses_vector_hits(monkeypatch):
    monkeypatch.setenv("BRASALAND_RAG_BACKEND", "qdrant")
    pipelines = importlib.import_module("data.pipelines.rag")

    def _fake(vector, k):
        assert len(vector) == 384
        assert k >= 1
        return [
            (
                0.91,
                {
                    "source_document": "brasaland-menu-allergens.en.md",
                    "section": "Menu Allergen Guide · part 1",
                    "text": "House Sauce: contains soy and sulfites.",
                    "chunk_index": 1,
                    "language": "en",
                },
            ),
            (
                0.10,
                {
                    "source_document": "brasaland-waste-protocol.en.md",
                    "section": "low",
                    "text": "below the cosine floor",
                    "chunk_index": 0,
                    "language": "en",
                },
            ),
        ]

    monkeypatch.setattr(pipelines, "search_qdrant", _fake)
    found = pipelines.retrieve("house sauce")
    assert len(found) == 1
    assert found[0]["source_document"] == "brasaland-menu-allergens.en.md"
    assert found[0]["score"] == 0.91


def test_qdrant_failure_is_503(client, monkeypatch):
    monkeypatch.setenv("BRASALAND_RAG_BACKEND", "qdrant")
    from services.safe_errors import ExternalServiceError

    def _boom(vector, k):
        raise ExternalServiceError("vector store")

    monkeypatch.setattr("data.pipelines.rag.search_qdrant", _boom)
    response = client.post(
        "/knowledge/query",
        json={"question": "What does the House Sauce contain?"},
    )
    assert response.status_code == 503
    assert response.json()["message"] == "vector store is unavailable"
    assert "localhost" not in response.text


def test_deprecated_scripts_delegate_to_brasaland_collection():
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        scripts_rag = importlib.import_module("scripts.rag")
        router_mod = importlib.import_module("scripts.services.routers.knowledge")
    assert scripts_rag.COLLECTION_NAME == "brasaland_kb"
    assert router_mod.router is importlib.import_module("services.knowledge.routes").router
    messages = " ".join(str(item.message) for item in caught)
    assert "deprecated" in messages.lower()


def test_golden_set_retrieval_and_answer_checks():
    from data.eval.eval_knowledge_qa import evaluate, load_golden

    rows = load_golden()
    assert 15 <= len(rows) <= 30
    report = evaluate()
    assert report["failures"] == []
    assert report["retrieval_hit_rate"] == 1.0
    assert report["answer_pass_rate"] == 1.0
