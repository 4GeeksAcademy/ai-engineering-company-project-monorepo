"""Operational telemetry analysis — pure, vectorized Pandas metric functions.

Equivalent of the task's `services/telemetry/analysis.py`, placed under
`app/services/` to match this repo's existing service-layer location
(`app/services/incidents.py`, etc.).

Scope: technical/operational metrics only (volume, errors, latency) — no
sales/conversion/business metrics, per the task's explicit restriction.
Metrics are derived only from events and `properties` actually captured by
the approved catalogue (`app/models/events.py` / docs/event-schemas.json):

- `api_latency_recorded` → endpoint, method, status_code, duration_ms
  (captured by the single `authenticated-fetch.ts` wrapper on every
  authenticated frontend call) powers both latency and error-rate metrics.
- `frontend_error_detected` → route, error_name, error_message powers the
  frontend error-count metric.
- every event_type (via its shared envelope) powers the daily volume metric.

Database retrieval is deliberately kept out of this module — see
`app.models.telemetry_storage.fetch_telemetry_events_dataframe`. Every
function here is a pure transform of an already-fetched DataFrame: given
the same inputs, always the same output, no I/O, no mutation of the input.

Each metric function independently re-applies the `[start_date, end_date)`
filter (`_filter_period`) rather than trusting the caller already sliced
the frame, so a function stays correct even if called on an unfiltered
DataFrame — `start_date`/`end_date` must already be resolved, UTC,
tz-aware `datetime`s (no default window, no clock read, see
`app.routers.telemetry`).

"Unavailable" vs. "zero", by construction:
- `events_per_day` zero-fills every calendar day in the period: a day with
  no captured events is a genuine zero (we know the whole period's data
  was fetched), so it is reported as `0`, not omitted.
- Every other metric here is grouped by a label that comes from the data
  itself (an `endpoint`+`method` pair, an `error_name`). A group that never
  appears in the period has no row to measure, so it is simply absent from
  the list — never reported as a fabricated zero/0.0 rate.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd

TIMESTAMP_COLUMN = "timestamp"
EVENT_TYPE_COLUMN = "event_type"
TAGS_COLUMN = "tags"

API_LATENCY_EVENT_TYPE = "api_latency_recorded"
FRONTEND_ERROR_EVENT_TYPE = "frontend_error_detected"

# properties.status_code >= this value counts as an error (api_latency_recorded).
ERROR_STATUS_THRESHOLD = 400


def _filter_period(df: pd.DataFrame, start_date: datetime, end_date: datetime) -> pd.DataFrame:
    """Rows of `df` with start_date <= timestamp < end_date. Never mutates `df`."""
    if df.empty:
        return df.iloc[0:0]
    timestamps = pd.to_datetime(df[TIMESTAMP_COLUMN], utc=True)
    mask = (timestamps >= start_date) & (timestamps < end_date)
    return df.loc[mask]


def _expand_properties(df: pd.DataFrame, event_type: str, fields: list[str]) -> pd.DataFrame:
    """Rows of `df` whose event_type matches, with `fields` pulled out of the
    `tags` dict column into their own top-level columns via a single
    vectorized `pd.json_normalize` call (never a per-row loop/apply). A row
    whose tags are missing one of `fields` gets NaN there rather than
    raising; callers drop incomplete rows with ordinary Pandas filtering.
    """
    subset = df.loc[df[EVENT_TYPE_COLUMN] == event_type]
    if subset.empty:
        return subset.assign(**{field: pd.Series(dtype="object") for field in fields})
    flattened = pd.json_normalize(subset[TAGS_COLUMN]).reindex(columns=fields)
    flattened.index = subset.index
    return subset.join(flattened)


def _sanitize_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """JSON-safety pass over an already-computed (small, post-aggregation)
    list of records: convert numpy scalar types to native Python types and
    replace NaN/inf with None. This performs no metric computation — every
    count/mean/quantile/rate is already computed by vectorized Pandas
    operations before this function ever runs; it only reshapes the
    handful of resulting group rows for `json.dumps` safety.
    """
    sanitized: list[dict[str, Any]] = []
    for record in records:
        clean: dict[str, Any] = {}
        for key, value in record.items():
            if isinstance(value, (np.floating, float)):
                value = float(value)
                if np.isnan(value) or np.isinf(value):
                    value = None
            elif isinstance(value, np.integer):
                value = int(value)
            clean[key] = value
        sanitized.append(clean)
    return sanitized


def events_per_day(df: pd.DataFrame, start_date: datetime, end_date: datetime) -> list[dict[str, Any]]:
    """Daily count of every captured event (all event_types) — overall
    technical/operational volume.

    Fields: `date` (UTC calendar day, "YYYY-MM-DD"), `event_count` (int).
    One entry per calendar day overlapping [start_date, end_date), in
    ascending date order, zero-filled for days with no events.
    """
    filtered = _filter_period(df, start_date, end_date)

    period_days = pd.date_range(
        start=pd.Timestamp(start_date).tz_convert("UTC").floor("D"),
        end=(pd.Timestamp(end_date) - pd.Timedelta(microseconds=1)).tz_convert("UTC").floor("D"),
        freq="D",
    )

    if filtered.empty:
        daily_counts = pd.Series(0, index=period_days)
    else:
        timestamps = pd.to_datetime(filtered[TIMESTAMP_COLUMN], utc=True)
        day_buckets = timestamps.dt.floor("D")
        daily_counts = day_buckets.value_counts().reindex(period_days, fill_value=0)

    daily_counts = daily_counts.sort_index()
    return [
        {"date": day.date().isoformat(), "event_count": int(count)}
        for day, count in daily_counts.items()
    ]


def api_latency_by_operation(
    df: pd.DataFrame, start_date: datetime, end_date: datetime
) -> list[dict[str, Any]]:
    """Request-latency statistics per operation (endpoint + HTTP method),
    from `api_latency_recorded.properties.duration_ms` (milliseconds).

    Fields per entry: `endpoint`, `method`, `request_count` (captured
    requests for that operation), `mean_duration_ms`, `p50_duration_ms`,
    `p95_duration_ms`, `max_duration_ms` (all in milliseconds, rounded to 2
    decimals). An operation with zero captured requests in the period is
    absent from the list.
    """
    filtered = _filter_period(df, start_date, end_date)
    expanded = _expand_properties(filtered, API_LATENCY_EVENT_TYPE, ["endpoint", "method", "duration_ms"])
    expanded = expanded.dropna(subset=["endpoint", "method", "duration_ms"])
    if expanded.empty:
        return []

    expanded = expanded.assign(duration_ms=expanded["duration_ms"].astype(float))
    grouped = expanded.groupby(["endpoint", "method"])["duration_ms"]

    summary = grouped.agg(request_count="count", mean_duration_ms="mean", max_duration_ms="max")
    quantiles = grouped.quantile([0.5, 0.95]).unstack()
    quantiles.columns = ["p50_duration_ms", "p95_duration_ms"]
    combined = summary.join(quantiles).reset_index()

    for column in ("mean_duration_ms", "p50_duration_ms", "p95_duration_ms", "max_duration_ms"):
        combined[column] = combined[column].round(2)
    combined["request_count"] = combined["request_count"].astype(int)
    combined = combined.sort_values(["endpoint", "method"])

    return _sanitize_records(combined.to_dict(orient="records"))


def error_rate_by_operation(
    df: pd.DataFrame, start_date: datetime, end_date: datetime
) -> list[dict[str, Any]]:
    """Error rate per operation (endpoint + HTTP method), from
    `api_latency_recorded.properties.status_code`.

    `error_rate = error_count / request_count`, where `request_count` is
    every captured `api_latency_recorded` call for that operation in the
    period (a meaningful denominator: calls actually observed, not an
    estimate) and `error_count` is the subset with `status_code >= 400`.
    Fields: `endpoint`, `method`, `request_count`, `error_count`,
    `error_rate` (0..1, rounded to 4 decimals). An operation with zero
    captured requests is absent from the list — never reported as a 0.0
    rate, which would misrepresent "no data" as "no errors".
    """
    filtered = _filter_period(df, start_date, end_date)
    expanded = _expand_properties(filtered, API_LATENCY_EVENT_TYPE, ["endpoint", "method", "status_code"])
    expanded = expanded.dropna(subset=["endpoint", "method", "status_code"])
    if expanded.empty:
        return []

    expanded = expanded.assign(is_error=expanded["status_code"].astype(float) >= ERROR_STATUS_THRESHOLD)
    grouped = expanded.groupby(["endpoint", "method"])["is_error"]

    summary = grouped.agg(request_count="count", error_count="sum").reset_index()
    summary["error_count"] = summary["error_count"].astype(int)
    summary["error_rate"] = (summary["error_count"] / summary["request_count"]).round(4)
    summary = summary.sort_values(["endpoint", "method"])

    return _sanitize_records(summary.to_dict(orient="records"))


def frontend_error_counts_by_type(
    df: pd.DataFrame, start_date: datetime, end_date: datetime
) -> list[dict[str, Any]]:
    """Count of captured `frontend_error_detected` events per `error_name`.

    Fields: `error_name`, `count`. A raw count, not a rate — there is no
    captured denominator that would make an error-name-specific rate
    meaningful (e.g. total page views conflates unrelated routes/causes),
    so this is reported as a count only, per the task's instruction not to
    mislabel a count as a rate. Sorted by count descending, then
    `error_name` ascending for deterministic ordering. An error name with
    zero occurrences is absent from the list.
    """
    filtered = _filter_period(df, start_date, end_date)
    expanded = _expand_properties(filtered, FRONTEND_ERROR_EVENT_TYPE, ["error_name"])
    expanded = expanded.dropna(subset=["error_name"])
    if expanded.empty:
        return []

    counts = expanded.groupby("error_name").size().reset_index(name="count")
    counts["count"] = counts["count"].astype(int)
    counts = counts.sort_values(["count", "error_name"], ascending=[False, True])

    return _sanitize_records(counts.to_dict(orient="records"))


def build_report_metrics(
    df: pd.DataFrame, start_date: datetime, end_date: datetime
) -> dict[str, list[dict[str, Any]]]:
    """Compute every operational metric over the same (df, start_date,
    end_date) — the single analysis dataset and boundaries the report
    endpoint builds once per request.
    """
    return {
        "events_per_day": events_per_day(df, start_date, end_date),
        "api_latency_by_operation": api_latency_by_operation(df, start_date, end_date),
        "error_rate_by_operation": error_rate_by_operation(df, start_date, end_date),
        "frontend_error_counts_by_type": frontend_error_counts_by_type(df, start_date, end_date),
    }
