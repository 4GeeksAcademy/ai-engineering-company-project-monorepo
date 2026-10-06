"""Temporary telemetry ingest stub for frontend capture verification.

Does not persist. Phase 3 replaces this handler with validation plus storage.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import ValidationError

from config import TELEMETRY_ENDPOINT
from telemetry_schemas import TelemetryBatch, TelemetryBatchResponse

logger = logging.getLogger("brasaland.telemetry")
# The process root handler is WARNING. This stub must still print the batch
# count and each Event_type, so the logger itself accepts INFO.
logger.setLevel(logging.INFO)

router = APIRouter(tags=["telemetry"])


@router.post("/telemetry/events", response_model=TelemetryBatchResponse)
async def ingest_telemetry_events(request: Request) -> TelemetryBatchResponse:
    """Validate the envelope, log the count and each Event_type, return received.

    ``TELEMETRY_ENDPOINT`` is read so the backend config pattern exists before
    the stub is swapped for the persistent collector. The body is parsed as
    JSON regardless of content type so ``navigator.sendBeacon`` (text/plain)
    and ``fetch`` (application/json) both work.
    """
    raw = await request.body()
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=422, detail="Telemetry batch must be JSON") from error
    try:
        batch = TelemetryBatch.model_validate(payload)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=json.loads(error.json())) from error

    count = len(batch.events)
    logger.info(
        "Telemetry stub received %s event(s) via %s",
        count,
        TELEMETRY_ENDPOINT,
    )
    for event in batch.events:
        logger.info("telemetry event_type=%s", event.Event_type)
    return TelemetryBatchResponse(received=count)
