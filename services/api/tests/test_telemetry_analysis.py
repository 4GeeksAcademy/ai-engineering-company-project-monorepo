"""Tests for app.services.telemetry_analysis — pure Pandas metric functions.

No database involved here: every test builds its own DataFrame with the
exact columns `fetch_telemetry_events_dataframe` produces (event_id,
timestamp, session_id, user_id, event_type, schema_version, request_id,
tags), matching real captured event shapes (api_latency_recorded,
frontend_error_detected, page_viewed, ...).
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pandas as pd
import pytest

from app.services.telemetry_analysis import (
    api_latency_by_operation,
    build_report_metrics,
    error_rate_by_operation,
    events_per_day,
    frontend_error_counts_by_type,
)

UTC = timezone.utc


def _row(event_type: str, timestamp: datetime, tags: dict, **overrides) -> dict:
    row = {
        "event_id": overrides.pop("event_id", "00000000-0000-0000-0000-000000000000"),
        "timestamp": timestamp,
        "session_id": "s1",
        "user_id": "1",
        "event_type": event_type,
        "schema_version": "1.0.0",
        "request_id": None,
        "tags": tags,
    }
    row.update(overrides)
    return row


def _latency_row(timestamp, endpoint, method, status_code, duration_ms, **extra):
    tags = {
        "endpoint": endpoint,
        "method": method,
        "status_code": status_code,
        "duration_ms": duration_ms,
        "cache_hit": False,
    }
    tags.update(extra)
    return _row("api_latency_recorded", timestamp, tags)


def _frontend_error_row(timestamp, error_name):
    return _row(
        "frontend_error_detected",
        timestamp,
        {"route": "/inventory", "error_name": error_name, "error_message": "boom"},
    )


def df_of(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


# ── events_per_day ─────────────────────────────────────────────────────


def test_events_per_day_counts_all_event_types_per_utc_calendar_day():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 3, tzinfo=UTC)
    rows = [
        _latency_row(start + timedelta(hours=1), "/a", "GET", 200, 100.0),
        _latency_row(start + timedelta(hours=2), "/a", "GET", 200, 100.0),
        _frontend_error_row(start + timedelta(days=1, hours=1), "TypeError"),
    ]
    result = events_per_day(df_of(rows), start, end)

    assert result == [
        {"date": "2026-11-01", "event_count": 2},
        {"date": "2026-11-02", "event_count": 1},
    ]


def test_events_per_day_zero_fills_days_with_no_events():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 4, tzinfo=UTC)
    rows = [_latency_row(start + timedelta(hours=1), "/a", "GET", 200, 100.0)]

    result = events_per_day(df_of(rows), start, end)

    assert result == [
        {"date": "2026-11-01", "event_count": 1},
        {"date": "2026-11-02", "event_count": 0},
        {"date": "2026-11-03", "event_count": 0},
    ]


def test_events_per_day_on_empty_dataset_still_zero_fills_whole_period():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 3, tzinfo=UTC)
    empty = df_of([]).reindex(
        columns=["event_id", "timestamp", "session_id", "user_id", "event_type", "schema_version", "request_id", "tags"]
    )

    result = events_per_day(empty, start, end)

    assert result == [
        {"date": "2026-11-01", "event_count": 0},
        {"date": "2026-11-02", "event_count": 0},
    ]


def test_events_per_day_boundary_is_start_inclusive_end_exclusive():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    rows = [
        _latency_row(start, "/a", "GET", 200, 100.0),  # exactly start -> included
        _latency_row(end, "/a", "GET", 200, 100.0),  # exactly end -> excluded
        _latency_row(end - timedelta(microseconds=1), "/a", "GET", 200, 100.0),  # just before end -> included
    ]
    result = events_per_day(df_of(rows), start, end)

    assert result == [{"date": "2026-11-01", "event_count": 2}]


def test_events_per_day_normalizes_non_utc_timestamps():
    """A timestamp captured with a non-UTC offset must bucket by its UTC day."""
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 3, tzinfo=UTC)
    # 2026-11-01 23:30 in UTC-05:00 == 2026-11-02 04:30 UTC
    non_utc = datetime(2026, 11, 1, 23, 30, tzinfo=timezone(timedelta(hours=-5)))
    rows = [_latency_row(non_utc, "/a", "GET", 200, 100.0)]

    result = events_per_day(df_of(rows), start, end)

    assert result == [
        {"date": "2026-11-01", "event_count": 0},
        {"date": "2026-11-02", "event_count": 1},
    ]


# ── api_latency_by_operation ──────────────────────────────────────────


def test_api_latency_by_operation_computes_expected_statistics():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    rows = [
        _latency_row(start + timedelta(hours=1), "/inventory/products", "GET", 200, 100.0),
        _latency_row(start + timedelta(hours=2), "/inventory/products", "GET", 200, 200.0),
        _latency_row(start + timedelta(hours=3), "/inventory/products", "GET", 200, 300.0),
    ]
    result = api_latency_by_operation(df_of(rows), start, end)

    assert result == [
        {
            "endpoint": "/inventory/products",
            "method": "GET",
            "request_count": 3,
            "mean_duration_ms": 200.0,
            "p50_duration_ms": 200.0,
            "p95_duration_ms": 290.0,
            "max_duration_ms": 300.0,
        }
    ]


def test_api_latency_by_operation_separates_different_operations_and_sorts_deterministically():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    rows = [
        _latency_row(start + timedelta(hours=1), "/b", "POST", 200, 50.0),
        _latency_row(start + timedelta(hours=1), "/a", "GET", 200, 10.0),
        _latency_row(start + timedelta(hours=1), "/a", "POST", 200, 20.0),
    ]
    result = api_latency_by_operation(df_of(rows), start, end)

    assert [(m["endpoint"], m["method"]) for m in result] == [("/a", "GET"), ("/a", "POST"), ("/b", "POST")]


def test_api_latency_by_operation_ignores_other_event_types_and_non_latency_fields():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    rows = [
        _latency_row(start + timedelta(hours=1), "/a", "GET", 200, 100.0),
        _frontend_error_row(start + timedelta(hours=1), "TypeError"),
    ]
    result = api_latency_by_operation(df_of(rows), start, end)

    assert len(result) == 1
    assert result[0]["endpoint"] == "/a"


def test_api_latency_by_operation_drops_rows_missing_duration_ms():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    incomplete = _row(
        "api_latency_recorded",
        start + timedelta(hours=1),
        {"endpoint": "/a", "method": "GET", "status_code": 200},  # no duration_ms
    )
    result = api_latency_by_operation(df_of([incomplete]), start, end)

    assert result == []


def test_api_latency_by_operation_empty_dataset_returns_empty_list():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    empty = df_of([]).reindex(
        columns=["event_id", "timestamp", "session_id", "user_id", "event_type", "schema_version", "request_id", "tags"]
    )
    assert api_latency_by_operation(empty, start, end) == []


# ── error_rate_by_operation ────────────────────────────────────────────


def test_error_rate_by_operation_uses_request_count_as_denominator():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    rows = [
        _latency_row(start + timedelta(hours=1), "/a", "GET", 200, 100.0),
        _latency_row(start + timedelta(hours=2), "/a", "GET", 500, 100.0),
        _latency_row(start + timedelta(hours=3), "/a", "GET", 404, 100.0),
        _latency_row(start + timedelta(hours=4), "/a", "GET", 201, 100.0),
    ]
    result = error_rate_by_operation(df_of(rows), start, end)

    assert result == [
        {"endpoint": "/a", "method": "GET", "request_count": 4, "error_count": 2, "error_rate": 0.5}
    ]


def test_error_rate_by_operation_zero_errors_is_a_genuine_zero_rate():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    rows = [_latency_row(start + timedelta(hours=1), "/a", "GET", 200, 100.0)]
    result = error_rate_by_operation(df_of(rows), start, end)

    assert result == [
        {"endpoint": "/a", "method": "GET", "request_count": 1, "error_count": 0, "error_rate": 0.0}
    ]


def test_error_rate_by_operation_no_requests_in_period_is_absent_not_fabricated_zero():
    """An operation with zero observed requests must not appear at all —
    reporting it as a 0.0 rate would misrepresent "no data" as "no errors"."""
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    empty = df_of([]).reindex(
        columns=["event_id", "timestamp", "session_id", "user_id", "event_type", "schema_version", "request_id", "tags"]
    )
    assert error_rate_by_operation(empty, start, end) == []


# ── frontend_error_counts_by_type ──────────────────────────────────────


def test_frontend_error_counts_by_type_counts_and_sorts_desc_then_name():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    rows = [
        _frontend_error_row(start + timedelta(hours=1), "TypeError"),
        _frontend_error_row(start + timedelta(hours=2), "TypeError"),
        _frontend_error_row(start + timedelta(hours=3), "RangeError"),
        _frontend_error_row(start + timedelta(hours=4), "NetworkError"),
    ]
    result = frontend_error_counts_by_type(df_of(rows), start, end)

    assert result == [
        {"error_name": "TypeError", "count": 2},
        {"error_name": "NetworkError", "count": 1},
        {"error_name": "RangeError", "count": 1},
    ]


def test_frontend_error_counts_by_type_empty_returns_empty_list():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    empty = df_of([]).reindex(
        columns=["event_id", "timestamp", "session_id", "user_id", "event_type", "schema_version", "request_id", "tags"]
    )
    assert frontend_error_counts_by_type(empty, start, end) == []


# ── Determinism, non-mutation, JSON-serializability ───────────────────


def test_metric_functions_are_deterministic_across_repeated_calls():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    rows = [
        _latency_row(start + timedelta(hours=1), "/a", "GET", 500, 100.0),
        _frontend_error_row(start + timedelta(hours=2), "TypeError"),
    ]
    df = df_of(rows)

    first = build_report_metrics(df, start, end)
    second = build_report_metrics(df, start, end)

    assert first == second


def test_metric_functions_never_mutate_the_input_dataframe():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    rows = [
        _latency_row(start + timedelta(hours=1), "/a", "GET", 500, 100.0),
        _frontend_error_row(start + timedelta(hours=2), "TypeError"),
    ]
    df = df_of(rows)
    before = df.copy(deep=True)

    build_report_metrics(df, start, end)

    pd.testing.assert_frame_equal(df, before)


def test_metrics_are_json_serializable_with_no_nan_or_inf():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    rows = [
        _latency_row(start + timedelta(hours=1), "/a", "GET", 500, 100.0),
        _frontend_error_row(start + timedelta(hours=2), "TypeError"),
    ]
    metrics = build_report_metrics(df_of(rows), start, end)

    serialized = json.dumps(metrics)
    assert "NaN" not in serialized
    assert "Infinity" not in serialized
    # round-trips without special float handling
    assert json.loads(serialized) == metrics


def test_build_report_metrics_returns_all_expected_metric_keys():
    start = datetime(2026, 11, 1, tzinfo=UTC)
    end = datetime(2026, 11, 2, tzinfo=UTC)
    empty = df_of([]).reindex(
        columns=["event_id", "timestamp", "session_id", "user_id", "event_type", "schema_version", "request_id", "tags"]
    )
    metrics = build_report_metrics(empty, start, end)

    assert set(metrics.keys()) == {
        "events_per_day",
        "api_latency_by_operation",
        "error_rate_by_operation",
        "frontend_error_counts_by_type",
    }
