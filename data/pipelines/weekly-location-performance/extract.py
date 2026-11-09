"""Extraction task — docs/PIPELINE_DESIGN.md sections 3 and 10.

Reads every `telemetry_events` row relevant to this report for one ISO
week, read-only. Reuses the server-side-cursor + chunked-read *pattern*
already proven in
`services/api/app/models/telemetry_storage.fetch_telemetry_events_dataframe`
(not that function itself, which only filters by timestamp — this task
also needs the `event_type IN (...)` filter pushed into the query, per
docs/PIPELINE_DESIGN.md section 3).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

import pandas as pd
from prefect import task
from sqlalchemy import select
from sqlmodel import Session

import _pathsetup  # noqa: F401  (sets up sys.path for sibling imports)

from app.core.database import engine
from app.models.telemetry_storage import TELEMETRY_REPORT_FETCH_CHUNK_SIZE, telemetry_events_table

# The 4 event types this report's KPIs are built from — docs/company-briefing.md
# section 3. `outbound_order_created` is deliberately excluded: it feeds no
# KPI of this report (same section).
RELEVANT_EVENT_TYPES = (
    "inbound_order_created",
    "stock_waste_registered",
    "stock_threshold_triggered",
    "ingredient_price_variance_detected",
)


@dataclass(frozen=True)
class ExtractResult:
    raw_events: pd.DataFrame
    records_read: int


def iso_week_bounds(week_start: date) -> tuple[datetime, datetime]:
    """[week_start 00:00:00 UTC, week_start + 7 days) — same
    start-inclusive / end-exclusive convention already used by
    `GET /telemetry/report` (docs/PIPELINE_DESIGN.md section 3).
    """
    start = datetime(week_start.year, week_start.month, week_start.day, tzinfo=timezone.utc)
    return start, start + timedelta(days=7)


def _fetch_weekly_events(db: Session, start: datetime, end: datetime) -> pd.DataFrame:
    statement = (
        select(telemetry_events_table)
        .where(telemetry_events_table.c.event_type.in_(RELEVANT_EVENT_TYPES))
        .where(telemetry_events_table.c.timestamp >= start)
        .where(telemetry_events_table.c.timestamp < end)
        .order_by(telemetry_events_table.c.timestamp)
        .execution_options(stream_results=True)
    )
    columns = [column.name for column in telemetry_events_table.columns]

    rows: list[tuple] = []
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


# Retries: this task's only I/O is a read-only SELECT against Supabase/
# Postgres over the network. Every realistic failure mode here — a dropped
# connection, a transient pool timeout, a brief network blip — is exactly
# what a short backoff reliably clears; it is not a bug retrying would
# paper over. 3 attempts / 30s backoff is the value
# docs/PIPELINE_DESIGN.md section 10 already proposed for this exact task.
# A malformed `week_start` (not a real date) is a configuration error, not
# a transient one — retrying it 3 times would fail 3 times identically, so
# the flow validates/resolves `week_start` itself before this task ever
# runs (see flow.py) rather than relying on retries to "fix" it.
@task(
    name="extract_weekly_telemetry_events",
    retries=3,
    retry_delay_seconds=30,
)
def extract_weekly_telemetry_events(week_start: date) -> ExtractResult:
    """Read-only extraction for one ISO week — never writes to
    telemetry_events (docs/company-briefing.md section 7).
    """
    start, end = iso_week_bounds(week_start)
    with Session(engine) as db:
        raw_events = _fetch_weekly_events(db, start, end)
    return ExtractResult(raw_events=raw_events, records_read=len(raw_events))
