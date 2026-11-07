"""SQL storage for `incidents` — migrated from TinyDB.

See `user_storage.py`'s module docstring for the general rationale.
`id` is plain `text`, NOT a `uuid` column — this entity's TinyDB `id`
field was a string, but not uniformly a UUID: `create_incident()`
generates a real `uuid4()`, while `seed_incidents.py` (CSV import) reuses
the legacy report's own `incident_id` code (e.g. "BRS-000001") as the
row id, for idempotent re-seeding. A strict `uuid` column would reject
the CSV-seeded rows outright. `customer_id`/`reporter_id` stay free
text — they are legacy CSV codes, not references to any other table
(confirmed: no `customers`/`managers` table exists anywhere in this
schema).
"""

from __future__ import annotations

from typing import Any, TypedDict

from sqlalchemy import Column, Date, DateTime, Integer, MetaData, String, Table

metadata = MetaData()

incidents_table = Table(
    "incidents",
    metadata,
    # Plain text, not uuid — see module docstring.
    Column("id", String, primary_key=True),
    Column("title", String, nullable=False),
    Column("description", String, nullable=False),
    Column("category", String, nullable=False),
    Column("status", String, nullable=False),
    Column("origin", String, nullable=False),
    Column("branch", String, nullable=False),
    Column("customer_id", String, nullable=True),
    Column("satisfaction_score", Integer, nullable=True),
    Column("reporter_id", String, nullable=True),
    Column("incident_date", Date, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)


class IncidentRow(TypedDict):
    id: str
    title: str
    description: str
    category: str
    status: str
    origin: str
    branch: str
    customer_id: str | None
    satisfaction_score: int | None
    reporter_id: str | None
    incident_date: Any | None
    created_at: Any
    updated_at: Any
