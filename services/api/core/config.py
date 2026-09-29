"""Cross-cutting app configuration. No business logic lives here."""

from __future__ import annotations

import logging
import os
import secrets
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
MIN_SECRET_KEY_LENGTH = 32
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 30


def get_allowed_origins() -> list[str]:
    """CORS origins, from the ALLOWED_ORIGINS env var (comma-separated).

    Falls back to the local Vite dev servers for uis/website and
    uis/backoffice so the API is usable out of the box in development.
    Production deployments must set ALLOWED_ORIGINS explicitly.
    """
    raw = os.environ.get("ALLOWED_ORIGINS")
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://localhost:5174",
    ]


def get_suppliers_db_path() -> Path:
    """TinyDB file for the suppliers domain (gitignored runtime state)."""
    return Path(__file__).resolve().parent.parent / "suppliers" / "db.json"


def get_users_db_path() -> Path:
    """TinyDB file for the internal users (gitignored runtime state)."""
    return Path(__file__).resolve().parent.parent / "users" / "db.json"


def get_profiles_db_path() -> Path:
    """TinyDB file for the user profiles (gitignored runtime state)."""
    return Path(__file__).resolve().parent.parent / "profiles" / "db.json"


@lru_cache(maxsize=1)
def get_jwt_secret() -> str:
    """Key used to sign the access tokens, from the SECRET_KEY env var.

    Production deployments must set it (e.g. ``openssl rand -hex 32``). When
    it is missing we fall back to a random per-process key so development
    works out of the box; every restart then invalidates all sessions, and
    it is never valid across several workers. A key that is set but too short
    is refused rather than silently accepted.
    """
    raw = os.environ.get("SECRET_KEY")
    if raw:
        if len(raw) < MIN_SECRET_KEY_LENGTH:
            raise RuntimeError(f"SECRET_KEY must be at least {MIN_SECRET_KEY_LENGTH} characters long")
        return raw
    logger.warning("SECRET_KEY is not set: using a random key, sessions will not survive a restart")
    return secrets.token_urlsafe(48)


def get_access_token_expire_minutes() -> int:
    """Lifetime of an access token, from ACCESS_TOKEN_EXPIRE_MINUTES (default 30)."""
    raw = os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES")
    if not raw:
        return DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES
    try:
        minutes = int(raw)
    except ValueError:
        minutes = 0
    if minutes <= 0:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer")
    return minutes
