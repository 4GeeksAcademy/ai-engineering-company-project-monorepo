"""Bounded telemetry queries and operational report metrics."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
from typing import Any

from sqlalchemy import bindparam, text


ALL_EVENT_TYPES = (
    "inbound_order_created",
    "outbound_order_created",
    "stock_threshold_triggered",
    "direct_stock_edit_rejected",
    "inventory_discrepancy_detected",
    "inventory_validation_failed",
    "inventory_products_viewed",
    "login_succeeded",
    "login_failed",
    "session_expired",
    "navigation_page_viewed",
    "flow_abandoned",
    "api_latency_recorded",
    "frontend_error_captured",
    "web_vital_recorded",
    "supplier_action_completed",
    "incident_action_completed",
)


def _read_events(
    event_types: tuple[str, ...], start: datetime, end: datetime
) -> list[dict[str, Any]]:
    """Select only allowed event types within the half-open UTC period."""
    from services.api.telemetry_database import get_telemetry_engine

    statement = text(
        "SELECT event_type, event_timestamp, properties "
        "FROM public.telemetry_events "
        "WHERE event_timestamp >= :start AND event_timestamp < :end "
        "AND event_type IN :event_types"
    ).bindparams(bindparam("event_types", expanding=True))
    with get_telemetry_engine().connect() as connection:
        rows = connection.execute(
            statement,
            {"start": start, "end": end, "event_types": event_types},
        ).mappings().all()
    return [dict(row) for row in rows]


def _event_day(value: Any) -> str | None:
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None or value.utcoffset() is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%Y-%m-%d")


def _properties(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def _percentile(values: list[float], percentile: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = position - lower
    return ordered[lower] + (ordered[upper] - ordered[lower]) * fraction


def events_per_day(start: datetime, end: datetime) -> list[dict[str, Any]]:
    """Count event volume per UTC day to reveal activity or ingestion gaps."""
    counts: Counter[str] = Counter()
    for event in _read_events(ALL_EVENT_TYPES, start, end):
        day = _event_day(event.get("event_timestamp"))
        if day is not None:
            counts[day] += 1
    return [{"day": day, "event_count": count} for day, count in sorted(counts.items())]


def api_error_rate_by_day(start: datetime, end: datetime) -> list[dict[str, Any]]:
    """Measure daily API failure ratio to flag reliability regressions."""
    counts: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for event in _read_events(("api_latency_recorded",), start, end):
        day = _event_day(event.get("event_timestamp"))
        status_code = _number(_properties(event.get("properties")).get("status_code"))
        if day is None or status_code is None:
            continue
        counts[day][0] += 1
        counts[day][1] += int(status_code >= 400)
    return [
        {
            "day": day,
            "request_count": requests,
            "error_count": errors,
            "error_rate": round(errors / requests, 6),
        }
        for day, (requests, errors) in sorted(counts.items())
        if requests
    ]


def api_latency_by_day_route(start: datetime, end: datetime) -> list[dict[str, Any]]:
    """Report mean and p95 latency by safe route to identify slow endpoints."""
    from services.api.telemetry import API_ROUTES

    samples: dict[tuple[str, str], list[float]] = defaultdict(list)
    for event in _read_events(("api_latency_recorded",), start, end):
        day = _event_day(event.get("event_timestamp"))
        properties = _properties(event.get("properties"))
        route = properties.get("route")
        duration = _number(properties.get("duration_ms"))
        if day is None or route not in API_ROUTES or duration is None or duration < 0:
            continue
        samples[(day, route)].append(duration)
    results = []
    for (day, route), durations in sorted(samples.items()):
        results.append({
            "day": day,
            "route": route,
            "request_count": len(durations),
            "mean_duration_ms": round(sum(durations) / len(durations), 3),
            "p95_duration_ms": round(_percentile(durations, 0.95), 3),
        })
    return results


def build_technical_report(start: datetime, end: datetime) -> dict[str, list[dict[str, Any]]]:
    return {
        "events_per_day": events_per_day(start, end),
        "api_error_rate_by_day": api_error_rate_by_day(start, end),
        "api_latency_by_day_route": api_latency_by_day_route(start, end),
    }
