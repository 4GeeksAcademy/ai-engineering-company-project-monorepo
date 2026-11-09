"""Tests for the reporting router (app/routers/reporting.py, Fase 5).

Runs against the REAL Supabase connection, not the `sql_engine` in-memory
fixture: reporting.weekly_location_performance/reporting.pipeline_runs are
plain SQLAlchemy Core tables on their own MetaData
(data/pipelines/weekly-location-performance/schema.py), owned by
supabase/migrations/20261109150000_create_reporting_schema.sql — not
registered on SQLModel.metadata, so the in-memory SQLite fixture never
creates them. This mirrors the same real-DB approach already used by
data/pipelines/weekly-location-performance/tests/{test_flow,
test_load_idempotency}.py, with a synthetic future `week_start` and a
dedicated test user, both cleaned up in teardown.
"""

from __future__ import annotations

import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, insert, select

from app.core.security import create_access_token
from app.main import app  # noqa: E401  (import side effect: registers app.services.reporting,
# which inserts data/pipelines/weekly-location-performance onto sys.path)
from app.models.user_storage import users_table
from app.services.users import engine as users_engine

# Only safe to import AFTER `app.main` above has triggered
# app.services.reporting's sys.path insertion.
_PIPELINE_DIR = Path(__file__).resolve().parents[2] / "data" / "pipelines" / "weekly-location-performance"
if str(_PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_DIR))

import extract  # noqa: E402
import notify  # noqa: E402
from schema import pipeline_runs_table, weekly_location_performance_table  # noqa: E402

TEST_WEEK_START = date(2099, 5, 4)
TEST_LOCATION = "TEST-REPORTING-LOC"
TEST_USER_ID = 999_999_001
TEST_USER_EMAIL = "reporting-router-tests@example.com"


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _staff_token() -> str:
    """A real, staff-role user row (admin) for GET_current_user to resolve
    — reused across this file's tests, inserted once if missing."""
    with users_engine.connect() as conn:
        existing = conn.execute(select(users_table.c.id).where(users_table.c.id == TEST_USER_ID)).first()
        if existing is None:
            conn.execute(
                insert(users_table).values(
                    id=TEST_USER_ID,
                    email=TEST_USER_EMAIL,
                    hashed_password="x",
                    is_active=True,
                    role="admin",
                    created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                )
            )
            conn.commit()
    return create_access_token(subject=str(TEST_USER_ID), role="admin")


async def _client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _fake_extract_result(week_start: date):
    raw = pd.DataFrame(
        [
            {
                "event_id": "reporting-router-test-1",
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
    from app.core.database import engine as app_engine
    from sqlmodel import Session

    with Session(app_engine) as db:
        db.execute(
            delete(weekly_location_performance_table).where(
                weekly_location_performance_table.c.week_start == TEST_WEEK_START,
                weekly_location_performance_table.c.location_id == TEST_LOCATION,
            )
        )
        db.execute(
            delete(pipeline_runs_table).where(
                pipeline_runs_table.c.requested_week_start == TEST_WEEK_START,
            )
        )
        db.commit()
    # A real (non-mocked) run of the pipeline's optional step writes a
    # snapshot file for TEST_WEEK_START — remove it so test runs don't
    # leave files behind (same cleanup data/pipelines/.../tests/test_flow.py
    # does for its own synthetic week).
    (notify.SNAPSHOT_DIR / f"{TEST_WEEK_START.isoformat()}.json").unlink(missing_ok=True)


# ── GET /reporting/pipeline-runs/latest ────────────────────────────────


@pytest.mark.asyncio
async def test_latest_requires_authentication():
    async with await _client() as client:
        resp = await client.get("/api/v1/reporting/pipeline-runs/latest")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_latest_returns_404_for_unknown_pipeline_name():
    token = _staff_token()
    async with await _client() as client:
        resp = await client.get(
            "/api/v1/reporting/pipeline-runs/latest",
            params={"pipeline_name": "nonexistent_pipeline_xyz"},
            headers=_headers(token),
        )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_latest_returns_404_for_unknown_run_id():
    token = _staff_token()
    async with await _client() as client:
        resp = await client.get(
            "/api/v1/reporting/pipeline-runs/latest",
            params={"run_id": "00000000-0000-0000-0000-000000000000"},
            headers=_headers(token),
        )
    assert resp.status_code == 404


# ── POST /reporting/pipeline-runs ──────────────────────────────────────


@pytest.mark.asyncio
async def test_trigger_requires_authentication():
    async with await _client() as client:
        resp = await client.post("/api/v1/reporting/pipeline-runs", json={"week_start": TEST_WEEK_START.isoformat()})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_trigger_rejects_concurrent_run_for_same_week(monkeypatch):
    # Never let the background task actually run the pipeline here — this
    # test is only about the 409 guard, not pipeline execution (see
    # test_trigger_runs_the_real_pipeline below for that).
    monkeypatch.setattr("app.services.reporting.run_pipeline_in_background", lambda *a, **k: None)

    token = _staff_token()
    async with await _client() as client:
        first = await client.post(
            "/api/v1/reporting/pipeline-runs",
            json={"week_start": TEST_WEEK_START.isoformat()},
            headers=_headers(token),
        )
        assert first.status_code == 202, first.text
        assert first.json()["status"] == "running"
        assert first.json()["week_start"] == TEST_WEEK_START.isoformat()

        second = await client.post(
            "/api/v1/reporting/pipeline-runs",
            json={"week_start": TEST_WEEK_START.isoformat()},
            headers=_headers(token),
        )
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_trigger_runs_the_real_pipeline_and_latest_reflects_it(monkeypatch):
    monkeypatch.setattr(extract.extract_weekly_telemetry_events, "fn", lambda week_start: _fake_extract_result(week_start))

    token = _staff_token()
    async with await _client() as client:
        trigger_resp = await client.post(
            "/api/v1/reporting/pipeline-runs",
            json={"week_start": TEST_WEEK_START.isoformat()},
            headers=_headers(token),
        )
        assert trigger_resp.status_code == 202, trigger_resp.text
        run_id = trigger_resp.json()["run_id"]

        # The background task runs after the response is sent, in the same
        # process — poll briefly for it to finish rather than assuming a
        # fixed delay.
        final_status = None
        for _ in range(50):
            status_resp = await client.get(
                "/api/v1/reporting/pipeline-runs/latest",
                params={"run_id": run_id},
                headers=_headers(token),
            )
            assert status_resp.status_code == 200, status_resp.text
            body = status_resp.json()
            if body["status"] != "running":
                final_status = body
                break
            time.sleep(0.2)

        assert final_status is not None, "pipeline run never left 'running' in time"
        assert final_status["status"] == "succeeded"
        assert final_status["records_loaded"] == 1
        assert final_status["error_summary"] is None
        assert final_status["requested_week_start"] == TEST_WEEK_START.isoformat()

        # GET /reporting/pipeline-runs/latest (no run_id) must now surface
        # this as both the latest attempt AND the latest succeeded run.
        latest_resp = await client.get("/api/v1/reporting/pipeline-runs/latest", headers=_headers(token))
        assert latest_resp.status_code == 200
        latest_body = latest_resp.json()
        assert latest_body["latest_attempt"]["id"] == run_id
        assert latest_body["latest_succeeded"] is not None
        assert latest_body["latest_succeeded"]["id"] == run_id

        # GET /reporting/weekly-location-performance must now return the
        # row this run loaded, in company-briefing.md's exact shape.
        kpi_resp = await client.get(
            "/api/v1/reporting/weekly-location-performance",
            params={"week_start": TEST_WEEK_START.isoformat()},
            headers=_headers(token),
        )
    assert kpi_resp.status_code == 200
    kpi_body = kpi_resp.json()
    assert kpi_body["week_start"] == TEST_WEEK_START.isoformat()
    assert len(kpi_body["locations"]) == 1
    entry = kpi_body["locations"][0]
    assert set(entry.keys()) == {
        "location_id",
        "country",
        "total_purchase_cost",
        "total_waste_cost",
        "waste_ratio",
        "stockout_events_count",
        "price_alert_events_count",
        "currency",
    }
    assert entry["location_id"] == TEST_LOCATION
    assert entry["country"] == "CO"
    assert entry["currency"] == "COP"
    assert entry["stockout_events_count"] == 1
    assert entry["total_purchase_cost"] == 0.0


# ── GET /reporting/weekly-location-performance ─────────────────────────


@pytest.mark.asyncio
async def test_kpis_require_authentication():
    async with await _client() as client:
        resp = await client.get("/api/v1/reporting/weekly-location-performance")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_kpis_return_404_when_no_data_for_week():
    token = _staff_token()
    async with await _client() as client:
        resp = await client.get(
            "/api/v1/reporting/weekly-location-performance",
            params={"week_start": "2099-12-28"},  # distinct from TEST_WEEK_START, never loaded
            headers=_headers(token),
        )
    assert resp.status_code == 404
