"""Telemetry intake. STUB: validates the batch envelope, logs a summary and answers 200.

Nothing is stored. The real endpoint (property allowlists, persistence) replaces the body of
`receive_events` in Phase 3; the path, the request model and the response stay as they are.

No authentication on purpose: events such as `login_failed` happen before there is a token,
and `navigator.sendBeacon` cannot send an Authorization header.
"""

from __future__ import annotations

import logging
from collections import Counter

from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from telemetry_schemas import TelemetryBatch, TelemetryReceipt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.post("/events", response_model=TelemetryReceipt)
async def receive_events(request: Request) -> TelemetryReceipt:
    # The body is parsed here, whatever its Content-Type: the browser sends it as text/plain because a
    # JSON content type makes sendBeacon trigger a CORS preflight, which Chrome drops while the page unloads.
    try:
        batch = TelemetryBatch.model_validate_json(await request.body())
    except ValidationError as error:
        raise RequestValidationError(error.errors(include_url=False, include_context=False, include_input=False)) from error
    # Only the count and the event_type of each event (a validated snake_case name): never properties.
    by_type = Counter(event.event_type for event in batch.events)
    logger.info("telemetry batch: %d events %s", len(batch.events), dict(by_type))
    return TelemetryReceipt(received=len(batch.events))
