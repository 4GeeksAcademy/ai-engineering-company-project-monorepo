"""One-time password reset token storage over SQL (Postgres/Supabase).

Migrated from TinyDB — see app/models/password_reset_token_storage.py.
No Pydantic schema existed for this entity even before the migration
(built as a raw dict); that remains true.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, select, update
from sqlmodel import Session

from app.core.config import get_settings
from app.core.database import engine
from app.models.password_reset_token_storage import password_reset_tokens_table
from app.models.user import UserUpdate
from app.services import users as users_service


def _get_session() -> Session:
    return Session(engine)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_token(user_id: int) -> str:
    """Create a reset token and invalidate earlier unused tokens for the user."""
    settings = get_settings()
    now = _now()
    raw_token = secrets.token_urlsafe(32)

    with _get_session() as db:
        db.execute(
            update(password_reset_tokens_table)
            .where(
                and_(
                    password_reset_tokens_table.c.user_id == user_id,
                    password_reset_tokens_table.c.used_at.is_(None),
                )
            )
            .values(used_at=now)
        )
        db.execute(
            password_reset_tokens_table.insert().values(
                user_id=user_id,
                token_hash=_hash_token(raw_token),
                created_at=now,
                expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
                used_at=None,
            )
        )
        db.commit()
    return raw_token


def consume_token(token: str, new_password: str) -> bool:
    """Update the user's password if the token is valid, unexpired, and unused."""
    with _get_session() as db:
        row = db.execute(
            select(password_reset_tokens_table).where(
                password_reset_tokens_table.c.token_hash == _hash_token(token)
            )
        ).first()

        if row is None or row.used_at is not None:
            return False

        expires_at = row.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= _now():
            return False

        user_id = row.user_id
        db.execute(
            update(password_reset_tokens_table)
            .where(password_reset_tokens_table.c.id == row.id)
            .values(used_at=_now())
        )
        db.commit()

    updated_user = users_service.update_user(
        user_id,
        UserUpdate(password=new_password),
    )
    return updated_user is not None
