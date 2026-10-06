"""Deprecated second FastAPI entry.

The old module imported ``api.routers.knowledge``, which does not exist, so
``POST /knowledge/query`` never reached a running server.

Start the central API instead::

    uvicorn api.app:app

Running this file launches that same app (one knowledge router, not a second
RAG stack).
"""
from __future__ import annotations

import sys
import warnings
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

warnings.warn(
    "services/api/main.py is deprecated; use uvicorn api.app:app",
    DeprecationWarning,
    stacklevel=2,
)

from api.app import app  # noqa: E402

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api.app:app", host="127.0.0.1", port=8000, reload=False)
