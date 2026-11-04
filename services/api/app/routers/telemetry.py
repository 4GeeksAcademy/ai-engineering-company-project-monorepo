"""Telemetry ingestion + reporting router.

POST /telemetry/events validates each submitted event individually against
the unchanged `TelemetryEvent` model, persists every valid event in a
single bulk insert into `telemetry_events`
(supabase/migrations/20261030220000_create_telemetry_events.sql via
app.models.telemetry_storage), and reports back exactly how many of the
submitted events were received, stored, and rejected.

GET /telemetry/report resolves a UTC time window, fetches every telemetry
event in it, and returns technical/operational metrics (volume, latency,
error rates) computed by app.services.telemetry_analysis — see that
module's docstring for metric definitions, units, and empty-data behavior.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from sqlmodel import Session

from app.core import cache
from app.core.database import get_db
from app.core.deps import require_staff
from app.models.telemetry import RawTelemetryEventBatch, TelemetryEvent
from app.models.telemetry_storage import (
    fetch_telemetry_events_dataframe,
    insert_telemetry_event_rows,
    map_telemetry_event_to_row,
)
from app.services.telemetry_analysis import build_report_metrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# ── GET /telemetry/report ────────────────────────────────────────────────
#
# Cache: process-local, in-memory (app.core.cache — the same TTL cache used
# by GET /incidents/metrics), 60s TTL. Keyed by the *resolved* UTC
# start/end — two requests that both omit start_date/end_date resolve
# `now` independently (captured once per request, never rounded), so they
# naturally land on different keys and do NOT share a cache entry; this is
# intentional (see module/task notes) and means the default window has a
# low cache-hit rate by design, while an explicit, repeated (start_date,
# end_date) pair hits the cache immediately on the next call within 60s.
#
# Authorization scope: this endpoint is staff-only (require_staff, same
# gate as GET /incidents/metrics). telemetry_events carries no per-user or
# per-tenant column and the query below applies no user-specific filter,
# so the accessible dataset is identical for every caller who passes
# require_staff — there is no narrower scope to key the cache by. If a
# tenant/location dimension is ever added to telemetry_events and this
# report starts filtering by it, that scope must be added to
# `_build_report_cache_key` so cached reports cannot cross that boundary.
#
# A cache hit returns the stored report without touching the database or
# recomputing any metric. An expired/missing entry triggers one retrieval
# + one metrics computation, cached for the next 60s. The cache is
# bounded in size by `cache.py`'s own eviction (monotonic-clock TTL); this
# endpoint does not add unbounded entries since the key space is just
# (start, end) pairs actually requested.
_REPORT_CACHE_PREFIX = "telemetry:report"
_REPORT_CACHE_TTL_SECONDS = 60
_REPORT_DEFAULT_WINDOW = timedelta(days=7)


def _build_report_cache_key(start_date: datetime, end_date: datetime) -> str:
    return f"{_REPORT_CACHE_PREFIX}:{start_date.isoformat()}:{end_date.isoformat()}"


def _parse_boundary(raw_value: str | None, field_name: str) -> datetime | None:
    """Parse an optional ISO 8601 query param into a UTC, tz-aware datetime.

    Follows the same timestamp policy as the event envelope itself
    (docs/event-envelope.md: ISO 8601/RFC3339 with an explicit zone,
    `TelemetryEvent.timestamp: AwareDatetime`) — no project-wide "naive
    timestamps mean UTC" convention exists, so a naive value here is
    rejected rather than guessed at, same as the ingestion endpoint already
    requires for every stored event.
    """
    if raw_value is None:
        return None
    try:
        parsed = datetime.fromisoformat(raw_value)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {field_name}: must be an ISO 8601 timestamp.",
        )
    if parsed.tzinfo is None:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {field_name}: must include a timezone offset.",
        )
    return parsed.astimezone(timezone.utc)


@router.post("/events")
async def ingest_events(
    batch: RawTelemetryEventBatch,
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """Validate each event independently, persist the valid ones in one
    bulk insert, and report accurate received/stored/rejected counts.

    One malformed element never affects the rest of the batch: the outer
    envelope (`events` must be an array) is the only thing FastAPI
    validates before this function runs — each element is validated here,
    individually, against the unchanged `TelemetryEvent` model.
    """
    received = len(batch.events)

    valid_events: list[TelemetryEvent] = []
    rejected = 0
    for raw_event in batch.events:
        try:
            valid_events.append(TelemetryEvent.model_validate(raw_event))
        except ValidationError:
            rejected += 1

    stored = 0
    if valid_events:
        rows = [map_telemetry_event_to_row(event) for event in valid_events]
        try:
            insert_telemetry_event_rows(db, rows)
        except Exception as exc:
            # Never report events as stored before the database confirms
            # it, and never reclassify a persistence failure as a
            # validation rejection — these events were valid, the *write*
            # failed. Raised as an explicit HTTPException rather than
            # relying on app.main's generic `Exception` handler: that
            # handler was found, while building this endpoint, to not
            # actually intercept bare exceptions raised from a route in
            # this FastAPI/Starlette version (reproduced with a minimal
            # standalone app) — a pre-existing issue unrelated to
            # telemetry, out of scope to fix here, but this endpoint
            # shouldn't depend on a mechanism confirmed not to work.
            db.rollback()
            logger.exception(
                "Failed to persist telemetry batch (valid_events=%d, event_types=%s)",
                len(rows),
                [event.event_type for event in valid_events],
            )
            raise HTTPException(
                status_code=500,
                detail="Failed to persist telemetry events. Please retry.",
            ) from exc
        stored = len(rows)

    logger.info(
        "Processed telemetry batch: received=%d stored=%d rejected=%d event_types=%s",
        received,
        stored,
        rejected,
        [event.event_type for event in valid_events],
    )
    return {"received": received, "stored": stored, "rejected": rejected}


@router.get("/report")
async def get_telemetry_report(
    start_date: str | None = Query(None, description="ISO 8601, tz-aware. Defaults to now - 7 days."),
    end_date: str | None = Query(None, description="ISO 8601, tz-aware. Defaults to now."),
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
) -> dict:
    """Operational telemetry report: event volume, API latency, and error
    rates over [start_date, end_date).

    The period is resolved once, from a single captured UTC `now`: a
    missing `start_date` becomes `now - 7 days`, a missing `end_date`
    becomes `now`. Both bounds are normalized to UTC and must be tz-aware
    if supplied (see `_parse_boundary`); `start_date >= end_date` is
    rejected. The same resolved boundaries are used for retrieval and every
    metric function — see app.services.telemetry_analysis.
    """
    now = datetime.now(timezone.utc)
    resolved_start = _parse_boundary(start_date, "start_date") or (now - _REPORT_DEFAULT_WINDOW)
    resolved_end = _parse_boundary(end_date, "end_date") or now

    if resolved_start >= resolved_end:
        raise HTTPException(
            status_code=422,
            detail="start_date must be strictly before end_date.",
        )

    cache_key = _build_report_cache_key(resolved_start, resolved_end)
    cached_report = cache.get(cache_key)
    if cached_report is not None:
        return cached_report

    events_df = fetch_telemetry_events_dataframe(db, resolved_start, resolved_end)
    metrics = build_report_metrics(events_df, resolved_start, resolved_end)

    report = {
        "period": {
            "from": resolved_start.isoformat(),
            "to": resolved_end.isoformat(),
        },
        "metrics": metrics,
    }
    cache.set(cache_key, report, _REPORT_CACHE_TTL_SECONDS)
    return report
