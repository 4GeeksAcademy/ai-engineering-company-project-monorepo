from __future__ import annotations

from fastapi.testclient import TestClient


def test_weekly_location_performance_returns_brasaland_locations(client: TestClient) -> None:
    response = client.get("/reporting/weekly-location-performance")
    assert response.status_code == 200
    payload = response.json()
    assert payload["week_start"]
    location_ids = {row["location_id"] for row in payload["locations"]}
    assert {"miami-downtown", "bogota-norte", "COL-01"} <= location_ids
    miami = next(row for row in payload["locations"] if row["location_id"] == "miami-downtown")
    bogota = next(row for row in payload["locations"] if row["location_id"] == "bogota-norte")
    assert miami["currency"] == "USD"
    assert bogota["currency"] == "COP"


def test_telemetry_report_returns_dashboard_metrics(client: TestClient) -> None:
    response = client.get("/telemetry/report")
    assert response.status_code == 200
    payload = response.json()
    assert "from" in payload["period"] and "to" in payload["period"]
    metrics = payload["metrics"]
    assert metrics["events_per_day"]
    assert {row["event_type"] for row in metrics["error_rate_by_type"]} <= {"api_error", "user_login_failed"}
    assert metrics["auth_failure_rate"]
    sample = metrics["auth_failure_rate"][0]
    assert {"date", "user_login_succeeded", "user_login_failed", "failure_rate"} <= sample.keys()


def test_weekly_kpis_use_live_supabase_rows(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        "routers.reporting.fetch_weekly_performance",
        lambda week_start: {
            "week_start": week_start or "2026-08-17",
            "source": "supabase",
            "locations": [
                {
                    "location_id": "miami-downtown",
                    "country": "United States",
                    "currency": "USD",
                    "total_purchase_cost": 10,
                    "total_waste_cost": 1,
                    "waste_ratio": 0.1,
                    "stockout_events_count": 0,
                    "price_alert_events_count": 0,
                }
            ],
        },
    )
    monkeypatch.setattr("routers.reporting.use_seed_source", lambda: False)
    response = client.get("/reporting/weekly-location-performance")
    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "supabase"
    assert payload["locations"][0]["location_id"] == "miami-downtown"


def test_telemetry_report_uses_live_supabase_events(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr("routers.telemetry.use_seed_source", lambda: False)
    monkeypatch.setattr(
        "routers.telemetry.fetch_telemetry_events",
        lambda start, end: [
            {"timestamp": "2026-08-18T10:00:00Z", "event_type": "page_view"},
            {"timestamp": "2026-08-18T10:01:00Z", "event_type": "user_login_succeeded"},
            {"timestamp": "2026-08-18T10:02:00Z", "event_type": "user_login_failed"},
            {"timestamp": "2026-08-18T10:03:00Z", "event_type": "api_error"},
        ],
    )
    response = client.get("/telemetry/report")
    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "supabase"
    assert payload["metrics"]["events_per_day"] == [{"date": "2026-08-18", "event_count": 4}]
    assert {row["event_type"] for row in payload["metrics"]["error_rate_by_type"]} == {"api_error", "user_login_failed"}
