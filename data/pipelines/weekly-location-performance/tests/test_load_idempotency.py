"""Integration test against the real `reporting` schema (no mocking — this
pipeline's whole point is the database contract, docs/PIPELINE_DESIGN.md
section 8).

Uses a `week_start` far in the future (2099-01-04) and synthetic
`TEST-`-prefixed location ids that can never collide with real business
data, and deletes exactly those rows in teardown — `reporting.*` has no
immutability trigger (only `telemetry_events` does), so this is a normal,
safe cleanup, not a workaround for anything.
"""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest
import conftest  # noqa: F401
from sqlalchemy import delete
from sqlmodel import Session

from app.core.database import engine
from load import load_weekly_location_performance
from schema import weekly_location_performance_table

_load = load_weekly_location_performance.fn

TEST_WEEK_START = date(2099, 1, 4)
TEST_LOCATIONS = ("TEST-CO-ONE", "TEST-US-TWO")


@pytest.fixture(autouse=True)
def _cleanup_test_rows():
    yield
    with Session(engine) as db:
        db.execute(
            delete(weekly_location_performance_table).where(
                weekly_location_performance_table.c.week_start == TEST_WEEK_START,
                weekly_location_performance_table.c.location_id.in_(TEST_LOCATIONS),
            )
        )
        db.commit()


def _aggregated(purchase_co: float, waste_co: float) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "location_id": "TEST-CO-ONE",
                "country": "CO",
                "week_start": TEST_WEEK_START,
                "total_purchase_cost": purchase_co,
                "total_waste_cost": waste_co,
                "waste_ratio": (waste_co / purchase_co) if purchase_co else 0.0,
                "stockout_events_count": 2,
                "price_alert_events_count": 1,
                "currency": "COP",
            },
            {
                "location_id": "TEST-US-TWO",
                "country": "US",
                "week_start": TEST_WEEK_START,
                "total_purchase_cost": 500.0,
                "total_waste_cost": 50.0,
                "waste_ratio": 0.1,
                "stockout_events_count": 0,
                "price_alert_events_count": 0,
                "currency": "USD",
            },
        ]
    )


def _fetch_test_rows() -> list[dict]:
    with Session(engine) as db:
        rows = (
            db.execute(
                weekly_location_performance_table.select().where(
                    weekly_location_performance_table.c.week_start == TEST_WEEK_START,
                    weekly_location_performance_table.c.location_id.in_(TEST_LOCATIONS),
                )
            )
            .mappings()
            .all()
        )
    return [dict(row) for row in rows]


def test_rerunning_the_same_week_does_not_duplicate_rows():
    df = _aggregated(purchase_co=1000.0, waste_co=80.0)

    result_1 = _load(df)
    assert result_1.records_loaded == 2
    rows_after_first = _fetch_test_rows()
    assert len(rows_after_first) == 2

    result_2 = _load(df)
    assert result_2.records_loaded == 2
    rows_after_second = _fetch_test_rows()

    assert len(rows_after_second) == 2, "re-running the same week must never duplicate rows"
    ids_after_first = {row["id"] for row in rows_after_first}
    ids_after_second = {row["id"] for row in rows_after_second}
    assert ids_after_first == ids_after_second, "upsert must update the existing row, not insert a new one"


def test_rerun_with_recomputed_values_replaces_not_accumulates():
    _load(_aggregated(purchase_co=1000.0, waste_co=80.0))
    _load(_aggregated(purchase_co=2000.0, waste_co=80.0))  # recomputed from more source data

    rows = {row["location_id"]: row for row in _fetch_test_rows()}
    co_row = rows["TEST-CO-ONE"]

    # Must equal the *second* run's recomputed value, never 1000+2000 —
    # upsert replaces the row, it never adds to the previous total.
    assert float(co_row["total_purchase_cost"]) == 2000.0
    assert float(co_row["waste_ratio"]) == pytest.approx(80.0 / 2000.0)


def test_empty_aggregated_frame_loads_nothing_without_error():
    result = _load(pd.DataFrame())
    assert result.records_loaded == 0
