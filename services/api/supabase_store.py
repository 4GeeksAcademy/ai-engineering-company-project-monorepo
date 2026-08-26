"""Live Supabase reads for Brasaland dashboard endpoints."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from dotenv import load_dotenv
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")

PAGE_SIZE = 1000
KPI_COLUMNS = (
    "location_id,country,currency,total_purchase_cost,total_waste_cost,"
    "waste_ratio,stockout_events_count,price_alert_events_count,week_start"
)


class LiveUnavailable(RuntimeError):
    """Supabase is not configured or the query failed."""


@lru_cache(maxsize=1)
def get_client():
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_KEY") or "").strip()
    if not url or not key:
        return None
    from supabase import create_client

    return create_client(url, key)


def use_seed_source() -> bool:
    return (os.environ.get("DASHBOARD_SOURCE") or "").strip().lower() == "seed"


def _iso(value: Any) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat().replace("+00:00", "Z")
    text = str(value)
    return text.replace("+00:00", "Z")


def fetch_weekly_performance(week_start: str | None) -> dict[str, Any]:
    client = get_client()
    if client is None:
        raise LiveUnavailable("Supabase credentials are not configured")
    try:
        query = client.table("weekly_location_performance").select(KPI_COLUMNS)
        if week_start:
            query = query.eq("week_start", week_start)
        response = query.order("week_start", desc=True).execute()
    except Exception as error:
        raise LiveUnavailable(str(error)) from error
    rows = response.data or []
    actual_week = week_start
    if rows:
        actual_week = week_start or _iso(rows[0].get("week_start"))[:10]
    locations = []
    for row in rows:
        row_week = _iso(row.get("week_start"))[:10]
        if actual_week and row_week != actual_week:
            continue
        locations.append(
            {
                "location_id": row.get("location_id"),
                "country": row.get("country"),
                "total_purchase_cost": row.get("total_purchase_cost"),
                "total_waste_cost": row.get("total_waste_cost"),
                "waste_ratio": row.get("waste_ratio"),
                "stockout_events_count": row.get("stockout_events_count"),
                "price_alert_events_count": row.get("price_alert_events_count"),
                "currency": row.get("currency"),
            }
        )
    return {"week_start": actual_week, "locations": locations, "source": "supabase"}


def _fetch_telemetry_page(client: Any, time_column: str, start_iso: str, end_iso: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start = 0
    while True:
        response = (
            client.table("telemetry_events")
            .select("*")
            .gte(time_column, start_iso)
            .lt(time_column, end_iso)
            .order(time_column)
            .range(start, start + PAGE_SIZE - 1)
            .execute()
        )
        chunk = response.data or []
        rows.extend(chunk)
        if len(chunk) < PAGE_SIZE:
            return rows
        start += PAGE_SIZE


def fetch_telemetry_events(start_iso: str, end_iso: str) -> list[dict[str, Any]]:
    client = get_client()
    if client is None:
        raise LiveUnavailable("Supabase credentials are not configured")
    last_error: Exception | None = None
    raw: list[dict[str, Any]] = []
    for column in ("timestamp", "created_at"):
        try:
            raw = _fetch_telemetry_page(client, column, start_iso, end_iso)
            last_error = None
            break
        except Exception as error:  # PostgREST missing-column or network
            last_error = error
    if last_error is not None:
        raise LiveUnavailable(str(last_error)) from last_error
    events = []
    for row in raw:
        timestamp = row.get("timestamp") or row.get("created_at")
        events.append(
            {
                "id": row.get("id"),
                "timestamp": _iso(timestamp),
                "event_type": row.get("event_type") or "",
                "tags": row.get("tags") or {},
            }
        )
    return events


def insert_telemetry_event(event: dict[str, Any]) -> None:
    client = get_client()
    if client is None:
        raise LiveUnavailable("Supabase credentials are not configured")
    payload = {
        "event_type": event["event_type"],
        "timestamp": event["timestamp"],
        "created_at": event["timestamp"],
        "tags": event.get("tags") or {},
    }
    try:
        client.table("telemetry_events").insert(payload).execute()
    except Exception as error:
        raise LiveUnavailable(str(error)) from error
