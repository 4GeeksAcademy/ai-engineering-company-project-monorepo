"""HTTP shell tests: reporting routes call data/pipelines helpers (no ETL in routes).

Auth and error envelopes match the central API (Bearer JWT).
KPI body matches CONTEXT-company.md.
"""
from __future__ import annotations

import importlib
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def _auth_client():
    """Central API client with a disposable SQLite user store + Bearer token."""
    from api.app import app

    users = importlib.import_module("users")
    temp_dir = tempfile.TemporaryDirectory()
    original = users.DATABASE_PATH
    users.DATABASE_PATH = Path(temp_dir.name) / "company_api.db"
    client = TestClient(app)
    register = client.post(
        "/auth/register",
        json={"email": "reporting@brasaland.test", "password": "secret-password"},
    )
    assert register.status_code == 201, register.text
    token = client.post(
        "/auth/token",
        data={"username": "reporting@brasaland.test", "password": "secret-password"},
    )
    assert token.status_code == 200, token.text
    headers = {"Authorization": f"Bearer {token.json()['access_token']}"}
    return client, headers, temp_dir, original, users


def test_reporting_requires_bearer_like_locations():
    from api.app import app

    client = TestClient(app)
    anonymous = client.get("/reporting/pipeline-runs/latest")
    assert anonymous.status_code == 401
    body = anonymous.json()
    assert body["status"] == 401
    assert body["code"] == "unauthorized"
    assert "message" in body and "detail" in body


def test_weekly_performance_route_delegates_to_pipeline():
    client, headers, temp_dir, original, users = _auth_client()
    try:
        payload = {
            "week_start": "2026-09-21",
            "locations": [
                {
                    "location_id": "us-mia-downtown",
                    "country": "United States",
                    "currency": "USD",
                    "total_purchase_cost": 1000,
                    "total_waste_cost": 150,
                    "waste_ratio": 0.15,
                    "stockout_events_count": 1,
                    "price_alert_events_count": 1,
                }
            ],
        }
        with patch(
            "services.reporting.routes.get_weekly_location_performance",
            return_value=payload,
        ) as mock_get:
            response = client.get(
                "/reporting/weekly-location-performance",
                params={"week_start": "2026-09-21"},
                headers=headers,
            )
        assert response.status_code == 200
        body = response.json()
        assert body["week_start"] == "2026-09-21"
        assert set(body["locations"][0].keys()) == {
            "location_id",
            "country",
            "currency",
            "total_purchase_cost",
            "total_waste_cost",
            "waste_ratio",
            "stockout_events_count",
            "price_alert_events_count",
        }
        assert body["locations"][0]["location_id"] == "us-mia-downtown"
        mock_get.assert_called_once_with(week_start="2026-09-21")
    finally:
        users.DATABASE_PATH = original
        temp_dir.cleanup()


def test_latest_run_route_delegates_to_pipeline():
    client, headers, temp_dir, original, users = _auth_client()
    try:
        with patch(
            "services.reporting.routes.get_latest_pipeline_run",
            return_value={
                "run_id": "abc",
                "status": "Success",
                "window_start": "2026-09-21",
                "window_end": "2026-09-28",
                "records_processed": 4,
                "started_at": "2026-09-28T12:00:00+00:00",
                "finished_at": "2026-09-28T12:01:00+00:00",
                "error_message": None,
                "start_date": "should-be-stripped",
            },
        ):
            response = client.get("/reporting/pipeline-runs/latest", headers=headers)
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "Success"
        assert body["records_processed"] == 4
        assert "start_date" not in body
        assert set(body.keys()) <= {
            "run_id",
            "started_at",
            "finished_at",
            "window_start",
            "window_end",
            "records_processed",
            "status",
            "error_message",
            "message",
        }
    finally:
        users.DATABASE_PATH = original
        temp_dir.cleanup()


def test_trigger_route_enqueues_celery_without_etl():
    client, headers, temp_dir, original, users = _auth_client()
    try:
        delayed = MagicMock()
        delayed.id = "task-123"
        with patch(
            "services.reporting.routes.run_weekly_pipeline.delay", return_value=delayed
        ) as delay:
            response = client.post(
                "/reporting/pipeline-runs",
                json={"start_date": "2026-09-21", "end_date": "2026-09-28"},
                headers=headers,
            )
        assert response.status_code == 202
        assert response.json() == {"task_id": "task-123"}
        delay.assert_called_once_with("2026-09-21", "2026-09-28")
    finally:
        users.DATABASE_PATH = original
        temp_dir.cleanup()


def test_trigger_route_returns_503_when_broker_unavailable():
    client, headers, temp_dir, original, users = _auth_client()
    try:
        with patch(
            "services.reporting.routes.run_weekly_pipeline.delay",
            side_effect=RuntimeError("Retry limit exceeded while trying to reconnect"),
        ):
            response = client.post(
                "/reporting/pipeline-runs",
                json={"start_date": "2026-09-21", "end_date": "2026-09-28"},
                headers=headers,
            )
        assert response.status_code == 503
        body = response.json()
        assert body["status"] == 503
        assert body["code"] == "service_unavailable"
        assert "Redis" in body["detail"]
    finally:
        users.DATABASE_PATH = original
        temp_dir.cleanup()


def test_kpi_query_reads_local_store_without_supabase(tmp_path, monkeypatch):
    """Part 3 dashboard feed works from the offline upsert store."""
    import json

    from data.pipelines import pipeline as mod

    client, headers, temp_dir, original, users = _auth_client()
    try:
        store = tmp_path / "weekly_location_performance_store.json"
        store.write_text(
            json.dumps(
                {
                    "rows": [
                        {
                            "location_id": "co-med-centro",
                            "week_start": "2026-09-21",
                            "country": "Colombia",
                            "currency": "COP",
                            "total_purchase_cost": 18500000.0,
                            "total_waste_cost": 920000.0,
                            "waste_ratio": 0.0497,
                            "stockout_events_count": 2,
                            "price_alert_events_count": 1,
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )
        monkeypatch.setattr(mod, "_RAW_DIR", tmp_path)
        monkeypatch.delenv("SUPABASE_URL", raising=False)
        monkeypatch.delenv("SUPABASE_KEY", raising=False)

        response = client.get(
            "/reporting/weekly-location-performance",
            params={"week_start": "2026-09-21"},
            headers=headers,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["week_start"] == "2026-09-21"
        assert body["locations"][0]["location_id"] == "co-med-centro"
        assert body["locations"][0]["currency"] == "COP"
        assert body["locations"][0]["total_purchase_cost"] == 18500000.0
    finally:
        users.DATABASE_PATH = original
        temp_dir.cleanup()


def test_reporting_module_is_not_telemetry():
    """Guards the CONTEXT separation: reporting ≠ engineering telemetry."""
    import services.reporting.routes as reporting_routes

    source = open(reporting_routes.__file__, encoding="utf-8").read()
    assert "/telemetry/report" not in source
    assert "services.telemetry" not in source
    assert "from data.pipelines.pipeline import" in source
    assert "aggregate_location_kpis" not in source
    assert "total_purchase_cost /" not in source


def test_standalone_reporting_app_uses_same_auth():
    """services.reporting.main stays Bearer-gated like the central mount."""
    from services.reporting.main import app

    client = TestClient(app)
    response = client.get("/reporting/weekly-location-performance")
    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"
