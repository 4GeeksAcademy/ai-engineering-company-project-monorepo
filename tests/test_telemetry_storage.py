"""POST /telemetry/events stores valid rows in one bulk insert and counts rejects."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from api.app import app
import telemetry_store


def _event(event_type: str = "section_viewed", **overrides) -> dict:
    body = {
        "eventID": "11111111-1111-4111-8111-111111111111",
        "timestamp": "2026-09-22T15:04:05Z",
        "sessionID": "02020202-0202-4202-8202-020202020202",
        "UserID": "7",
        "Event_type": event_type,
        "SchemaVersion": 1,
        "requestID": "01010101-0101-4101-8101-010101010101",
        "source": "uis.backoffice",
        "tags": {"source": "uis.backoffice", "location_scope": "none"},
        "properties": {
            "location_scope": "none",
            "app": "backoffice",
            "section": "login",
            "required": False,
            "ready": True,
            "path": "/login",
        },
    }
    body.update(overrides)
    return body


def _sale() -> dict:
    return _event(
        "sale_completed",
        eventID="44444444-4444-4444-8444-444444444444",
        timestamp="2026-09-22T18:00:00Z",
        tags={
            "source": "uis.backoffice",
            "location_scope": "location",
            "location_id": "co-med-centro",
            "country": "Colombia",
            "currency": "COP",
        },
        properties={
            "location_scope": "location",
            "location_id": "co-med-centro",
            "country": "Colombia",
            "currency": "COP",
            "timezone": "America/Bogota",
            "amount": 48000,
            "email": "guest@example.com",
        },
    )


def _latency(**properties) -> dict:
    props = {
        "location_scope": "none",
        "method": "GET",
        "route_template": "/inventory",
        "http_status": 200,
        "duration_ms": 180,
        "outcome": "ok",
    }
    props.update(properties)
    return _event(
        "api_latency_recorded",
        eventID="55555555-5555-4555-8555-555555555555",
        timestamp="2026-09-22T18:00:01Z",
        properties=props,
    )


def _client(monkeypatch) -> TestClient:
    monkeypatch.setenv("SUPABASE_URL", "https://brasaland.example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test")
    return TestClient(app)


def _capture_post(monkeypatch):
    calls: list[tuple[str, dict]] = []

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        request = httpx.Request("POST", url)
        return httpx.Response(201, request=request)

    monkeypatch.setattr(telemetry_store.httpx, "post", fake_post)
    return calls


def test_mixed_batch_stores_valid_rows_in_one_insert(monkeypatch):
    calls = _capture_post(monkeypatch)
    client = _client(monkeypatch)
    invalid = {"event_type": "section_viewed"}
    response = client.post(
        "/telemetry/events",
        json={"events": [_sale(), _latency(), invalid]},
    )

    assert response.status_code == 200
    assert response.json() == {"received": 3, "stored": 2, "rejected": 1}
    assert len(calls) == 1
    url, kwargs = calls[0]
    assert url == "https://brasaland.example.supabase.co/rest/v1/telemetry_events"
    assert kwargs["headers"]["apikey"] == "service-role-test"
    assert kwargs["headers"]["Authorization"] == "Bearer service-role-test"
    assert kwargs["headers"]["Prefer"] == "return=minimal"
    rows = kwargs["json"]
    assert isinstance(rows, list)
    assert len(rows) == 2
    sale, latency = rows
    assert sale["event_type"] == "sale_completed"
    assert sale["timestamp"] == "2026-09-22T18:00:00Z"
    assert sale["service"] == "uis.backoffice"
    assert sale["level"] == "info"
    assert sale["value"] == 48000
    assert sale["message"] == "sale_completed at co-med-centro"
    assert sale["tags"]["location_id"] == "co-med-centro"
    assert sale["tags"]["country"] == "Colombia"
    assert sale["tags"]["currency"] == "COP"
    assert sale["tags"]["timezone"] == "America/Bogota"
    assert sale["tags"]["eventID"] == "44444444-4444-4444-8444-444444444444"
    assert sale["tags"]["sessionID"] == "02020202-0202-4202-8202-020202020202"
    assert sale["tags"]["UserID"] == "7"
    assert sale["tags"]["requestID"] == "01010101-0101-4101-8101-010101010101"
    assert sale["tags"]["SchemaVersion"] == 1
    assert "email" not in sale["tags"]
    assert latency["event_type"] == "api_latency_recorded"
    assert latency["value"] == 180
    assert latency["level"] == "info"
    assert "section_viewed" not in {row["event_type"] for row in rows}


def test_all_invalid_batch_skips_insert_and_returns_200(monkeypatch):
    calls = _capture_post(monkeypatch)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    client = TestClient(app)
    response = client.post(
        "/telemetry/events",
        json={"events": [{"event_type": "section_viewed"}, {"timestamp": "nope"}]},
    )
    assert response.status_code == 200
    assert response.json() == {"received": 2, "stored": 0, "rejected": 2}
    assert calls == []


def test_missing_or_unparseable_envelope_is_422(monkeypatch):
    calls = _capture_post(monkeypatch)
    client = _client(monkeypatch)
    missing = client.post("/telemetry/events", json={"received": 1})
    assert missing.status_code == 422
    assert "received" not in missing.json()
    not_a_list = client.post("/telemetry/events", json={"events": {"eventID": "x"}})
    assert not_a_list.status_code == 422
    garbage = client.post(
        "/telemetry/events",
        content=b"not-json",
        headers={"Content-Type": "text/plain"},
    )
    assert garbage.status_code == 422
    assert calls == []


def test_missing_supabase_env_returns_503_without_insert(monkeypatch):
    calls = _capture_post(monkeypatch)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    client = TestClient(app)
    response = client.post("/telemetry/events", json={"events": [_event()]})
    assert response.status_code == 503
    body = response.json()
    assert body["code"] == "service_unavailable"
    assert "SUPABASE" not in json.dumps(body)
    assert calls == []


def test_technical_error_level_and_blank_source_defaults_service():
    from telemetry_schemas import TelemetryEvent

    error = TelemetryEvent.model_validate(
        _event(
            "client_exception_caught",
            properties={
                "location_scope": "none",
                "app": "backoffice",
                "catch_site": "error_boundary",
                "error_name": "TypeError",
                "path": "/accessible",
                "stack": "secret traceback",
            },
        )
    )
    row = telemetry_store.event_to_row(error)
    assert row["level"] == "error"
    assert row["message"] == "TypeError on /accessible"
    assert "stack" not in row["tags"]
    assert row["tags"]["error_name"] == "TypeError"

    blank = TelemetryEvent.model_validate(_event(source=" "))
    assert telemetry_store.event_to_row(blank)["service"] == "backoffice"

    failed_latency = TelemetryEvent.model_validate(_latency(outcome="network", http_status=0))
    assert telemetry_store.event_to_row(failed_latency)["level"] == "warn"


def test_handler_does_not_type_the_batch_as_telemetry_event_list():
    import inspect

    from routers.telemetry import ingest_telemetry_events

    signature = inspect.signature(ingest_telemetry_events)
    assert list(signature.parameters) == ["request"]
    source = Path("services/api/routers/telemetry.py").read_text(encoding="utf-8")
    assert "events: list[TelemetryEvent]" not in source
    assert "TelemetryEvent.model_validate" in source
