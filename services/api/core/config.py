"""Cross-cutting app configuration. No business logic lives here."""

from __future__ import annotations

import logging
import os
import secrets
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote, unquote

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# services/api/.env (gitignored) feeds SECRET_KEY & co. Variables already set in
# the environment win, so deployments and tests can still override it.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

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


def _data_file(package: str, filename: str) -> Path:
    """Runtime state file. DATA_DIR (set in containers) moves them all into one persistent volume."""
    data_dir = os.environ.get("DATA_DIR")
    if data_dir:
        path = Path(data_dir) / package / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        return path
    return Path(__file__).resolve().parent.parent / package / filename


def get_suppliers_db_path() -> Path:
    """TinyDB file for the suppliers domain (gitignored runtime state)."""
    return _data_file("suppliers", "db.json")


def get_incidents_db_path() -> Path:
    """TinyDB file for the managed incidents (gitignored runtime state)."""
    return _data_file("incidents", "db.json")


def get_users_db_path() -> Path:
    """TinyDB file for the internal users (gitignored runtime state)."""
    return _data_file("users", "db.json")


def get_profiles_db_path() -> Path:
    """TinyDB file for the user profiles (gitignored runtime state)."""
    return _data_file("profiles", "db.json")


def get_local_inventory_db_path() -> Path:
    """SQLite file used by the inventory domain when DATABASE_URL is not set (gitignored)."""
    return _data_file("inventory", "db.sqlite")


def uses_local_inventory_db() -> bool:
    """True when the inventory runs on the local SQLite fallback, not on Supabase."""
    return not os.environ.get("DATABASE_URL")


def get_database_url() -> str:
    """SQL connection string for the inventory domain, from the DATABASE_URL env var.

    In production this is the Supabase *Transaction pooler* URI. Its scheme is normalised to
    ``postgresql+psycopg2://`` so the driver in ``pyproject.toml`` is the one used. Without
    DATABASE_URL we fall back to a local SQLite file so development and tests work out
    of the box, the same way a missing SECRET_KEY does. Users and profiles never go
    through this connection: they stay in TinyDB.
    """
    raw = os.environ.get("DATABASE_URL", "").strip()
    if not raw:
        path = get_local_inventory_db_path()
        logger.warning("DATABASE_URL is not set: inventory uses the local SQLite file %s", path)
        return f"sqlite:///{path}"
    # Pin the driver we install (psycopg2): SQLAlchemy 2.1 defaults a bare ``postgresql://``
    # to psycopg v3, and Supabase/Heroku still hand out the legacy ``postgres://`` scheme.
    for scheme in ("postgres://", "postgresql://"):
        if raw.startswith(scheme):
            return "postgresql+psycopg2://" + _encode_password(raw[len(scheme):])
    if raw.startswith("postgresql+psycopg2://"):
        prefix = "postgresql+psycopg2://"
        return prefix + _encode_password(raw[len(prefix):])
    return raw


def _encode_password(rest: str) -> str:
    """Percent-encode the password inside ``user:password@host/db``.

    A password with ``@``, ``#``, ``/`` or ``:`` written as it is would be read as part of the
    host. The host is whatever follows the *last* ``@``, so everything before it is
    credentials. Already-encoded passwords (``%40``) are decoded first, so the result is the
    same whether or not the caller encoded it.
    """
    credentials, at, host = rest.rpartition("@")
    if not at or ":" not in credentials:
        return rest
    user, _, password = credentials.partition(":")
    return f"{user}:{quote(unquote(password), safe='')}@{host}"


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
