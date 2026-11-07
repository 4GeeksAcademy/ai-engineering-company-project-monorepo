"""SQL storage for `users` — migrated from TinyDB.

Plain SQLAlchemy Core `Table` (not a SQLModel ORM class), kept on its own
unbound `MetaData` — same pattern as `app/models/telemetry_storage.py` —
so `SQLModel.metadata.create_all()` (used only for inbound_stock/
stock_exits/menu_items) never touches this migration-owned table. DDL
authority lives in
`supabase/migrations/<ts>_create_users_profiles_tokens_suppliers.sql`;
this module only reads/writes rows.

IDs are preserved 1:1 from the former TinyDB `doc_id` (see
`migrate_tinydb_to_sql.py`) — this is why `users` and everything that
references it (`profiles.user_id`, `password_reset_tokens.user_id`, and
after the FK retrofit, `inbound_stock.user_uuid`/`stock_exits.user_uuid`)
still resolves correctly after the cutover. JWTs already issued before
the cutover (`sub` = str(old TinyDB doc_id)) keep working for the same
reason.
"""

from __future__ import annotations

from typing import Any, TypedDict

from sqlalchemy import Boolean, Column, DateTime, Integer, MetaData, String, Table

metadata = MetaData()

users_table = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("email", String, nullable=False, unique=True),
    Column("hashed_password", String, nullable=False),
    Column("is_active", Boolean, nullable=False, server_default="true"),
    Column("role", String, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)


class UserRow(TypedDict):
    """Shape of one `users` row — never contains name/phone/address (those
    live on the linked `profiles` row, see `profile_storage.py`)."""

    id: int
    email: str
    hashed_password: str
    is_active: bool
    role: str
    created_at: Any
