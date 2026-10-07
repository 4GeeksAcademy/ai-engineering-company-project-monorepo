"""Assemble ``GET /telemetry/report`` and cache it for 60 seconds.

The endpoint resolves ``start_date`` / ``end_date`` once and passes that pair
into every metric. Metric functions do not choose their own default window.

When the query omits both dates, the window is the last 7 days ending at the
current UTC minute. That resolved pair is remembered for ``TTL_SECONDS`` so a
repeat request inside the TTL reuses the same cache key even if the clock
crosses a minute.
"""

from __future__ import annotations

import copy
import threading
import time
from datetime import datetime, timedelta, timezone

from services.telemetry import analysis

TTL_SECONDS = 60

_lock = threading.Lock()
_cache: dict[tuple[str, str], tuple[float, dict]] = {}
_default_slot: tuple[float, datetime, datetime] | None = None


class InvalidPeriod(ValueError):
    """``start_date`` / ``end_date`` could not be resolved."""


def _clock() -> float:
    return time.monotonic()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _stamp(value: datetime) -> str:
    current = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
    return current.strftime("%Y-%m-%dT%H:%M:%SZ")


def clear_report_cache() -> None:
    """Drop cached reports and the remembered default window. Tests only."""
    global _default_slot
    with _lock:
        _cache.clear()
        _default_slot = None


def default_window(now: datetime | None = None) -> tuple[datetime, datetime]:
    """Last 7 days, UTC, end rounded down to the minute, stable for ``TTL_SECONDS``."""
    global _default_slot
    tick = _clock()
    with _lock:
        if _default_slot is not None and tick - _default_slot[0] < TTL_SECONDS:
            return _default_slot[1], _default_slot[2]
    current = _utcnow() if now is None else now
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    else:
        current = current.astimezone(timezone.utc)
    rounded = current.replace(second=0, microsecond=0)
    start = rounded - timedelta(days=7)
    end = rounded
    with _lock:
        # Another request may have stored a window while we rounded.
        if _default_slot is not None and tick - _default_slot[0] < TTL_SECONDS:
            return _default_slot[1], _default_slot[2]
        _default_slot = (tick, start, end)
    return start, end


def _parse_iso(value: str, name: str) -> datetime:
    text = value.strip()
    if not text:
        raise InvalidPeriod(name + " must be an ISO 8601 timestamp")
    if text.endswith("Z") or text.endswith("z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as error:
        raise InvalidPeriod(name + " must be an ISO 8601 timestamp") from error
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def resolve_period(start_date: str | None, end_date: str | None) -> tuple[datetime, datetime]:
    """One window for every metric. Omitted dates default to the last 7 UTC days."""
    if start_date is None and end_date is None:
        return default_window()
    if start_date is None or end_date is None:
        raise InvalidPeriod("start_date and end_date must be provided together")
    start = _parse_iso(start_date, "start_date")
    end = _parse_iso(end_date, "end_date")
    if end <= start:
        raise InvalidPeriod("end_date must be after start_date")
    return start, end


def build_report(start: datetime, end: datetime) -> dict:
    """Call each metric with the same resolved period. No cache here."""
    return {
        "period": {"from": _stamp(start), "to": _stamp(end)},
        "metrics": {
            "events_per_day": analysis.events_per_day(start, end),
            "error_rate_by_type": analysis.error_rate_by_type(start, end),
            "latency_by_day": analysis.latency_by_day(start, end),
            "auth_failure_rate": analysis.auth_failure_rate(start, end),
        },
    }


def get_cached_report(start: datetime, end: datetime) -> dict:
    """Return the report for this window, recomputing only after 60 seconds."""
    key = (_stamp(start), _stamp(end))
    now = _clock()
    with _lock:
        found = _cache.get(key)
        if found is not None and now - found[0] < TTL_SECONDS:
            return copy.deepcopy(found[1])
    payload = build_report(start, end)
    with _lock:
        _cache[key] = (_clock(), payload)
    return copy.deepcopy(payload)
