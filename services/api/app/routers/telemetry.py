"""Telemetry ingestion router.

POST /telemetry/events validates each submitted event individually against
the unchanged `TelemetryEvent` model, persists every valid event in a
single bulk insert into `telemetry_events`
(supabase/migrations/20261030220000_create_telemetry_events.sql via
app.models.telemetry_storage), and reports back exactly how many of the
submitted events were received, stored, and rejected.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlmodel import Session

from app.core.database import get_db
from app.models.telemetry import RawTelemetryEventBatch, TelemetryEvent
from app.models.telemetry_storage import insert_telemetry_event_rows, map_telemetry_event_to_row

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


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
