"""End-to-end flow tests against the real `reporting` schema.

`extract` is monkeypatched to return a fixed, synthetic DataFrame instead
of hitting `telemetry_events` — this pipeline must never write there
(docs/company-briefing.md section 7), and inserting synthetic rows into it
for a test would be a *permanent* pollution of that table (its triggers
reject UPDATE/DELETE/TRUNCATE unconditionally, see
services/api/app/models/telemetry_storage.py's docstring) — not an
acceptable price for a test. `transform` and `load` run for real, against
a synthetic future `week_start`/`TEST-`-prefixed locations that are deleted
in teardown, exactly like test_load_idempotency.py.
"""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest
import conftest  # noqa: F401
from sqlalchemy import delete
from sqlmodel import Session

from app.core.database import engine

import extract
import flow as flow_module
import notify
import run_log
from schema import pipeline_runs_table, weekly_location_performance_table

TEST_WEEK_START = date(2099, 2, 2)
TEST_LOCATION = "TEST-FLOW-LOC"
PIPELINE_NAME = flow_module.PIPELINE_NAME


def _fake_extract_result(week_start: date):
    raw = pd.DataFrame(
        [
            {
                "event_id": "flow-test-1",
                "timestamp": pd.Timestamp(week_start.isoformat(), tz="UTC"),
                "session_id": None,
                "user_id": None,
                "event_type": "stock_threshold_triggered",
                "schema_version": "1.0.0",
                "request_id": None,
                "tags": {"location_id": TEST_LOCATION, "country": "CO"},
            }
        ]
    )
    return extract.ExtractResult(raw_events=raw, records_read=len(raw))


@pytest.fixture(autouse=True)
def _cleanup():
    yield
    with Session(engine) as db:
        db.execute(
            delete(weekly_location_performance_table).where(
                weekly_location_performance_table.c.week_start == TEST_WEEK_START,
                weekly_location_performance_table.c.location_id == TEST_LOCATION,
            )
        )
        db.execute(
            delete(pipeline_runs_table).where(
                pipeline_runs_table.c.pipeline_name == PIPELINE_NAME,
                pipeline_runs_table.c.requested_week_start == TEST_WEEK_START,
            )
        )
        db.commit()
    # A real (non-mocked) run of the optional step writes a snapshot file
    # for TEST_WEEK_START — remove it so test runs don't leave files behind.
    (notify.SNAPSHOT_DIR / f"{TEST_WEEK_START.isoformat()}.json").unlink(missing_ok=True)


def test_flow_completes_extract_transform_load(monkeypatch):
    monkeypatch.setattr(
        extract.extract_weekly_telemetry_events,
        "fn",
        lambda week_start: _fake_extract_result(week_start),
    )

    result = flow_module.weekly_location_performance_flow(
        week_start=TEST_WEEK_START, triggered_by="test"
    )

    assert result["status"] == "succeeded"
    assert result["records_loaded"] == 1

    logged = run_log.get_run(result["run_id"])
    assert logged["status"] == "succeeded"
    assert logged["records_loaded"] == 1
    assert logged["error_summary"] is None


def test_optional_step_failure_is_captured_and_main_pipeline_still_succeeds(monkeypatch):
    monkeypatch.setattr(
        extract.extract_weekly_telemetry_events,
        "fn",
        lambda week_start: _fake_extract_result(week_start),
    )

    def _boom(aggregated, week_start):
        raise OSError("disk full (simulated)")

    monkeypatch.setattr(notify.write_weekly_evaluation_snapshot, "fn", _boom)

    result = flow_module.weekly_location_performance_flow(
        week_start=TEST_WEEK_START, triggered_by="test"
    )

    # The main pipeline (extract -> transform -> load) must still be a
    # full success, with the optional failure visible separately.
    assert result["status"] == "succeeded"
    assert result["records_loaded"] == 1
    assert result["optional_step_error"] is not None
    assert "disk full" in result["optional_step_error"]

    logged = run_log.get_run(result["run_id"])
    assert logged["status"] == "succeeded"
    assert logged["error_summary"] is None, "an optional-step failure must never be written as a main-pipeline error"
    assert logged["optional_step_error"] is not None


def test_rerunning_the_flow_for_the_same_week_does_not_duplicate_destination_rows(monkeypatch):
    monkeypatch.setattr(
        extract.extract_weekly_telemetry_events,
        "fn",
        lambda week_start: _fake_extract_result(week_start),
    )

    flow_module.weekly_location_performance_flow(week_start=TEST_WEEK_START, triggered_by="test")
    flow_module.weekly_location_performance_flow(week_start=TEST_WEEK_START, triggered_by="test")

    with Session(engine) as db:
        rows = (
            db.execute(
                weekly_location_performance_table.select().where(
                    weekly_location_performance_table.c.week_start == TEST_WEEK_START,
                    weekly_location_performance_table.c.location_id == TEST_LOCATION,
                )
            )
            .mappings()
            .all()
        )
    assert len(rows) == 1, "two runs for the same week must leave exactly one destination row, not two"

    # Two separate pipeline_runs attempts are expected (section 9: every
    # run gets its own immutable log row) — both succeeded.
    with Session(engine) as db:
        run_rows = (
            db.execute(
                pipeline_runs_table.select().where(
                    pipeline_runs_table.c.pipeline_name == PIPELINE_NAME,
                    pipeline_runs_table.c.requested_week_start == TEST_WEEK_START,
                )
            )
            .mappings()
            .all()
        )
    assert len(run_rows) == 2
    assert all(row["status"] == "succeeded" for row in run_rows)


def test_critical_stage_failure_is_logged_and_reflected_in_the_result(monkeypatch):
    def _boom(week_start):
        raise ConnectionError("database unreachable (simulated)")

    monkeypatch.setattr(extract.extract_weekly_telemetry_events, "fn", _boom)
    monkeypatch.setattr(extract.extract_weekly_telemetry_events, "retries", 0)

    with pytest.raises(RuntimeError, match="extract_weekly_telemetry_events failed"):
        flow_module.weekly_location_performance_flow(week_start=TEST_WEEK_START, triggered_by="test")

    latest = run_log.get_latest_attempt(PIPELINE_NAME)
    assert latest is not None
    assert latest["requested_week_start"] == TEST_WEEK_START
    assert latest["status"] == "failed"
    assert latest["failed_stage"] == "extract"
    assert latest["error_summary"] is not None
    assert "database unreachable" in latest["error_summary"]

    # A failed extract must leave nothing in the destination table for
    # this week (no row was ever written before the failure).
    with Session(engine) as db:
        rows = (
            db.execute(
                weekly_location_performance_table.select().where(
                    weekly_location_performance_table.c.week_start == TEST_WEEK_START,
                    weekly_location_performance_table.c.location_id == TEST_LOCATION,
                )
            )
            .mappings()
            .all()
        )
    assert len(rows) == 0
