"""Map a validated telemetry envelope onto one ``public.telemetry_events`` row.

The collector inserts the whole batch with one PostgREST request. Credentials
are read on that request. A missing configuration fails the request; it does
not prevent the API process from starting.
"""

from __future__ import annotations

import json
import logging
import math
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import httpx
from fastapi import HTTPException

from telemetry_schemas import TelemetryEvent

logger = logging.getLogger("brasaland.telemetry")

_REPO_ROOT = Path(__file__).resolve().parents[2]
_ALLOWLIST_PATH = _REPO_ROOT / "docs" / "telemetry" / "property-allowlists.json"

# Envelope ids stay inside tags so later analytics can join without a schema change.
_ENVELOPE_ID_KEYS = ("eventID", "sessionID", "UserID", "requestID", "SchemaVersion")

# CONTEXT.md dimensions. Copied from properties when allowlisted, otherwise from
# the envelope ``tags`` object the emitter already built.
_CONTEXT_KEYS = ("location_scope", "location_id", "country", "currency", "timezone")

# Technical failures. Business events stay ``info`` even when a name contains "rejected".
_ERROR_EVENT_TYPES = frozenset({"api_error_raised", "client_exception_caught"})
_WARN_EVENT_TYPES = frozenset(
    {
        "user_login_failed",
        "session_expired",
        "session_rejected",
        "auth_form_rejected",
        "inventory_validation_failed",
        "direct_stock_edit_rejected",
    }
)

# The plan names one numeric measure for these events. Other numbers stay in tags.
_VALUE_PROPERTY = {
    "api_latency_recorded": "duration_ms",
    "ui_latency_recorded": "duration_ms",
    "inbound_order_created": "cost",
    "outbound_order_created": "cost",
    "stock_waste_registered": "cost",
    "sale_completed": "amount",
    "loyalty_points_redeemed": "points",
    "ingredient_price_variance_detected": "variance_pct",
    "vacancy_filled": "days_to_fill",
    "location_sales_silence_detected": "threshold_minutes",
}

_NOT_CONFIGURED = "Telemetry storage is not configured"
_UNAVAILABLE = "Telemetry storage is unavailable"


@lru_cache(maxsize=1)
def property_allowlists() -> dict[str, frozenset[str]]:
    """Event type → property names ``property-allowlists.json`` permits."""
    try:
        document = json.loads(_ALLOWLIST_PATH.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        logger.warning("telemetry allowlist unreadable: %s", type(error).__name__)
        return {}
    events = document.get("events") if isinstance(document, dict) else None
    if not isinstance(events, list):
        return {}
    allowlists: dict[str, frozenset[str]] = {}
    for entry in events:
        if not isinstance(entry, dict):
            continue
        event_type = entry.get("event_type")
        properties = entry.get("properties")
        if not isinstance(event_type, str) or not isinstance(properties, list):
            continue
        names = [
            item.get("name")
            for item in properties
            if isinstance(item, dict) and isinstance(item.get("name"), str)
        ]
        allowlists[event_type] = frozenset(names)
    return allowlists


def _numeric(value: Any) -> int | float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def _service_name(event: TelemetryEvent) -> str:
    source = event.source.strip() if isinstance(event.source, str) else ""
    return source or "backoffice"


def _level(event: TelemetryEvent) -> str:
    event_type = event.Event_type
    properties = event.properties if isinstance(event.properties, dict) else {}
    if event_type in _ERROR_EVENT_TYPES:
        return "error"
    if event_type == "api_latency_recorded" and properties.get("outcome") in {
        "http_error",
        "network",
        "parse_error",
    }:
        return "warn"
    if event_type == "ui_latency_recorded" and properties.get("outcome") == "error":
        return "warn"
    if event_type == "account_updated" and properties.get("outcome") == "rejected":
        return "warn"
    if event_type in _WARN_EVENT_TYPES:
        return "warn"
    return "info"


def _value(event: TelemetryEvent) -> int | float | None:
    key = _VALUE_PROPERTY.get(event.Event_type)
    if key is None or not isinstance(event.properties, dict):
        return None
    return _numeric(event.properties.get(key))


def _short(value: Any, limit: int = 180) -> str | None:
    if not isinstance(value, str):
        return None
    text = " ".join(value.split())
    if not text:
        return None
    return text[:limit]


def _message(event: TelemetryEvent) -> str | None:
    properties = event.properties if isinstance(event.properties, dict) else {}
    event_type = event.Event_type
    if event_type == "api_error_raised":
        return _short(properties.get("message"))
    if event_type == "client_exception_caught":
        name = _short(properties.get("error_name"), 64)
        path = _short(properties.get("path"), 80)
        if name and path:
            return f"{name} on {path}"
        return name
    if event_type == "user_login_failed":
        reason = _short(properties.get("failure_reason"), 40)
        return f"Sign-in failed ({reason})" if reason else "Sign-in failed"
    if event_type == "api_latency_recorded":
        method = _short(properties.get("method"), 8)
        route = _short(properties.get("route_template"), 80)
        outcome = _short(properties.get("outcome"), 20)
        parts = [part for part in (method, route, outcome) if part]
        return " ".join(parts) or None
    if event_type == "ui_latency_recorded":
        kind = _short(properties.get("kind"), 20)
        name = _short(properties.get("name"), 40)
        outcome = _short(properties.get("outcome"), 20)
        parts = [part for part in (kind, name, outcome) if part]
        return " ".join(parts) or None
    location = _short(properties.get("location_id"), 64)
    if location and event_type in {
        "sale_completed",
        "inbound_order_created",
        "outbound_order_created",
        "stock_waste_registered",
        "location_sales_silence_detected",
    }:
        return f"{event_type} at {location}"
    return None


def stored_tags(event: TelemetryEvent) -> dict[str, Any]:
    """Allowlisted properties, CONTEXT dimensions, and envelope ids."""
    properties = event.properties if isinstance(event.properties, dict) else {}
    allowed = property_allowlists().get(event.Event_type, frozenset())
    tags: dict[str, Any] = {"source": event.tags.source, "location_scope": event.tags.location_scope}
    for key in ("location_id", "country", "currency"):
        value = getattr(event.tags, key)
        if value is not None:
            tags[key] = value
    for key in allowed:
        if key in properties:
            tags[key] = properties[key]
    for key in _CONTEXT_KEYS:
        if key not in tags and key in properties and properties[key] is not None:
            tags[key] = properties[key]
    tags["eventID"] = event.eventID
    tags["sessionID"] = event.sessionID
    tags["UserID"] = event.UserID
    tags["requestID"] = event.requestID
    tags["SchemaVersion"] = event.SchemaVersion
    return tags


def event_to_row(event: TelemetryEvent) -> dict[str, Any]:
    """One ``telemetry_events`` row. ``id`` is left to the database default."""
    row: dict[str, Any] = {
        "timestamp": event.timestamp,
        "service": _service_name(event),
        "event_type": event.Event_type,
        "level": _level(event),
        "value": _value(event),
        "message": _message(event),
        "tags": stored_tags(event),
    }
    return row


def insert_telemetry_rows(rows: list[dict[str, Any]]) -> None:
    """Insert every row in ``rows`` with one PostgREST request.

    Raises HTTP 503 when the service-role configuration is missing or the
    request fails. Does nothing when ``rows`` is empty.
    """
    if not rows:
        return

    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise HTTPException(status_code=503, detail=_NOT_CONFIGURED)

    endpoint = url.rstrip("/") + "/rest/v1/telemetry_events"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    try:
        response = httpx.post(endpoint, headers=headers, json=rows, timeout=10.0)
        response.raise_for_status()
    except httpx.HTTPError as error:
        status = getattr(getattr(error, "response", None), "status_code", None)
        logger.warning("telemetry bulk insert failed status=%s", status)
        raise HTTPException(status_code=503, detail=_UNAVAILABLE) from error
