"""Mapping from the TelemetryEvent API model to a telemetry_events row, and
the bulk-insert operation that persists mapped rows.

Source of truth for the table itself:
supabase/migrations/20261030220000_create_telemetry_events.sql and
20261102000000_drop_telemetry_events_received_at.sql — no "approved"
storage contract existed anywhere in the repository when the table was
first designed (confirmed by an exhaustive search); the schema and this
mapping were designed from scratch and confirmed with the user, in
particular that `tags` is the storage-layer name for the API envelope's
`properties` field, not a separate concept. The table is exactly the 8
TelemetryEvent envelope fields — a 9th, self-initiated `received_at` audit
column was added and then removed again (see the second migration) to
match that 8-field contract exactly.

`telemetry_events_table` is a plain SQLAlchemy Core `Table`, deliberately
*not* a `SQLModel(table=True)` class registered on `SQLModel.metadata`:
the table already exists (created by the migration above), and keeping it
off `SQLModel.metadata` guarantees `init_db()`'s `create_all()` /
`_run_lightweight_migrations()` (app/core/database.py) can never attempt
to touch it — this module only ever INSERTs into an already-migrated table.

Duplicate-event policy: `event_id` is the table's primary key (see the
migration) and there is no `ON CONFLICT` clause here — a batch that
collides with an already-stored `event_id` (e.g. a retried delivery that
partially succeeded before) fails the *entire* bulk insert with a
uniqueness violation, which the router surfaces as a persistence failure
(non-2xx), not a partial success. This is the existing, approved policy
from the storage phase (no upsert/dedup was specified there) — introducing
`ON CONFLICT DO NOTHING`/`DO UPDATE` here would silently change that
contract, which this task explicitly says not to do. See the Phase 2
completion report for the retry-of-a-partially-stored-batch edge case this
leaves unresolved.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, TypedDict
from uuid import UUID

import pandas as pd
from sqlalchemy import Column, MetaData, String, Table, insert, select
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.sql.sqltypes import DateTime
from sqlmodel import Session

from app.models.telemetry import TelemetryEvent

# Unbound MetaData — intentionally separate from SQLModel.metadata (see
# module docstring).
_metadata = MetaData()

telemetry_events_table = Table(
    "telemetry_events",
    _metadata,
    Column("event_id", PGUUID(as_uuid=True), primary_key=True),
    Column("timestamp", DateTime(timezone=True), nullable=False),
    Column("session_id", String, nullable=True),
    Column("user_id", String, nullable=True),
    Column("event_type", String, nullable=False),
    Column("schema_version", String, nullable=False),
    Column("request_id", String, nullable=True),
    Column("tags", JSONB, nullable=False),
)


class TelemetryEventRow(TypedDict):
    """Shape of one telemetry_events row — the table's 8 columns, matching
    the TelemetryEvent envelope 1:1 (properties -> tags)."""

    event_id: UUID
    timestamp: Any  # datetime (AwareDatetime) — see TelemetryEvent.timestamp
    session_id: str | None
    user_id: str | None
    event_type: str
    schema_version: str
    request_id: str | None
    tags: dict[str, object]


def map_telemetry_event_to_row(event: TelemetryEvent) -> TelemetryEventRow:
    """Build a telemetry_events row from a validated TelemetryEvent.

    Every capture-time identity/metadata field is copied verbatim — eventId,
    timestamp, sessionId, userId, requestId are never regenerated or
    altered here. `properties` is renamed to `tags` (the one deliberate
    naming change the storage layer makes); its content is passed through
    unchanged.
    """
    return TelemetryEventRow(
        event_id=event.eventId,
        timestamp=event.timestamp,
        session_id=event.sessionId,
        user_id=event.userId,
        event_type=event.event_type,
        schema_version=event.schemaVersion,
        request_id=event.requestId,
        tags=event.properties,
    )


def insert_telemetry_event_rows(db: Session, rows: list[TelemetryEventRow]) -> None:
    """Insert every row in a single bulk INSERT statement (one multi-row
    VALUES clause, not N separate inserts) and commit.

    Callers must not call this with an empty `rows` list — the router
    skips the call entirely when there are no valid events, per the task's
    "skip the database call when there are no valid events" requirement.
    Raises on any database error (e.g. the duplicate-event case above);
    callers are responsible for rollback/error handling — this function
    does not catch or classify failures itself.
    """
    if not rows:
        raise ValueError("insert_telemetry_event_rows called with no rows — caller should have skipped it")
    db.execute(insert(telemetry_events_table), rows)
    db.commit()


# Rows per `fetchmany()` call in `fetch_telemetry_events_dataframe` — bounds
# how much of a large period's result set the Python process holds at once.
TELEMETRY_REPORT_FETCH_CHUNK_SIZE = 5000


def fetch_telemetry_events_dataframe(
    db: Session, start_date: datetime, end_date: datetime
) -> pd.DataFrame:
    """Fetch every telemetry_events row with start_date <= timestamp < end_date,
    as a DataFrame with one column per table column (event_id, timestamp,
    session_id, user_id, event_type, schema_version, request_id, tags).

    `start_date`/`end_date` must already be resolved, UTC, tz-aware
    datetimes — the caller (the report endpoint) is responsible for
    resolving defaults and validating/normalizing them; this function does
    not apply its own window or read the clock.

    Uses a server-side cursor (`execution_options(stream_results=True)`)
    and reads results in `TELEMETRY_REPORT_FETCH_CHUNK_SIZE`-row chunks via
    repeated `fetchmany()` calls rather than one `.all()`/`fetchall()`, so a
    report spanning a large period is read incrementally instead of forcing
    the whole matching result set into the driver's memory in one shot, and
    nothing is silently dropped the way a fixed page-size API (e.g.
    PostgREST's default row cap) could: every matching row is read, chunk
    by chunk, until the cursor is exhausted.
    """
    statement = (
        select(telemetry_events_table)
        .where(telemetry_events_table.c.timestamp >= start_date)
        .where(telemetry_events_table.c.timestamp < end_date)
        .order_by(telemetry_events_table.c.timestamp)
        .execution_options(stream_results=True)
    )
    columns = [column.name for column in telemetry_events_table.columns]

    rows: list[tuple[Any, ...]] = []
    result = db.execute(statement)
    try:
        while True:
            chunk = result.fetchmany(TELEMETRY_REPORT_FETCH_CHUNK_SIZE)
            if not chunk:
                break
            rows.extend(chunk)
    finally:
        result.close()

    return pd.DataFrame(rows, columns=columns)
