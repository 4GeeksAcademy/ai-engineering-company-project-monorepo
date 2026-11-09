"""Behavioral proof that the costly transformation reuses Prefect's cache
for identical inputs and recomputes when the input changes — runs the real
`@task`-decorated function (not `.fn`) inside a flow, so Prefect's actual
caching machinery is exercised, not just the key function in isolation
(see test_resilience_config.py for the pure key-function tests).
"""

from __future__ import annotations

from datetime import date
from uuid import uuid4

import pandas as pd
from prefect import flow

import conftest  # noqa: F401
from transform import transform_weekly_location_performance

CALL_COUNTS: dict[str, int] = {"n": 0}
_ORIGINAL_FN = transform_weekly_location_performance.fn


def _counting_fn(raw_events: pd.DataFrame, week_start: date):
    CALL_COUNTS["n"] += 1
    return _ORIGINAL_FN(raw_events, week_start)


def _make_df(event_id: str) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "event_id": event_id,
                "timestamp": pd.Timestamp("2026-07-13T10:00:00Z"),
                "event_type": "inbound_order_created",
                "tags": {"location_id": "CO-MEDELLIN", "country": "CO", "quantity": 1, "unit_cost": 1.0},
            }
        ]
    )


def test_identical_inputs_hit_the_cache_and_skip_recomputation(monkeypatch):
    CALL_COUNTS["n"] = 0
    monkeypatch.setattr(transform_weekly_location_performance, "fn", _counting_fn)

    # A fresh, random event_id per test run — Prefect's cache persists
    # across process runs (its local SQLite backend, not just in-memory
    # for this process), so reusing a fixed literal here would make this
    # assertion depend on whether a *previous* test run already cached
    # that exact key.
    df = _make_df(f"same-event-{uuid4()}")
    week_start = date(2026, 7, 13)

    @flow
    def f():
        transform_weekly_location_performance(df, week_start)
        transform_weekly_location_performance(df.copy(), week_start)

    f()
    assert CALL_COUNTS["n"] == 1, "second call with identical input must be served from cache"


def test_changed_input_invalidates_the_cache(monkeypatch):
    CALL_COUNTS["n"] = 0
    monkeypatch.setattr(transform_weekly_location_performance, "fn", _counting_fn)

    week_start = date(2026, 7, 13)
    run_marker = uuid4()

    @flow
    def f():
        transform_weekly_location_performance(_make_df(f"event-A-{run_marker}"), week_start)
        transform_weekly_location_performance(_make_df(f"event-B-{run_marker}"), week_start)

    f()
    assert CALL_COUNTS["n"] == 2, "a different input (e.g. a late-arriving event) must recompute, not reuse the cache"
