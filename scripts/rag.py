"""CLI shim — delegates to Brasaland RAG pipeline (see CONTEXT-company.md)."""

from data.pipelines.rag import query, retrieve

__all__ = ["query", "retrieve"]
