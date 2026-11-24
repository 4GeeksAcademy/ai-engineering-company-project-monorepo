"""Pydantic models of the telemetry intake (POST /telemetry/events).

`TelemetryEvent` is the standard event envelope of docs/telemetry/telemetry-plan.md (section 2.0),
unchanged: Phase 3 reuses it as is. It validates the *envelope* only. `properties` is an open
object here; checking each event_type's property allowlist (docs/telemetry/event-schemas.json)
and persisting the event is Phase 3 work.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

UUID_V4 = r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"

# One browser flush is at most ~20 events plus retries; this only stops absurd payloads.
MAX_EVENTS_PER_BATCH = 100


class TelemetryEvent(BaseModel):
    """Envelope shared by the 30 events of the plan. Field names are the plan's, camelCase included."""

    model_config = ConfigDict(extra="forbid")

    eventId: Annotated[str, StringConstraints(pattern=UUID_V4)]
    """UUID v4 made at the source; the idempotency key."""
    timestamp: Annotated[str, StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")]
    """When the event happened (ISO 8601 UTC, milliseconds), not when it was sent."""
    sessionId: Annotated[str, StringConstraints(pattern=r"^([0-9a-f-]{36}|none)$")]
    userId: Annotated[str, StringConstraints(min_length=1, max_length=64)]
    """`sub` of the JWT, or "anonymous" without a session. Never an email or a name."""
    event_type: Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9]*(_[a-z0-9]+)+$", max_length=64)]
    schemaVersion: Annotated[str, StringConstraints(pattern=r"^\d+\.\d+\.\d+$")]
    requestId: Annotated[str, StringConstraints(pattern=UUID_V4)]
    source: Literal["frontend", "backend"]
    properties: dict[str, Any]


class TelemetryBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    events: Annotated[list[TelemetryEvent], Field(min_length=1, max_length=MAX_EVENTS_PER_BATCH)]


class TelemetryReceipt(BaseModel):
    received: int
