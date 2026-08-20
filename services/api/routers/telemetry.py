"""Engineering telemetry report for the Brasaland backoffice dashboard."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from dashboard_seed import auth_failure_rate, error_rate_by_type, events_per_day, telemetry_events
from fastapi import APIRouter, Query
from supabase_store import LiveUnavailable, fetch_telemetry_events, use_seed_source

router = APIRouter(tags=["telemetry"])


def _parse_bound(value: str | None, default: datetime) -> datetime:
    if not value:
        return default
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _iso(moment: datetime) -> str:
    return moment.isoformat().replace("+00:00", "Z")


@router.get("/telemetry/report")
def get_telemetry_report(
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
) -> dict:
    now = datetime.now(timezone.utc)
    start = _parse_bound(start_date, now - timedelta(days=7))
    end = _parse_bound(end_date, now)
    source = "seed"
    source_error: str | None = None
    events = telemetry_events(start, end)
    if not use_seed_source():
        try:
            events = fetch_telemetry_events(_iso(start), _iso(end))
            source = "supabase"
        except LiveUnavailable as error:
            source_error = str(error)
        except Exception as error:
            source_error = str(error)
    payload = {
        "period": {"from": _iso(start), "to": _iso(end)},
        "source": source,
        "metrics": {
            "events_per_day": events_per_day(events),
            "error_rate_by_type": error_rate_by_type(events),
            "auth_failure_rate": auth_failure_rate(events),
        },
    }
    if source_error:
        payload["source_error"] = source_error
    return payload
