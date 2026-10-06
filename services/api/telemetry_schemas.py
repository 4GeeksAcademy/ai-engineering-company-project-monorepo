"""Standard telemetry envelope from the approved Phase 1 plan.

JSON keys match ``docs/telemetry/telemetry-plan.md`` (Phase 2 — Event envelope).
Casing is part of the contract: ``eventID``, ``sessionID``, ``UserID``,
``Event_type``, ``SchemaVersion``, ``requestID``, plus ``source`` and ``tags``.
This model is the one Phase 3 persistence should reuse.
"""

from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

_UUID = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
_TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
_USER_ID = re.compile(r"^[0-9]+$")


class TelemetryTags(BaseModel):
    """Copy of source and location facts. Built by the emitter, not by hand in the UI."""

    model_config = ConfigDict(extra="forbid")

    source: str = Field(min_length=1)
    location_scope: Literal["chain", "location", "none"]
    location_id: str | None = None
    country: str | None = None
    currency: str | None = None


class TelemetryEvent(BaseModel):
    """Full standard envelope. Event-specific fields live only in ``properties``."""

    model_config = ConfigDict(extra="forbid")

    eventID: str
    timestamp: str
    sessionID: str | None
    UserID: str | None
    Event_type: str = Field(min_length=1)
    SchemaVersion: Literal[1]
    requestID: str
    source: str = Field(min_length=1)
    tags: TelemetryTags
    properties: dict[str, Any]

    @field_validator("eventID", "requestID")
    @classmethod
    def uuid_field(cls, value: str) -> str:
        if not _UUID.fullmatch(value):
            raise ValueError("must be a UUID")
        return value

    @field_validator("timestamp")
    @classmethod
    def utc_timestamp(cls, value: str) -> str:
        if not _TIMESTAMP.fullmatch(value):
            raise ValueError("must be ISO 8601 UTC without milliseconds")
        return value

    @field_validator("sessionID")
    @classmethod
    def session_uuid(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not _UUID.fullmatch(value):
            raise ValueError("sessionID must be a UUID or null")
        return value

    @field_validator("UserID")
    @classmethod
    def staff_user_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not _USER_ID.fullmatch(value):
            raise ValueError("UserID must be a decimal users.id or null")
        return value


class TelemetryBatch(BaseModel):
    """Body accepted by POST /telemetry/events."""

    model_config = ConfigDict(extra="forbid")

    events: list[TelemetryEvent]


class TelemetryBatchResponse(BaseModel):
    received: int
