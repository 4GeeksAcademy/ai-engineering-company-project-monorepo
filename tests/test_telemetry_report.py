from __future__ import annotations

from datetime import datetime, timezone

from services.telemetry import analysis


def _row(event_type: str, timestamp: str, properties: dict) -> dict:
    return {
        "event_type": event_type,
        "event_timestamp": timestamp,
        "properties": properties,
    }


def test_report_metrics_answer_daily_volume_errors_and_route_latency(monkeypatch):
    events = [
        _row("navigation_page_viewed", "2026-01-02T01:30:00+00:00", {"route": "/"}),
        _row("api_latency_recorded", "2026-01-02T01:30:00+00:00", {
            "route": "/inventory/products", "status_code": 503, "duration_ms": 200.0,
        }),
        _row("api_latency_recorded", "2026-01-02T02:30:00+00:00", {
            "route": "/inventory/products", "status_code": 200, "duration_ms": 100.0,
        }),
    ]
    monkeypatch.setattr(
        analysis,
        "_read_events",
        lambda event_types, _start, _end: [
            event for event in events if event["event_type"] in event_types
        ],
    )
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    end = datetime(2026, 1, 3, tzinfo=timezone.utc)

    report = analysis.build_technical_report(start, end)

    assert report["events_per_day"] == [{"day": "2026-01-02", "event_count": 3}]
    assert report["api_error_rate_by_day"] == [{
        "day": "2026-01-02", "request_count": 2, "error_count": 1, "error_rate": 0.5,
    }]
    assert report["api_latency_by_day_route"] == [{
        "day": "2026-01-02", "route": "/inventory/products", "request_count": 2,
        "mean_duration_ms": 150.0, "p95_duration_ms": 195.0,
    }]


def test_report_excludes_unsafe_routes_and_invalid_values(monkeypatch):
    events = [
        _row("api_latency_recorded", "2026-01-02T01:30:00+00:00", {
            "route": "/suppliers/private-id", "status_code": "bad", "duration_ms": -1,
        }),
    ]
    monkeypatch.setattr(analysis, "_read_events", lambda *_args: events)
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    end = datetime(2026, 1, 3, tzinfo=timezone.utc)

    report = analysis.build_technical_report(start, end)

    assert report["api_error_rate_by_day"] == []
    assert report["api_latency_by_day_route"] == []


def test_report_route_is_authenticated_and_returns_metrics(client, admin_account, monkeypatch):
    expected_metrics = {"events_per_day": [{"day": "2026-01-02", "event_count": 2}]}
    monkeypatch.setattr(
        "services.telemetry.analysis.build_technical_report",
        lambda _start, _end: expected_metrics,
    )

    response = client.get(
        "/telemetry/report?from=2026-01-01T00:00:00Z&to=2026-01-03T00:00:00Z",
        headers=admin_account["headers"],
    )

    assert response.status_code == 200
    assert response.json()["metrics"] == expected_metrics
    assert response.json()["period"] == {
        "from": "2026-01-01T00:00:00+00:00",
        "to": "2026-01-03T00:00:00+00:00",
    }


def test_api_telemetry_report_alias_and_date_validation(client, admin_account, monkeypatch):
    monkeypatch.setattr("services.telemetry.analysis.build_technical_report", lambda *_args: {})
    headers = admin_account["headers"]
    assert client.get("/api/telemetry/report", headers=headers).status_code == 200
    assert client.get("/telemetry/report?from=not-a-date", headers=headers).status_code == 422
    assert client.get("/telemetry/report?from=2026-01-01T00:00:00", headers=headers).status_code == 422
    assert client.get(
        "/telemetry/report?from=2026-01-03T00:00:00Z&to=2026-01-01T00:00:00Z",
        headers=headers,
    ).status_code == 422


def test_report_rejects_regular_user(client, create_user):
    account = create_user()
    login = client.post(
        "/auth/login",
        data={"username": account["email"], "password": account["password"]},
    )

    response = client.get(
        "/telemetry/report",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )

    assert response.status_code == 403