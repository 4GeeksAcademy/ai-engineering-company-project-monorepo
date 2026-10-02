"""One-time password reset token storage over TinyDB."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from tinydb import TinyDB, where

from app.core.config import get_settings
from app.models.user import UserUpdate
from app.services import users as users_service

_DB_PATH = Path(__file__).resolve().parent.parent.parent / "db.json"
TOKENS_TABLE = "password_reset_tokens"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_token(user_id: int) -> str:
    """Create a reset token and invalidate earlier unused tokens for the user."""
    settings = get_settings()
    now = _now()
    raw_token = secrets.token_urlsafe(32)
    db = TinyDB(_DB_PATH)
    tokens = db.table(TOKENS_TABLE)

    tokens.update(
        {"used_at": now.isoformat()},
        (where("user_id") == user_id) & (where("used_at") == None),  # noqa: E711
    )
    tokens.insert(
        {
            "user_id": user_id,
            "token_hash": _hash_token(raw_token),
            "created_at": now.isoformat(),
            "expires_at": (
                now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
            ).isoformat(),
            "used_at": None,
        }
    )
    db.close()
    return raw_token


def consume_token(token: str, new_password: str) -> bool:
    """Update the user's password if the token is valid, unexpired, and unused."""
    db = TinyDB(_DB_PATH)
    tokens = db.table(TOKENS_TABLE)
    doc = tokens.get(where("token_hash") == _hash_token(token))

    if doc is None or doc.get("used_at") is not None:
        db.close()
        return False

    expires_at = datetime.fromisoformat(doc["expires_at"])
    if expires_at <= _now():
        db.close()
        return False

    user_id = doc["user_id"]
    tokens.update(
        {"used_at": _now().isoformat()},
        doc_ids=[doc.doc_id],
    )
    db.close()

    updated_user = users_service.update_user(
        user_id,
        UserUpdate(password=new_password),
    )
    return updated_user is not None