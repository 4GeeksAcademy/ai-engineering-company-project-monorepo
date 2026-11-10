from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


def _event(event_type: str = "navigation_page_viewed", properties: dict | None = None) -> dict:
    return {
        "eventId": str(uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sessionId": str(uuid4()),
        "userId": str(uuid4()),
        "event_type": event_type,
        "schemaVersion": "1.0.0",
        "requestId": str(uuid4()),
        "properties": properties if properties is not None else {"route": "/"},
    }


def test_accepts_valid_event_batch(client, monkeypatch):
    monkeypatch.setattr("services.api.telemetry.persist_events", lambda events: len(events))
    response = client.post("/api/telemetry/events", json={"events": [_event()]})
    assert response.status_code == 200
    assert response.json() == {"received": 1, "stored": 1, "rejected": 0}


def test_api_timing_emits_canonical_technical_event(client, monkeypatch):
    from services.api import telemetry

    events = []
    monkeypatch.setattr(
        telemetry,
        "record_server_event",
        lambda event_type, properties: events.append((event_type, properties)),
    )

    response = client.get("/inventory/products")

    assert response.status_code == 200
    assert len(events) == 1
    event_type, properties = events[0]
    assert event_type == "api_latency_recorded"
    assert properties["route"] == "/inventory/products"
    assert properties["method"] == "GET"
    assert properties["status_code"] == 200
    assert properties["duration_ms"] >= 0


def test_server_event_persists_valid_pseudonymous_envelope(monkeypatch):
    from services.api import telemetry

    monkeypatch.setenv("TELEMETRY_ENABLED", "true")
    monkeypatch.setenv("TELEMETRY_DATABASE_URL", "postgresql://user:pass@example.test/postgres")
    persisted = []
    monkeypatch.setattr(
        telemetry,
        "persist_events",
        lambda events: persisted.extend(events) or len(events),
    )

    telemetry.record_server_event(
        "supplier_action_completed", {"action": "rate_updated", "result": "failure"}
    )

    assert len(persisted) == 1
    assert persisted[0].event_type == "supplier_action_completed"
    assert persisted[0].sessionId is None
    assert persisted[0].userId is None


def test_rejects_unknown_properties(client):
    response = client.post(
        "/api/telemetry/events",
        json={"events": [_event(properties={"route": "/", "email": "private@example.test"})]},
    )
    assert response.status_code == 200
    assert response.json() == {"received": 1, "stored": 0, "rejected": 1}
    assert "private@example.test" not in response.text


def test_rejects_wrong_event_properties(client):
    response = client.post(
        "/api/telemetry/events",
        json={"events": [_event("login_failed", {"route": "/"})]},
    )
    assert response.status_code == 200
    assert response.json() == {"received": 1, "stored": 0, "rejected": 1}


def test_rejects_unhashable_enum_value_without_server_error(client):
    response = client.post(
        "/api/telemetry/events",
        json={"events": [_event("login_failed", {"reason": ["invalid_credentials"]})]},
    )
    assert response.status_code == 200
    assert response.json() == {"received": 1, "stored": 0, "rejected": 1}


def test_rejects_timestamp_without_timezone(client):
    event = _event()
    event["timestamp"] = "2026-11-09T12:00:00"
    response = client.post("/api/telemetry/events", json={"events": [event]})
    assert response.status_code == 200
    assert response.json() == {"received": 1, "stored": 0, "rejected": 1}


def test_rejects_batches_over_event_limit(client):
    response = client.post("/api/telemetry/events", json={"events": [_event() for _ in range(21)]})
    assert response.status_code == 422


def test_disables_receiver_with_environment_toggle(client, monkeypatch):
    monkeypatch.setenv("TELEMETRY_ENABLED", "false")
    response = client.post("/api/telemetry/events", json={"events": [_event()]})
    assert response.status_code == 404


def test_accepts_consistent_discrepancy_math(client, monkeypatch):
    monkeypatch.setattr("services.api.telemetry.persist_events", lambda events: len(events))
    event = _event("inventory_discrepancy_detected", {
        "warehouse": "zaragoza", "client_id": "client_1", "product_id": "SKU-1",
        "product_category": "fashion", "quantity": 2, "system_quantity": 8,
        "physical_quantity": 10,
    })
    response = client.post("/api/telemetry/events", json={"events": [event]})
    assert response.status_code == 200
    assert response.json() == {"received": 1, "stored": 1, "rejected": 0}


def test_rejects_inconsistent_discrepancy_math(client):
    event = _event("inventory_discrepancy_detected", {
        "warehouse": "zaragoza", "client_id": "client_1", "product_id": "SKU-1",
        "product_category": "fashion", "quantity": 2, "system_quantity": 8,
        "physical_quantity": 9,
    })
    response = client.post("/api/telemetry/events", json={"events": [event]})
    assert response.status_code == 200
    assert response.json() == {"received": 1, "stored": 0, "rejected": 1}


def test_persists_valid_events_from_mixed_batch(client, monkeypatch):
    from services.api import telemetry as telemetry_module

    persisted: list = []

    def fake_persist(events):
        persisted.extend(events)
        return len(events)

    monkeypatch.setattr(telemetry_module, "persist_events", fake_persist)
    valid = _event()
    invalid = _event("login_failed", {"email": "private@example.test"})
    response = client.post("/api/telemetry/events", json={"events": [valid, invalid, None]})

    assert response.status_code == 200
    assert response.json() == {"received": 3, "stored": 1, "rejected": 2}
    assert len(persisted) == 1
    assert str(persisted[0].eventId) == valid["eventId"]
    assert "private@example.test" not in response.text


def test_duplicate_event_id_counts_as_rejected(client, monkeypatch):
    monkeypatch.setattr("services.api.telemetry.persist_events", lambda _events: 0)
    response = client.post("/api/telemetry/events", json={"events": [_event()]})
    assert response.status_code == 200
    assert response.json() == {"received": 1, "stored": 0, "rejected": 1}


def test_storage_failure_does_not_acknowledge_batch(client, monkeypatch):
    from services.api import telemetry as telemetry_module

    def fail(_events):
        raise RuntimeError("sensitive database detail")

    monkeypatch.setattr(telemetry_module, "persist_events", fail)
    response = client.post("/api/telemetry/events", json={"events": [_event()]})
    assert response.status_code == 503
    assert response.json()["detail"] == "Something went wrong. Please try again."
    assert "sensitive database detail" not in response.text
