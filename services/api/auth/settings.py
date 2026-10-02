"""Environment-backed authentication settings."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


def _load_dotenv() -> None:
    """Load local `.env` without overriding process environment values."""
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


def get_jwt_settings() -> tuple[str, int]:
    _load_dotenv()
    secret = os.getenv("SECRET_KEY")
    if not secret:
        raise RuntimeError("SECRET_KEY must be configured before using authentication")
    if len(secret) < 32:
        raise RuntimeError("SECRET_KEY must contain at least 32 characters")

    raw_minutes = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    try:
        minutes = int(raw_minutes)
    except ValueError as exc:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer") from exc
    if minutes <= 0:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer")
    return secret, minutes
