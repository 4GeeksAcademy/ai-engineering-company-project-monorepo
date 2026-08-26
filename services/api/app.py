"""Compatibility entry: ``uvicorn api.app:app`` re-exports ``main.app``."""

from main import app

__all__ = ["app"]
