"""SQL storage for `password_reset_tokens` — migrated from TinyDB.

See `user_storage.py`'s module docstring for the general rationale.
`user_id` is a real FK to `users.id`. There was no Pydantic schema for
this entity even before the migration (it was built as a raw dict) —
that stays true here too; only `app/models/password_reset_token_storage.py`
describes its shape.
"""

from __future__ import annotations

from typing import Any, TypedDict

from sqlalchemy import Column, DateTime, ForeignKey, Integer, MetaData, String, Table

from app.models.user_storage import users_table

metadata = MetaData()

password_reset_tokens_table = Table(
    "password_reset_tokens",
    metadata,
    Column("id", Integer, primary_key=True),
    # FK built from the actual Column object — see profile_storage.py's
    # comment on why (users lives on its own separate Core MetaData).
    Column("user_id", Integer, ForeignKey(users_table.c.id, ondelete="CASCADE"), nullable=False, index=True),
    Column("token_hash", String, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("used_at", DateTime(timezone=True), nullable=True),
)


class PasswordResetTokenRow(TypedDict):
    id: int
    user_id: int
    token_hash: str
    created_at: Any
    expires_at: Any
    used_at: Any | None
