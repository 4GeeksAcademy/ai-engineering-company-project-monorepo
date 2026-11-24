"""POST /telemetry/events (stub): envelope validation, count in the answer, log summary, no auth."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

import pytest


def event(event_type: str = "page_viewed", **overrides) -> dict:
    base = {
        "eventId": str(uuid.uuid4()),
        "timestamp": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "sessionId": str(uuid.uuid4()),
        "userId": "anonymous",
        "event_type": event_type,
        "schemaVersion": "1.0.0",
        "requestId": str(uuid.uuid4()),
        "source": "frontend",
        "properties": {"route_template": "/inventory/products", "entry_type": "initial_load"},
    }
    return {**base, **overrides}


def test_accepts_a_batch_and_counts_it(anon_client):
    batch = [event("page_viewed"), event("form_started", properties={"form_id": "outbound_order"}), event("page_viewed")]
    response = anon_client.post("/telemetry/events", json={"events": batch})
    assert response.status_code == 200
    assert response.json() == {"received": 3}


def test_accepts_the_text_plain_body_the_browser_sends(anon_client):
    # text/plain avoids the CORS preflight that makes sendBeacon fail while a page unloads.
    import json

    response = anon_client.post(
        "/telemetry/events", content=json.dumps({"events": [event()]}), headers={"Content-Type": "text/plain;charset=UTF-8"}
    )
    assert response.status_code == 200 and response.json() == {"received": 1}


def test_rejects_a_body_that_is_not_json(anon_client):
    assert anon_client.post("/telemetry/events", content="not json", headers={"Content-Type": "text/plain"}).status_code == 422


def test_needs_no_token(anon_client):
    # login_failed happens before any session, and sendBeacon cannot send headers.
    assert anon_client.post("/telemetry/events", json={"events": [event("login_failed")]}).status_code == 200


def test_logs_count_and_event_types(anon_client, caplog):
    caplog.set_level(logging.INFO, logger="routes.telemetry")
    anon_client.post("/telemetry/events", json={"events": [event("page_viewed"), event("page_viewed"), event("login_failed")]})
    assert any("3 events" in r.message and "'page_viewed': 2" in r.message and "'login_failed': 1" in r.message for r in caplog.records)


def test_log_never_contains_properties(anon_client, caplog):
    caplog.set_level(logging.INFO, logger="routes.telemetry")
    anon_client.post("/telemetry/events", json={"events": [event(properties={"secret": "do-not-log-me"})]})
    assert "do-not-log-me" not in caplog.text


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"events": []},
        {"events": "nope"},
        {"events": [event()], "extra": 1},
        {"events": [event(eventId="not-a-uuid")]},
        {"events": [event(timestamp="2026-11-24 10:00:00")]},
        {"events": [event(event_type="PageViewed")]},
        {"events": [event(schemaVersion="1.0")]},
        {"events": [event(source="mobile")]},
        {"events": [event(userId="")]},
        {"events": [event(properties="x")]},
        {"events": [{**event(), "email": "a@b.c"}]},
        {"events": [{k: v for k, v in event().items() if k != "requestId"}]},
    ],
)
def test_rejects_malformed_batches(anon_client, body):
    assert anon_client.post("/telemetry/events", json=body).status_code == 422


def test_rejects_oversized_batches(anon_client):
    assert anon_client.post("/telemetry/events", json={"events": [event() for _ in range(101)]}).status_code == 422


def test_config_exposes_the_endpoint(monkeypatch):
    import importlib

    import config

    assert config.TELEMETRY_ENDPOINT.endswith("/telemetry/events")
    monkeypatch.setenv("TELEMETRY_ENDPOINT", "https://telemetry.example/in")
    try:
        assert importlib.reload(config).TELEMETRY_ENDPOINT == "https://telemetry.example/in"
    finally:
        monkeypatch.delenv("TELEMETRY_ENDPOINT")
        importlib.reload(config)
