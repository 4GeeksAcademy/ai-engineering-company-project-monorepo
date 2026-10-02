from types import SimpleNamespace
from unittest.mock import Mock

from data.pipelines import rag


def test_retrieve_filters_scores_and_does_not_force_k(monkeypatch):
    client = Mock()
    client.search.return_value = [
        SimpleNamespace(score=0.91, payload={"text": "relevante", "source_document": "sla-delivery"}),
        SimpleNamespace(score=0.20, payload={"text": "irrelevante", "source_document": "returns-policy"}),
    ]
    monkeypatch.setattr(rag, "_client", lambda: client)
    monkeypatch.setattr(rag, "embed", lambda _: [0.1, 0.2])

    results = rag.retrieve("plazo", k=3, min_score=0.35)

    assert len(results) == 1
    assert results[0]["text"] == "relevante"
    client.search.assert_called_once()


def test_query_composes_retrieval_and_generation(monkeypatch):
    context = [{"text": "contexto", "source_document": "sla-delivery", "score": 0.9}]
    retrieve = Mock(return_value=context)
    generate = Mock(return_value="respuesta generada")
    monkeypatch.setattr(rag, "retrieve", retrieve)
    monkeypatch.setattr(rag, "generate_answer", generate)

    result = rag.query("¿Cuál es el plazo?")

    assert result == "respuesta generada"
    retrieve.assert_called_once_with("¿Cuál es el plazo?")
    generate.assert_called_once_with("¿Cuál es el plazo?", context)
    assert "contexto" not in result


def test_empty_context_is_cautious_without_calling_llm(monkeypatch):
    monkeypatch.setattr(rag, "_generation_settings", lambda: ("", "", ""))
    answer = rag.generate_answer("¿Hay una condición?", [])
    assert "información suficientemente relevante" in answer
