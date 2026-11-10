from __future__ import annotations

import json
import logging
import math
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ValidationError, root_validator
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool
from services.api.auth import get_current_user
from services.api.models import Role, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])
report_router = APIRouter(prefix="/telemetry", tags=["telemetry"])
MAX_BATCH_EVENTS = 20
MAX_BATCH_BYTES = 64 * 1024
SCHEMA_VERSION = "1.0.0"

# Event/property allowlists are deliberately explicit and kept aligned with
# docs/telemetry/event-schemas.json.
EVENT_PROPERTIES: dict[str, tuple[set[str], set[str]]] = {
    "inbound_order_created": ({"warehouse", "client_id", "product_id", "product_category", "quantity"}, {"warehouse", "client_id", "product_id", "product_category", "quantity"}),
    "outbound_order_created": ({"warehouse", "client_id", "product_id", "product_category", "quantity"}, {"warehouse", "client_id", "product_id", "product_category", "quantity"}),
    "stock_threshold_triggered": ({"warehouse", "client_id", "product_id", "product_category", "quantity", "minimum_stock"}, {"warehouse", "client_id", "product_id", "product_category", "quantity", "minimum_stock"}),
    "direct_stock_edit_rejected": ({"warehouse", "client_id", "product_id", "product_category", "quantity", "rejection_code"}, {"warehouse", "client_id", "product_id", "product_category", "quantity", "rejection_code"}),
    "inventory_discrepancy_detected": ({"warehouse", "client_id", "product_id", "product_category", "quantity", "system_quantity", "physical_quantity"}, {"warehouse", "client_id", "product_id", "product_category", "quantity", "system_quantity", "physical_quantity"}),
    "inventory_validation_failed": ({"operation", "validation_code", "warehouse", "product_id"}, {"operation", "validation_code", "warehouse", "product_id", "product_category"}),
    "inventory_products_viewed": (set(), {"warehouse", "product_category", "result_count"}),
    "login_succeeded": (set(), {"auth_method"}),
    "login_failed": ({"reason"}, {"reason"}),
    "session_expired": ({"reason"}, {"reason"}),
    "navigation_page_viewed": ({"route"}, {"route"}),
    "flow_abandoned": ({"flow", "last_step"}, {"flow", "last_step"}),
    "api_latency_recorded": ({"route", "method", "status_code", "duration_ms"}, {"route", "method", "status_code", "duration_ms"}),
    "frontend_error_captured": ({"error_kind", "error_code", "route"}, {"error_kind", "error_code", "route"}),
    "web_vital_recorded": ({"metric_name", "value", "route"}, {"metric_name", "value", "route"}),
    "supplier_action_completed": ({"action", "result"}, {"action", "result"}),
    "incident_action_completed": ({"action", "result"}, {"action", "result"}),
}

ROUTES = {"/", "/inventory/products", "/inventory/orders", "/inventory/orders/inbound", "/inventory/orders/outbound", "/suppliers", "/incidents", "/incident-file-analyzer", "/account/profile"}
API_ROUTES = {"/auth/login", "/auth/me", "/users", "/profiles/me", "/inventory/products", "/inventory/orders", "/suppliers", "/api/incidents"}
API_METHODS = {"GET", "POST", "PATCH", "DELETE"}
ENUMS: dict[tuple[str, str], set[str]] = {
    ("*", "warehouse"): {"los_angeles", "zaragoza"},
    ("*", "product_category"): {"fashion", "electronics", "cosmetics"},
    ("inventory_validation_failed", "operation"): {"inbound", "outbound", "product"},
    ("inventory_validation_failed", "validation_code"): {"quantity_invalid", "sku_unknown", "warehouse_mismatch", "insufficient_stock", "missing_tracking_number", "duplicate_sku", "required_field_missing"},
    ("login_succeeded", "auth_method"): {"password"},
    ("login_failed", "reason"): {"invalid_credentials", "network_error", "rate_limited"},
    ("session_expired", "reason"): {"unauthorized_response"},
    ("flow_abandoned", "flow"): {"inbound_order", "outbound_order", "supplier_create", "incident_create"},
    ("flow_abandoned", "last_step"): {"form_opened", "form_started", "validation_failed", "submission_started"},
    ("api_latency_recorded", "method"): {"GET", "POST", "PATCH", "DELETE"},
    ("frontend_error_captured", "error_kind"): {"window_error", "unhandled_rejection", "render_error"},
    ("web_vital_recorded", "metric_name"): {"CLS", "FCP", "INP", "LCP", "TTFB"},
    ("supplier_action_completed", "action"): {"created", "rate_updated", "status_updated", "deleted"},
    ("incident_action_completed", "action"): {"created", "status_updated"},
    ("*", "result"): {"success", "failure"},
}


def _validate_properties(event_type: str, properties: Any) -> None:
    if event_type not in EVENT_PROPERTIES or not isinstance(properties, dict):
        raise ValueError("Invalid telemetry event.")
    required, allowed = EVENT_PROPERTIES[event_type]
    if not required.issubset(properties) or not set(properties).issubset(allowed):
        raise ValueError("Invalid telemetry event.")

    for key, value in properties.items():
        nullable_validation_field = (
            event_type == "inventory_validation_failed"
            and key in {"warehouse", "product_id", "product_category"}
            and value is None
        )
        if nullable_validation_field:
            continue
        choices = ENUMS.get((event_type, key), ENUMS.get(("*", key)))
        if choices and (not isinstance(value, str) or value not in choices):
            raise ValueError("Invalid telemetry event.")
        if key in {"client_id", "product_id"} and (
            not isinstance(value, str) or len(value) > 128 or not re.fullmatch(r"[a-zA-Z0-9._-]+", value)
        ):
            raise ValueError("Invalid telemetry event.")
        if key == "error_code" and (not isinstance(value, str) or len(value) > 80 or not re.fullmatch(r"[A-Z0-9_]+", value)):
            raise ValueError("Invalid telemetry event.")
        if key in {"route"} and value not in (ROUTES if event_type != "api_latency_recorded" else API_ROUTES):
            raise ValueError("Invalid telemetry event.")
        if key in {"quantity", "minimum_stock", "system_quantity", "physical_quantity", "result_count", "status_code"}:
            low, high = (100, 599) if key == "status_code" else (0, None)
            if type(value) is not int or value < low or (high is not None and value > high):
                raise ValueError("Invalid telemetry event.")
        if key == "duration_ms" or key == "value":
            if (
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or not math.isfinite(value)
                or value < 0
            ):
                raise ValueError("Invalid telemetry event.")
    if event_type in {"inbound_order_created", "outbound_order_created"} and properties["quantity"] < 1:
        raise ValueError("Invalid telemetry event.")
    if event_type == "inventory_discrepancy_detected":
        if properties["quantity"] < 1 or abs(properties["physical_quantity"] - properties["system_quantity"]) != properties["quantity"]:
            raise ValueError("Invalid telemetry event.")


class TelemetryEvent(BaseModel):
    eventId: UUID
    timestamp: datetime
    sessionId: UUID | None
    userId: UUID | None
    event_type: str
    schemaVersion: str
    requestId: UUID
    properties: dict[str, Any]

    class Config:
        extra = "forbid"

    @root_validator
    def validate_contract(cls, values: dict[str, Any]) -> dict[str, Any]:
        if values.get("schemaVersion") != SCHEMA_VERSION:
            raise ValueError("Invalid telemetry event.")
        timestamp = values.get("timestamp")
        if timestamp is not None and (timestamp.tzinfo is None or timestamp.utcoffset() is None):
            raise ValueError("Invalid telemetry event.")
        _validate_properties(values.get("event_type", ""), values.get("properties"))
        return values


def telemetry_enabled() -> bool:
    return os.getenv("TELEMETRY_ENABLED", "true").strip().lower() not in {"0", "false", "no", "off"}


def canonical_api_route(route_path: str) -> str | None:
    for allowed_route in sorted(API_ROUTES, key=len, reverse=True):
        if route_path == allowed_route or route_path.startswith(f"{allowed_route}/"):
            return allowed_route
    return None


def _storage_rows(events: list[TelemetryEvent]) -> list[dict[str, Any]]:
    return [
        {
            "event_id": str(event.eventId),
            "event_type": event.event_type,
            "event_timestamp": event.timestamp,
            "session_id": str(event.sessionId) if event.sessionId else None,
            "user_id": str(event.userId) if event.userId else None,
            "schema_version": event.schemaVersion,
            "request_id": str(event.requestId),
            "properties": json.dumps(event.properties, allow_nan=False),
        }
        for event in events
    ]


def persist_events(events: list[TelemetryEvent]) -> int:
    """Insert a validated batch in one transaction and one bulk SQL statement."""
    if not events:
        return 0

    from services.api.telemetry_database import get_telemetry_engine

    engine = get_telemetry_engine()

    rows = _storage_rows(events)
    columns = (
        "event_id", "event_type", "event_timestamp", "session_id", "user_id",
        "schema_version", "request_id", "properties",
    )
    value_groups: list[str] = []
    parameters: dict[str, Any] = {}
    for index, row in enumerate(rows):
        placeholders = []
        for column in columns:
            name = f"{column}_{index}"
            parameters[name] = row[column]
            placeholders.append(
                f"CAST(:{name} AS jsonb)" if column == "properties" else f":{name}"
            )
        value_groups.append(f"({', '.join(placeholders)})")

    statement = text(
        "INSERT INTO public.telemetry_events "
        "(event_id, event_type, event_timestamp, session_id, user_id, "
        "schema_version, request_id, properties) VALUES "
        + ", ".join(value_groups)
        + " ON CONFLICT (event_id) DO NOTHING RETURNING event_id"
    )
    with engine.begin() as connection:
        inserted = connection.execute(statement, parameters).fetchall()
    return len(inserted)


def record_server_event(event_type: str, properties: dict[str, Any]) -> None:
    """Persist a validated server event without failing the business request."""
    if not telemetry_enabled() or not os.getenv("TELEMETRY_DATABASE_URL", "").strip():
        return
    try:
        event = TelemetryEvent(
            eventId=uuid4(),
            timestamp=datetime.now(timezone.utc),
            sessionId=None,
            userId=None,
            event_type=event_type,
            schemaVersion=SCHEMA_VERSION,
            requestId=uuid4(),
            properties=properties,
        )
        persist_events([event])
    except Exception:
        logger.warning("Server telemetry event could not be stored type=%s", event_type)


@router.post("/events", status_code=status.HTTP_200_OK)
async def capture_telemetry(request: Request) -> dict[str, int]:
    if not telemetry_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    body = await request.body()
    if len(body) > MAX_BATCH_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Telemetry batch is too large.")
    if request.headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/json":
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported media type.")
    try:
        payload = json.loads(body)
        if not isinstance(payload, dict) or not isinstance(payload.get("events"), list) or not 1 <= len(payload["events"]) <= MAX_BATCH_EVENTS:
            raise ValueError("Invalid telemetry batch.")
        raw_events = payload["events"]
    except (json.JSONDecodeError, ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Telemetry batch rejected.") from None

    valid_events: list[TelemetryEvent] = []
    rejected = 0
    for raw_event in raw_events:
        if not isinstance(raw_event, dict):
            rejected += 1
            continue
        try:
            # parse_obj is Pydantic v1's equivalent of model_validate.
            valid_events.append(TelemetryEvent.parse_obj(raw_event))
        except (ValidationError, ValueError, TypeError):
            rejected += 1

    try:
        stored = await run_in_threadpool(persist_events, valid_events)
    except Exception:
        logger.error("Telemetry persistence failed received=%d valid=%d", len(raw_events), len(valid_events))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telemetry batch could not be stored.",
        ) from None

    rejected += len(valid_events) - stored
    logger.info("Telemetry batch processed received=%d stored=%d rejected=%d", len(raw_events), stored, rejected)
    return {"received": len(raw_events), "stored": stored, "rejected": rejected}


def _parse_report_date(value: str | None, default: datetime) -> datetime:
    if value is None:
        return default
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=422, detail="Report dates must be ISO-8601 datetimes.") from None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise HTTPException(status_code=422, detail="Report dates must include a timezone.")
    return parsed.astimezone(timezone.utc)


@router.get("/report")
@report_router.get("/report")
def telemetry_report(
    start: str | None = Query(default=None, alias="from"),
    end: str | None = Query(default=None, alias="to"),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return manager-only operational telemetry metrics for a UTC period."""
    if current_user.role not in {Role.ADMIN, Role.MANAGER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    period_end = _parse_report_date(
        end, datetime.now(timezone.utc).replace(second=0, microsecond=0)
    )
    period_start = _parse_report_date(start, period_end - timedelta(days=7))
    if period_start >= period_end:
        raise HTTPException(status_code=422, detail="Report start must be before report end.")

    from services.telemetry.analysis import build_technical_report

    return {
        "period": {"from": period_start.isoformat(), "to": period_end.isoformat()},
        "metrics": build_technical_report(period_start, period_end),
    }
