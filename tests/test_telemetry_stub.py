"""POST /telemetry/events stub: valid batches are counted, malformed ones are rejected."""

from __future__ import annotations

import logging

from fastapi.testclient import TestClient

from api.app import app


def _event(event_type: str = "section_viewed") -> dict:
    return {
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


def test_stub_accepts_a_valid_batch_and_logs_event_types(caplog):
    client = TestClient(app)
    body = {"events": [_event("section_viewed"), _event("client_exception_caught")]}
    with caplog.at_level(logging.INFO, logger="brasaland.telemetry"):
        response = client.post("/telemetry/events", json=body)
    assert response.status_code == 200
    assert response.json() == {"received": 2}
    text = caplog.text
    assert "received 2 event" in text
    assert "telemetry event_type=section_viewed" in text
    assert "telemetry event_type=client_exception_caught" in text


def test_stub_rejects_a_malformed_batch():
    client = TestClient(app)
    response = client.post(
        "/telemetry/events",
        json={"events": [{"event_type": "section_viewed"}]},
    )
    assert response.status_code == 422
    assert "received" not in response.json()


def test_stub_rejects_readme_envelope_field_names():
    """The approved plan uses eventID / Event_type, not eventId / event_type."""
    client = TestClient(app)
    wrong = _event()
    wrong["eventId"] = wrong.pop("eventID")
    wrong["event_type"] = wrong.pop("Event_type")
    response = client.post("/telemetry/events", json={"events": [wrong]})
    assert response.status_code == 422
