"""SQL storage for `suppliers` — migrated from TinyDB.

See `user_storage.py`'s module docstring for the general rationale. IDs
are preserved 1:1 from the former TinyDB `doc_id` (`InboundStock.supplier_id`
already stores these as a bare int — preserving them, plus the FK
retrofit in a later migration, is what keeps that reference valid and
makes it a real FK).

Note on naming (carried over as-is, not redesigned here): this entity's
fields (full_name, date_of_birth, dietary_preferences, accepts_terms, ...)
are the Brasa Points loyalty-registration shape, while the table/column
names (`suppliers`, `rate`, `status`, `product_category`) read like a
vendor directory. Both were already true in TinyDB — migrating as-is,
per the task's instruction not to redesign business meaning.
"""

from __future__ import annotations

from typing import Any, TypedDict

from sqlalchemy import JSON, Boolean, Column, Date, DateTime, Float, Integer, MetaData, String, Table

metadata = MetaData()

suppliers_table = Table(
    "suppliers",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("full_name", String, nullable=False),
    Column("email", String, nullable=False, unique=True),
    Column("phone", String, nullable=False),
    Column("country", String, nullable=False),
    Column("city", String, nullable=False),
    Column("favorite_location", String, nullable=True),
    # Generic JSON (not Postgres JSONB) — portable to the SQLite test
    # engine, same choice already made for MenuItem.dietary_preferences.
    Column("dietary_preferences", JSON, nullable=False, default=list),
    Column("how_did_you_find_us", String, nullable=True),
    Column("date_of_birth", Date, nullable=False),
    Column("accepts_terms", Boolean, nullable=False),
    Column("wants_email_offers", Boolean, nullable=False, server_default="false"),
    Column("product_category", String, nullable=True),
    Column("rate", Float, nullable=True),
    Column("status", String, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)


class SupplierRow(TypedDict):
    id: int
    full_name: str
    email: str
    phone: str
    country: str
    city: str
    favorite_location: str | None
    dietary_preferences: list[str]
    how_did_you_find_us: str | None
    date_of_birth: Any
    accepts_terms: bool
    wants_email_offers: bool
    product_category: str | None
    rate: float | None
    status: str
    created_at: Any
    updated_at: Any
