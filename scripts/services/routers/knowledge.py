"""Deprecated router module.

``POST /knowledge/query`` is implemented in ``services/knowledge/routes.py``
and mounted on the central app (``services/api/app.py`` via ``api.app:app``).
This module re-exports that router so older imports do not start a second stack.
"""
from __future__ import annotations

import warnings

warnings.warn(
    "scripts.services.routers.knowledge is deprecated; "
    "the central API mounts services.knowledge.routes.",
    DeprecationWarning,
    stacklevel=2,
)

from services.knowledge.routes import router  # noqa: E402

__all__ = ["router"]
