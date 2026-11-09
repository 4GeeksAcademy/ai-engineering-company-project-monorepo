"""Fase 2 checks that don't need a database: every task touching an
external service has retries configured, and the costly transformation's
cache is correctly keyed and invalidated.
"""

from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
import conftest  # noqa: F401
from extract import extract_weekly_telemetry_events
from load import load_weekly_location_performance
from notify import write_weekly_evaluation_snapshot
from transform import TRANSFORM_CACHE_EXPIRATION, transform_cache_key, transform_weekly_location_performance


def test_extract_has_retries_for_external_db_access():
    assert extract_weekly_telemetry_events.retries == 3
    assert extract_weekly_telemetry_events.retry_delay_seconds == 30


def test_load_has_retries_for_external_db_access():
    assert load_weekly_location_performance.retries == 2
    assert load_weekly_location_performance.retry_delay_seconds == 20


def test_transform_has_a_small_retry_margin():
    # Pure-Pandas, no I/O — only a defensive margin, not a recovery
    # strategy (see transform.py's task docstring/comment).
    assert transform_weekly_location_performance.retries == 1


def test_optional_step_has_no_retries():
    # Best-effort, non-critical — spending retry budget on it buys nothing.
    assert write_weekly_evaluation_snapshot.retries in (0, None)


def test_transform_cache_key_differs_for_different_weeks():
    df = pd.DataFrame(
        [{"event_id": "a", "timestamp": pd.Timestamp.now(tz="UTC"), "event_type": "x", "tags": {}}]
    )
    key_a = transform_cache_key(None, {"week_start": date(2026, 7, 13), "raw_events": df})
    key_b = transform_cache_key(None, {"week_start": date(2026, 7, 20), "raw_events": df})
    assert key_a != key_b


def test_transform_cache_key_differs_when_input_rows_differ():
    week_start = date(2026, 7, 13)
    df_1 = pd.DataFrame(
        [{"event_id": "a", "timestamp": pd.Timestamp.now(tz="UTC"), "event_type": "x", "tags": {"v": 1}}]
    )
    df_2 = pd.DataFrame(
        [{"event_id": "a", "timestamp": pd.Timestamp.now(tz="UTC"), "event_type": "x", "tags": {"v": 2}}]
    )
    key_1 = transform_cache_key(None, {"week_start": week_start, "raw_events": df_1})
    key_2 = transform_cache_key(None, {"week_start": week_start, "raw_events": df_2})
    assert key_1 != key_2, "a late-arriving/changed event must invalidate the cache key"


def test_transform_cache_key_identical_for_identical_input():
    week_start = date(2026, 7, 13)
    ts = pd.Timestamp("2026-07-13T10:00:00Z")
    df_a = pd.DataFrame([{"event_id": "a", "timestamp": ts, "event_type": "x", "tags": {"v": 1}}])
    df_b = pd.DataFrame([{"event_id": "a", "timestamp": ts, "event_type": "x", "tags": {"v": 1}}])
    key_a = transform_cache_key(None, {"week_start": week_start, "raw_events": df_a})
    key_b = transform_cache_key(None, {"week_start": week_start, "raw_events": df_b})
    assert key_a == key_b


def test_transform_cache_expiration_is_bounded():
    assert timedelta(0) < TRANSFORM_CACHE_EXPIRATION <= timedelta(days=1)
