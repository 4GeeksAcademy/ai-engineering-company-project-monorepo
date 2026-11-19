"""Bounded telemetry queries and operational report metrics."""

from __future__ import annotations

from datetime import datetime
import json
from typing import Any

import pandas as pd
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


def _properties_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _frame(event_types: tuple[str, ...], start: datetime, end: datetime) -> pd.DataFrame:
    frame = pd.DataFrame.from_records(_read_events(event_types, start, end))
    if frame.empty:
        return pd.DataFrame(columns=["event_type", "event_timestamp", "properties", "day"])

    frame["event_timestamp"] = pd.to_datetime(frame["event_timestamp"], utc=True, errors="coerce")
    frame = frame.dropna(subset=["event_timestamp"]).copy()
    frame["day"] = frame["event_timestamp"].dt.strftime("%Y-%m-%d")
    frame["properties"] = frame["properties"].map(_properties_dict)
    return frame


def events_per_day(start: datetime, end: datetime) -> list[dict[str, Any]]:
    """Count event volume per UTC day to reveal activity or ingestion gaps."""
    frame = _frame(ALL_EVENT_TYPES, start, end)
    if frame.empty:
        return []
    grouped = frame.groupby("day").size().reset_index(name="event_count")
    return [
        {"day": str(row.day), "event_count": int(row.event_count)}
        for row in grouped.itertuples(index=False)
    ]


def api_error_rate_by_day(start: datetime, end: datetime) -> list[dict[str, Any]]:
    """Measure daily API failure ratio to flag reliability regressions."""
    frame = _frame(("api_latency_recorded",), start, end)
    if frame.empty:
        return []
    frame["status_code"] = frame["properties"].map(
        lambda properties: pd.to_numeric(properties.get("status_code"), errors="coerce")
    )
    frame = frame.dropna(subset=["status_code"])
    if frame.empty:
        return []
    frame["is_error"] = frame["status_code"] >= 400
    grouped = frame.groupby("day").agg(
        request_count=("is_error", "size"),
        error_count=("is_error", "sum"),
    ).reset_index()
    grouped["error_rate"] = (grouped["error_count"] / grouped["request_count"]).round(6)
    return [
        {
            "day": str(row.day),
            "request_count": int(row.request_count),
            "error_count": int(row.error_count),
            "error_rate": float(row.error_rate),
        }
        for row in grouped.itertuples(index=False)
    ]


def api_latency_by_day_route(start: datetime, end: datetime) -> list[dict[str, Any]]:
    """Report mean and p95 latency by safe route to identify slow endpoints."""
    from services.api.telemetry import API_ROUTES

    frame = _frame(("api_latency_recorded",), start, end)
    if frame.empty:
        return []
    frame["route"] = frame["properties"].map(lambda properties: properties.get("route"))
    frame["duration_ms"] = frame["properties"].map(
        lambda properties: pd.to_numeric(properties.get("duration_ms"), errors="coerce")
    )
    frame = frame[
        frame["route"].isin(API_ROUTES)
        & frame["duration_ms"].notna()
        & (frame["duration_ms"] >= 0)
    ]
    if frame.empty:
        return []
    grouped = frame.groupby(["day", "route"])["duration_ms"].agg(
        request_count="size",
        mean_duration_ms="mean",
        p95_duration_ms=lambda values: values.quantile(0.95),
    ).reset_index()
    return [
        {
            "day": str(row.day),
            "route": row.route,
            "request_count": int(row.request_count),
            "mean_duration_ms": round(float(row.mean_duration_ms), 3),
            "p95_duration_ms": round(float(row.p95_duration_ms), 3),
        }
        for row in grouped.itertuples(index=False)
    ]


def build_technical_report(start: datetime, end: datetime) -> dict[str, list[dict[str, Any]]]:
    return {
        "events_per_day": events_per_day(start, end),
        "api_error_rate_by_day": api_error_rate_by_day(start, end),
        "api_latency_by_day_route": api_latency_by_day_route(start, end),
    }
