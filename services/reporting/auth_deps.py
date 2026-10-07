"""Auth dependency shared with the Brasaland central API (Bearer JWT)."""
from __future__ import annotations

import sys
from pathlib import Path

_API_DIR = Path(__file__).resolve().parents[1] / "api"
if str(_API_DIR) not in sys.path:
    sys.path.insert(0, str(_API_DIR))

from users import get_current_user  # noqa: E402

__all__ = ["get_current_user"]
