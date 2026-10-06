"""Persist Brasaland telemetry batches.

``POST /telemetry/events`` accepts ``{"events": [...]}``. Each item is validated
on its own with ``TelemetryEvent.model_validate``. Valid rows are inserted in
one bulk request. Invalid items increment ``rejected`` and do not cancel the
batch. The envelope itself must still be a JSON object with an ``events`` array.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ValidationError

from config import TELEMETRY_ENDPOINT
import telemetry_store
from telemetry_schemas import TelemetryEvent

logger = logging.getLogger("brasaland.telemetry")
logger.setLevel(logging.INFO)

router = APIRouter(tags=["telemetry"])


class TelemetryIngestResponse(BaseModel):
    received: int
    stored: int
    rejected: int


def _parse_envelope(raw: bytes) -> list[Any]:
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=422, detail="Telemetry batch must be JSON") from error
    if not isinstance(payload, dict) or not isinstance(payload.get("events"), list):
        raise HTTPException(
            status_code=422,
            detail="Telemetry batch must be a JSON object with an events array",
        )
    return payload["events"]


@router.post("/telemetry/events", response_model=TelemetryIngestResponse)
async def ingest_telemetry_events(request: Request) -> TelemetryIngestResponse:
    """Validate each raw event, bulk-insert the valid ones, and count the rest.

    The body is parsed as JSON regardless of content type so ``navigator.sendBeacon``
    (text/plain) and ``fetch`` (application/json) both work. ``events`` is not
    typed as ``list[TelemetryEvent]``: one invalid item must not 422 the batch.
    """
    events = _parse_envelope(await request.body())
    valid: list[TelemetryEvent] = []
    rejected = 0
    for raw in events:
        try:
            valid.append(TelemetryEvent.model_validate(raw))
        except ValidationError:
            rejected += 1

    received = len(events)
    if valid:
        telemetry_store.insert_telemetry_rows([telemetry_store.event_to_row(event) for event in valid])
    stored = len(valid)

    logger.info(
        "Telemetry received %s event(s) stored=%s rejected=%s via %s",
        received,
        stored,
        rejected,
        TELEMETRY_ENDPOINT,
    )
    for event in valid:
        logger.info("telemetry event_type=%s", event.Event_type)
    return TelemetryIngestResponse(received=received, stored=stored, rejected=rejected)
