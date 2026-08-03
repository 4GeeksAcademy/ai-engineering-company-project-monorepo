"""Compatibility entry point — use ``uvicorn api.app:app`` (see docs/rag/rag-design.md)."""

from app import app

__all__ = ["app"]
