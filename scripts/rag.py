"""Deprecated query module.

Retired collection: ``company_knowledge_base`` (generic sales prompt, score
floor 0.70). Indexing always wrote ``brasaland_kb`` in ``data/process/rag.py``,
so this module could not see those chunks.

``retrieve`` and ``query`` now delegate to ``data.pipelines.rag``, which is
what ``POST /knowledge/query`` calls on the central API.
"""
from __future__ import annotations

import warnings

warnings.warn(
    "scripts.rag is deprecated; use data.pipelines.rag and POST /knowledge/query "
    "on uvicorn api.app:app (collection brasaland_kb).",
    DeprecationWarning,
    stacklevel=2,
)

from data.pipelines.rag import COLLECTION_NAME, query, retrieve  # noqa: E402

__all__ = ["COLLECTION_NAME", "query", "retrieve"]
