"""Technical metrics over ``public.telemetry_events``.

Each metric follows the same order:

    load (SQL) → refine (Pandas) → convert types → group → aggregate

``load_telemetry_events`` is the only database read. PostgREST query parameters
``event_type=in.(...)``, ``timestamp=gte.``, and ``timestamp=lt.`` are compiled
by PostgREST into a SQL ``WHERE`` clause and executed on the database. Python
does not scan ``telemetry_events`` and does not re-apply that window. The
bounds are inclusive start, exclusive end, UTC.

The load function is the injection point for tests: pass ``loader=`` to feed a
DataFrame. Production calls omit it and read Supabase with
``SUPABASE_URL`` and ``SUPABASE_SERVICE_ROLE_KEY`` only.

Metrics answer engineering questions (volume, failures, latency, sign-in
health). They do not compute sales, revenue, or conversion.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Callable, Sequence

import httpx
import pandas as pd

# Technical catalogue present on the live collector. Business facts
# (sale_completed, inbound cost, price variance) stay out of this report.
VOLUME_EVENT_TYPES: tuple[str, ...] = (
    "api_latency_recorded",
    "client_exception_caught",
    "direct_stock_edit_rejected",
    "flow_step_recorded",
    "section_viewed",
    "user_login_failed",
    "user_login_succeeded",
)
LATENCY_EVENT_TYPES: tuple[str, ...] = ("api_latency_recorded",)
AUTH_EVENT_TYPES: tuple[str, ...] = ("user_login_failed", "user_login_succeeded")

Loader = Callable[[Sequence[str], datetime, datetime, Sequence[str]], pd.DataFrame]

_NOT_CONFIGURED = "Telemetry storage is not configured"
_UNAVAILABLE = "Telemetry storage is unavailable"


class TelemetryNotConfigured(RuntimeError):
    """``SUPABASE_URL`` or ``SUPABASE_SERVICE_ROLE_KEY`` is missing."""


class TelemetryUnavailable(RuntimeError):
    """The collector read failed."""


def supabase_configured() -> bool:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    return bool(url and key)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _utc_stamp(value: datetime) -> str:
    return _as_utc(value).strftime("%Y-%m-%dT%H:%M:%SZ")


def _iso_day(value: object) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()  # type: ignore[no-any-return]
    return str(value)


def _tag_text(tags: object, key: str) -> str | None:
    parsed = tags
    if isinstance(parsed, str):
        try:
            parsed = json.loads(parsed)
        except json.JSONDecodeError:
            return None
    if not isinstance(parsed, dict):
        return None
    value = parsed.get(key)
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text or None


def _with_columns(frame: pd.DataFrame, columns: Sequence[str]) -> pd.DataFrame:
    work = frame.copy()
    if "timestamp" in columns and "timestamp" not in work.columns:
        work["timestamp"] = pd.NA
    if "event_type" in columns and "event_type" not in work.columns:
        work["event_type"] = pd.NA
    if "level" in columns and "level" not in work.columns:
        work["level"] = pd.NA
    if "value" in columns and "value" not in work.columns:
        work["value"] = pd.NA
    if "tags" in columns and "tags" not in work.columns:
        work["tags"] = pd.NA
    return work


def _iso_index(grouped: pd.DataFrame) -> pd.DataFrame:
    """Turn the date level into ISO strings while it is still the index."""
    out = grouped.sort_index(kind="mergesort")
    names = tuple(out.index.names)
    if names == ("date",):
        out.index = pd.Index(out.index.map(_iso_day), name="date")
        return out
    if names == ("date", "event_type"):
        out.index = pd.MultiIndex.from_arrays(
            [
                out.index.get_level_values("date").map(_iso_day),
                out.index.get_level_values("event_type"),
            ],
            names=["date", "event_type"],
        )
        return out
    if names == ("date", "endpoint"):
        out.index = pd.MultiIndex.from_arrays(
            [
                out.index.get_level_values("date").map(_iso_day),
                out.index.get_level_values("endpoint"),
            ],
            names=["date", "endpoint"],
        )
        return out
    return out


def _round_float(value: object) -> float:
    return round(float(value), 6)  # type: ignore[arg-type]


def load_telemetry_events(
    event_types: Sequence[str],
    start_date: datetime,
    end_date: datetime,
    columns: Sequence[str] = ("timestamp", "event_type", "level", "value", "tags"),
) -> pd.DataFrame:
    """Load only the rows this metric needs.

    The PostgREST filters below run as SQL on the server:

    - ``event_type=in.(...)`` → ``WHERE event_type IN (...)``
    - ``timestamp=gte.<start>`` → ``WHERE timestamp >= start`` (inclusive, UTC)
    - ``timestamp=lt.<end>`` → ``WHERE timestamp < end`` (exclusive, UTC)

    Nothing in this function filters those columns in Python. A missing
    service-role configuration raises ``TelemetryNotConfigured``.
    """
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise TelemetryNotConfigured(_NOT_CONFIGURED)
    if not event_types:
        return pd.DataFrame(columns=list(columns))

    start = _as_utc(start_date)
    end = _as_utc(end_date)
    endpoint = url.rstrip("/") + "/rest/v1/telemetry_events"
    # Duplicate ``timestamp`` keys are ANDed by PostgREST into one WHERE.
    query = [
        ("select", ",".join(columns)),
        ("event_type", "in.(" + ",".join(event_types) + ")"),
        ("timestamp", "gte." + _utc_stamp(start)),
        ("timestamp", "lt." + _utc_stamp(end)),
        ("order", "timestamp.asc"),
        ("limit", "10000"),
    ]
    headers = {
        "apikey": key,
        "Authorization": "Bearer " + key,
        "Accept": "application/json",
    }
    try:
        response = httpx.get(endpoint, headers=headers, params=query, timeout=10.0)
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise TelemetryUnavailable(_UNAVAILABLE) from error
    if not isinstance(payload, list):
        raise TelemetryUnavailable(_UNAVAILABLE)
    if not payload:
        return pd.DataFrame(columns=list(columns))
    return pd.DataFrame(payload)


def events_per_day(
    start_date: datetime,
    end_date: datetime,
    loader: Loader | None = None,
) -> list[dict]:
    """Which technical events fired, and how often, on each UTC day?"""
    load = load_telemetry_events if loader is None else loader
    # load (SQL): event_type IN technical types, timestamp in [start, end)
    loaded = load(VOLUME_EVENT_TYPES, start_date, end_date, ("timestamp", "event_type"))
    # refine (Pandas): drop rows with a null event_type dimension
    refined = _with_columns(loaded, ("timestamp", "event_type")).loc[:, ["timestamp", "event_type"]]
    refined = refined.dropna(subset=["event_type"])
    refined = refined.loc[
        refined["event_type"].map(lambda value: isinstance(value, str) and bool(value.strip()))
    ]
    # convert types before any groupby — string timestamps would group wrong
    refined["timestamp"] = pd.to_datetime(refined["timestamp"], utc=True)
    refined = refined.dropna(subset=["timestamp"])
    refined["date"] = refined["timestamp"].dt.date
    if refined.empty:
        return []
    # group + aggregate
    grouped = refined.groupby(["date", "event_type"], sort=True).size().to_frame(name="events")
    grouped["events"] = grouped["events"].map(int)
    grouped = _iso_index(grouped)
    return grouped.reset_index().to_dict(orient="records")


def error_rate_by_type(
    start_date: datetime,
    end_date: datetime,
    loader: Loader | None = None,
) -> list[dict]:
    """What share of each technical event type was warn or error, per UTC day?

    The denominator is every loaded row of that type that day (info included).
    Both levels are loaded together with ``event_type IN (...)`` in SQL.
    """
    load = load_telemetry_events if loader is None else loader
    # load (SQL)
    loaded = load(
        VOLUME_EVENT_TYPES,
        start_date,
        end_date,
        ("timestamp", "event_type", "level"),
    )
    # refine (Pandas): null event_type is not a dimension; null level is not a failure
    refined = _with_columns(loaded, ("timestamp", "event_type", "level")).loc[
        :, ["timestamp", "event_type", "level"]
    ]
    refined = refined.dropna(subset=["event_type"])
    refined = refined.loc[
        refined["event_type"].map(lambda value: isinstance(value, str) and bool(value.strip()))
    ]
    # convert types before any groupby
    refined["timestamp"] = pd.to_datetime(refined["timestamp"], utc=True)
    refined = refined.dropna(subset=["timestamp"])
    refined["date"] = refined["timestamp"].dt.date
    refined["is_failure"] = refined["level"].isin(["warn", "error"])
    if refined.empty:
        return []
    # group + aggregate
    grouped = refined.groupby(["date", "event_type"], sort=True).agg(
        events=("event_type", "count"),
        failures=("is_failure", "sum"),
    )
    grouped["error_rate"] = grouped["failures"] / grouped["events"]
    grouped["events"] = grouped["events"].map(int)
    grouped["failures"] = grouped["failures"].map(int)
    grouped["error_rate"] = grouped["error_rate"].map(_round_float)
    grouped = _iso_index(grouped)
    return grouped.reset_index().to_dict(orient="records")


def latency_by_day(
    start_date: datetime,
    end_date: datetime,
    loader: Loader | None = None,
) -> list[dict]:
    """How slow is each API route, by UTC day?

    ``value`` on ``api_latency_recorded`` is ``duration_ms``. The route is
    ``tags.route_template`` (the path the backoffice recorded). Rows with a
    null route or a null duration are dropped before the aggregate. Mean and
    p95 are Pandas reductions, not a Python loop.
    """
    load = load_telemetry_events if loader is None else loader
    # load (SQL): only api_latency_recorded inside the window
    loaded = load(
        LATENCY_EVENT_TYPES,
        start_date,
        end_date,
        ("timestamp", "value", "tags"),
    )
    # refine (Pandas): extract the endpoint dimension and drop nulls
    refined = _with_columns(loaded, ("timestamp", "value", "tags")).loc[:, ["timestamp", "value", "tags"]]
    refined["endpoint"] = refined["tags"].map(lambda tags: _tag_text(tags, "route_template"))
    refined = refined.dropna(subset=["endpoint"])
    # convert types before any groupby
    refined["timestamp"] = pd.to_datetime(refined["timestamp"], utc=True)
    refined["value"] = pd.to_numeric(refined["value"], errors="coerce")
    refined = refined.dropna(subset=["timestamp", "value"])
    refined["date"] = refined["timestamp"].dt.date
    if refined.empty:
        return []
    # group + aggregate
    grouped = refined.groupby(["date", "endpoint"], sort=True)["value"].agg(
        mean_ms="mean",
        p95_ms=lambda series: series.quantile(0.95),
    )
    grouped["mean_ms"] = grouped["mean_ms"].map(_round_float)
    grouped["p95_ms"] = grouped["p95_ms"].map(_round_float)
    grouped = _iso_index(grouped)
    return grouped.reset_index().to_dict(orient="records")


def auth_failure_rate(
    start_date: datetime,
    end_date: datetime,
    loader: Loader | None = None,
) -> list[dict]:
    """What fraction of staff sign-in attempts failed on each UTC day?

    Rate = ``user_login_failed`` / (``user_login_failed`` + ``user_login_succeeded``).
    Both event types are loaded in one query with ``event_type IN (...)``.
    """
    load = load_telemetry_events if loader is None else loader
    # load (SQL): both login outcomes, one timestamp window
    loaded = load(AUTH_EVENT_TYPES, start_date, end_date, ("timestamp", "event_type"))
    # refine (Pandas)
    refined = _with_columns(loaded, ("timestamp", "event_type")).loc[:, ["timestamp", "event_type"]]
    refined = refined.dropna(subset=["event_type"])
    # convert types before any groupby
    refined["timestamp"] = pd.to_datetime(refined["timestamp"], utc=True)
    refined = refined.dropna(subset=["timestamp"])
    refined["date"] = refined["timestamp"].dt.date
    refined["failed"] = refined["event_type"].eq("user_login_failed")
    refined["succeeded"] = refined["event_type"].eq("user_login_succeeded")
    if refined.empty:
        return []
    # group + aggregate
    grouped = refined.groupby("date", sort=True).agg(
        failed=("failed", "sum"),
        succeeded=("succeeded", "sum"),
    )
    grouped["attempts"] = grouped["failed"] + grouped["succeeded"]
    grouped = grouped.loc[grouped["attempts"] > 0]
    if grouped.empty:
        return []
    grouped["auth_failure_rate"] = grouped["failed"] / grouped["attempts"]
    grouped["failed"] = grouped["failed"].map(int)
    grouped["succeeded"] = grouped["succeeded"].map(int)
    grouped["attempts"] = grouped["attempts"].map(int)
    grouped["auth_failure_rate"] = grouped["auth_failure_rate"].map(_round_float)
    grouped = _iso_index(grouped)
    return grouped.reset_index().to_dict(orient="records")
