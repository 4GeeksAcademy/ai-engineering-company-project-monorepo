"""SQL storage for `profiles` — migrated from TinyDB.

See `user_storage.py`'s module docstring for the general rationale (plain
Core `Table`, own `MetaData`, migration-owned DDL). `profiles.user_id` is
a real FK to `users.id` with a `UNIQUE` constraint (the 1:1 invariant
that TinyDB only enforced in application code is now enforced by the
database itself).
"""

from __future__ import annotations

from typing import Any, TypedDict

from sqlalchemy import Column, ForeignKey, Integer, MetaData, String, Table

from app.models.user_storage import users_table

metadata = MetaData()

profiles_table = Table(
    "profiles",
    metadata,
    Column("id", Integer, primary_key=True),
    # FK built from the actual Column object, not a "users.id" string —
    # `users` lives on a different Core MetaData (user_storage.metadata),
    # so a string-based FK can't be resolved by name within THIS table's
    # own metadata at create_all() time; an explicit Column reference
    # resolves directly.
    Column("user_id", Integer, ForeignKey(users_table.c.id, ondelete="CASCADE"), nullable=False, unique=True),
    Column("name", String, nullable=True),
    Column("phone", String, nullable=True),
    Column("address", String, nullable=True),
)


class ProfileRow(TypedDict):
    id: int
    user_id: int
    name: str | None
    phone: str | None
    address: str | None
