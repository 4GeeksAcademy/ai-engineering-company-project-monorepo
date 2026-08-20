"""Local dashboard seed so KPI and telemetry UIs work without Supabase."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from tickets import LOCATION_CURRENCY


def current_week_start(now: datetime | None = None) -> str:
    today = (now or datetime.now(timezone.utc)).date()
    return (today - timedelta(days=today.weekday())).isoformat()


def weekly_location_rows(week_start: str | None = None) -> list[dict]:
    week = week_start or current_week_start()
    rows = [
        {
            "location_id": "miami-downtown",
            "country": "United States",
            "currency": "USD",
            "total_purchase_cost": 18420.50,
            "total_waste_cost": 612.40,
            "waste_ratio": 0.0332,
            "stockout_events_count": 1,
            "price_alert_events_count": 2,
        },
        {
            "location_id": "bogota-norte",
            "country": "Colombia",
            "currency": "COP",
            "total_purchase_cost": 48200000,
            "total_waste_cost": 1450000,
            "waste_ratio": 0.0301,
            "stockout_events_count": 0,
            "price_alert_events_count": 1,
        },
        {
            "location_id": "COL-01",
            "country": "Colombia",
            "currency": "COP",
            "total_purchase_cost": 31500000,
            "total_waste_cost": 1890000,
            "waste_ratio": 0.0600,
            "stockout_events_count": 3,
            "price_alert_events_count": 0,
        },
        {
            "location_id": "COL-02",
            "country": "Colombia",
            "currency": "COP",
            "total_purchase_cost": 27840000,
            "total_waste_cost": 835200,
            "waste_ratio": 0.0300,
            "stockout_events_count": 0,
            "price_alert_events_count": 0,
        },
        {
            "location_id": "COL-03",
            "country": "Colombia",
            "currency": "COP",
            "total_purchase_cost": 22110000,
            "total_waste_cost": 884400,
            "waste_ratio": 0.0400,
            "stockout_events_count": 2,
            "price_alert_events_count": 1,
        },
    ]
    for row in rows:
        row["week_start"] = week
        row["currency"] = LOCATION_CURRENCY[row["location_id"]]
    return rows


def telemetry_events(start: datetime, end: datetime) -> list[dict]:
    events: list[dict] = []
    event_id = 1
    day = start.astimezone(timezone.utc).date()
    last = end.astimezone(timezone.utc).date()
    while day < last:
        base = datetime(day.year, day.month, day.day, 15, 0, tzinfo=timezone.utc)
        for hour in (9, 12, 18):
            events.append(
                {
                    "id": event_id,
                    "timestamp": (base.replace(hour=hour)).isoformat().replace("+00:00", "Z"),
                    "event_type": "page_view",
                    "tags": {"path": "/backoffice/"},
                }
            )
            event_id += 1
        events.append(
            {
                "id": event_id,
                "timestamp": base.replace(hour=10).isoformat().replace("+00:00", "Z"),
                "event_type": "user_login_succeeded",
                "tags": {"username": "mariana"},
            }
        )
        event_id += 1
        events.append(
            {
                "id": event_id,
                "timestamp": base.replace(hour=10, minute=8).isoformat().replace("+00:00", "Z"),
                "event_type": "user_login_succeeded",
                "tags": {"username": "felipe"},
            }
        )
        event_id += 1
        if day.weekday() in {0, 3}:
            events.append(
                {
                    "id": event_id,
                    "timestamp": base.replace(hour=10, minute=4).isoformat().replace("+00:00", "Z"),
                    "event_type": "user_login_failed",
                    "tags": {"username": "unknown"},
                }
            )
            event_id += 1
        if day.weekday() == 1:
            events.append(
                {
                    "id": event_id,
                    "timestamp": base.replace(hour=16).isoformat().replace("+00:00", "Z"),
                    "event_type": "api_error",
                    "tags": {"route": "/reporting/weekly-location-performance"},
                }
            )
            event_id += 1
        day += timedelta(days=1)
    return events


def events_per_day(events: list[dict]) -> list[dict]:
    counts: Counter[str] = Counter(event["timestamp"][:10] for event in events)
    return [{"date": date, "event_count": count} for date, count in sorted(counts.items())]


def error_rate_by_type(events: list[dict]) -> list[dict]:
    counts: Counter[str] = Counter(
        event["event_type"] for event in events if event["event_type"] in {"api_error", "user_login_failed"}
    )
    return [{"event_type": name, "error_count": count} for name, count in sorted(counts.items())]


def auth_failure_rate(events: list[dict]) -> list[dict]:
    by_day: dict[str, dict[str, int]] = {}
    for event in events:
        if event["event_type"] not in {"user_login_succeeded", "user_login_failed"}:
            continue
        day = event["timestamp"][:10]
        bucket = by_day.setdefault(day, {"user_login_succeeded": 0, "user_login_failed": 0})
        bucket[event["event_type"]] += 1
    rows = []
    for day, bucket in sorted(by_day.items()):
        total = bucket["user_login_succeeded"] + bucket["user_login_failed"]
        rate = round(bucket["user_login_failed"] / total, 4) if total else 0.0
        rows.append(
            {
                "date": day,
                "user_login_succeeded": bucket["user_login_succeeded"],
                "user_login_failed": bucket["user_login_failed"],
                "failure_rate": rate,
            }
        )
    return rows
