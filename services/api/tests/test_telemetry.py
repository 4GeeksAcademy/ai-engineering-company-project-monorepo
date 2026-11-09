"""Tests for POST /telemetry/events and the TELEMETRY_ENDPOINT setting.

No test-database fixture exists yet for the SQLModel/Postgres-backed
tables (unlike the TinyDB-backed entities, e.g. tests/test_suppliers.py's
`_patch_db_path`) — this file establishes the equivalent for a
Postgres-backed route without requiring a live database: `get_db` is
overridden with a fake session, and the actual persistence call
(`insert_telemetry_event_rows`) is replaced with a spy so tests assert
*how* it was called without touching any database. A real, live insert
against the connected Supabase instance was verified manually and is
reported in the Phase 2 completion summary, not run as part of this suite.
"""

from __future__ import annotations

import logging
from unittest.mock import MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.core.database import get_db
from app.main import app

VALID_EVENT = {
    "eventId": "a1b2c3d4-0000-4000-8000-000000000001",
    "timestamp": "2026-10-28T15:04:05.123Z",
    "sessionId": "b3f1b2a0-1111-4a2b-9c3d-000000000001",
    "userId": "42",
    "event_type": "inbound_order_created",
    "schemaVersion": "1.0.0",
    "requestId": None,
    "properties": {
        "location_id": "CO-MEDELLIN",
        "country": "CO",
        "product_id": "7",
        "product_category": "Meat",
        "quantity": 12.5,
        "unit": "kg",
        "currency": "COP",
        "order_id": "101",
        "supplier_id": "9",
        "unit_cost": 4500.0,
    },
}


def _event(**overrides) -> dict:
    return {**VALID_EVENT, **overrides}


@pytest.fixture(autouse=True)
def fake_db_session():
    """Every test gets a MagicMock session instead of a real Postgres
    connection. insert_telemetry_event_rows is mocked separately per test
    via the `mock_insert` fixture, so this session is never actually used
    for I/O unless a test deliberately exercises the real function."""

    def _fake_get_db():
        yield MagicMock()

    app.dependency_overrides[get_db] = _fake_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def mock_insert(monkeypatch):
    """Spies on app.routers.telemetry.insert_telemetry_event_rows — the
    one place the router calls to persist. Patched at the router's import
    site (not the storage module) because the router imported the name
    directly (`from ... import insert_telemetry_event_rows`)."""
    mock = MagicMock()
    monkeypatch.setattr("app.routers.telemetry.insert_telemetry_event_rows", mock)
    return mock


# ── Fully valid / mixed / fully invalid / empty batches ──────────────────


@pytest.mark.asyncio
async def test_fully_valid_batch(mock_insert):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/telemetry/events",
            json={"events": [_event(), _event(eventId="a1b2c3d4-0000-4000-8000-000000000002")]},
        )
    assert resp.status_code == 200
    assert resp.json() == {"received": 2, "stored": 2, "rejected": 0}
    mock_insert.assert_called_once()


@pytest.mark.asyncio
async def test_mixed_validity_batch(mock_insert):
    """3 valid + 2 invalid -> {"received": 5, "stored": 3, "rejected": 2}
    (the exact example from the task)."""
    bad_missing_timestamp = _event()
    del bad_missing_timestamp["timestamp"]
    bad_non_object = "not an object"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/telemetry/events",
            json={
                "events": [
                    _event(eventId="a1b2c3d4-0000-4000-8000-000000000001"),
                    _event(eventId="a1b2c3d4-0000-4000-8000-000000000002"),
                    bad_missing_timestamp,
                    _event(eventId="a1b2c3d4-0000-4000-8000-000000000003"),
                    bad_non_object,
                ]
            },
        )
    assert resp.status_code == 200
    assert resp.json() == {"received": 5, "stored": 3, "rejected": 2}
    mock_insert.assert_called_once()
    # Exactly one bulk call, carrying only the 3 valid rows.
    (_db_arg, rows), _kwargs = mock_insert.call_args
    assert len(rows) == 3


@pytest.mark.asyncio
async def test_fully_invalid_batch_makes_no_database_call(mock_insert):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/telemetry/events",
            json={"events": ["not an object", 42, None, {"event_type": "bad type no underscore"}]},
        )
    assert resp.status_code == 200
    assert resp.json() == {"received": 4, "stored": 0, "rejected": 4}
    mock_insert.assert_not_called()


@pytest.mark.asyncio
async def test_empty_batch_makes_no_database_call(mock_insert):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={"events": []})
    assert resp.status_code == 200
    assert resp.json() == {"received": 0, "stored": 0, "rejected": 0}
    mock_insert.assert_not_called()


# ── Invalid individual elements, including non-object values ─────────────


@pytest.mark.asyncio
@pytest.mark.parametrize("bad_element", ["a string", 123, None, True, [1, 2, 3], {}])
async def test_non_object_or_empty_elements_are_rejected_individually(bad_element, mock_insert):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/telemetry/events",
            json={"events": [_event(), bad_element]},
        )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"received": 2, "stored": 1, "rejected": 1}
    mock_insert.assert_called_once()


@pytest.mark.asyncio
async def test_invalid_event_missing_required_field_is_rejected_not_the_whole_batch(mock_insert):
    bad_event = _event()
    del bad_event["timestamp"]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={"events": [_event(), bad_event]})
    assert resp.status_code == 200
    assert resp.json() == {"received": 2, "stored": 1, "rejected": 1}


@pytest.mark.asyncio
async def test_event_type_must_be_snake_case(mock_insert):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for bad_name in ["inboundOrderCreated", "InboundOrderCreated", "inbound-order-created", "inbound"]:
            resp = await client.post("/api/v1/telemetry/events", json={"events": [_event(event_type=bad_name)]})
            assert resp.status_code == 200
            assert resp.json() == {"received": 1, "stored": 0, "rejected": 1}, bad_name


# ── Malformed outer envelope (still a 422, unlike per-event validation) ──


@pytest.mark.asyncio
async def test_missing_events_key_is_rejected_at_envelope_level(mock_insert):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={})
    assert resp.status_code == 422
    assert "detail" in resp.json()
    mock_insert.assert_not_called()


@pytest.mark.asyncio
async def test_events_key_not_a_list_is_rejected_at_envelope_level(mock_insert):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={"events": "not-a-list"})
    assert resp.status_code == 422
    mock_insert.assert_not_called()


@pytest.mark.asyncio
async def test_malformed_json_body_is_rejected_at_envelope_level(mock_insert):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/telemetry/events",
            content=b"{not valid json",
            headers={"Content-Type": "application/json"},
        )
    assert resp.status_code == 422
    mock_insert.assert_not_called()


@pytest.mark.asyncio
async def test_unknown_top_level_field_is_rejected_at_envelope_level(mock_insert):
    """extra="forbid" on RawTelemetryEventBatch — still enforced at the
    envelope level, same as before."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={"events": [], "extra": "nope"})
    assert resp.status_code == 422
    mock_insert.assert_not_called()


# ── Reuse of TelemetryEvent + the approved row mapping ────────────────────


@pytest.mark.asyncio
async def test_valid_event_maps_to_the_approved_row_shape(mock_insert):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={"events": [_event()]})
    assert resp.status_code == 200

    (_db_arg, rows), _kwargs = mock_insert.call_args
    assert len(rows) == 1
    row = rows[0]
    assert str(row["event_id"]) == VALID_EVENT["eventId"]
    assert row["session_id"] == VALID_EVENT["sessionId"]
    assert row["user_id"] == VALID_EVENT["userId"]
    assert row["event_type"] == VALID_EVENT["event_type"]
    assert row["schema_version"] == VALID_EVENT["schemaVersion"]
    assert row["request_id"] == VALID_EVENT["requestId"]
    # The one deliberate rename: properties -> tags, content unchanged.
    assert row["tags"] == VALID_EVENT["properties"]


@pytest.mark.asyncio
async def test_exact_json_field_naming_round_trips(mock_insert):
    """eventId/sessionId/userId/schemaVersion/requestId (camelCase) + event_type (snake_case)
    must all be accepted exactly as named by the plan — no renaming/aliasing."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={"events": [_event()]})
    assert resp.status_code == 200, resp.text
    assert resp.json()["stored"] == 1


@pytest.mark.asyncio
async def test_camel_case_event_type_key_is_rejected_as_unknown_field(mock_insert):
    """`eventType` (camelCase) is not a recognized field — the plan requires
    the snake_case `event_type` key exactly."""
    event = _event()
    event["eventType"] = event.pop("event_type")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={"events": [event]})
    assert resp.status_code == 200
    assert resp.json() == {"received": 1, "stored": 0, "rejected": 1}


@pytest.mark.asyncio
async def test_timestamp_without_timezone_is_rejected(mock_insert):
    event = _event(timestamp="2026-10-28T15:04:05.123")  # no "Z" / offset
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={"events": [event]})
    assert resp.status_code == 200
    assert resp.json() == {"received": 1, "stored": 0, "rejected": 1}


# ── Persistence failure / duplicate-event policy ──────────────────────────


@pytest.mark.asyncio
async def test_persistence_failure_returns_non_2xx_and_does_not_report_stored(mock_insert):
    mock_insert.side_effect = RuntimeError("connection reset")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={"events": [_event()]})
    assert resp.status_code == 500
    # Never the custom {received, stored, rejected} success shape.
    assert "stored" not in resp.json()
    mock_insert.assert_called_once()


@pytest.mark.asyncio
async def test_duplicate_event_id_is_a_persistence_failure_not_a_silent_rejection(mock_insert):
    """event_id is the table's primary key with no ON CONFLICT handling
    (the existing, approved storage policy — see
    app/models/telemetry_storage.py) — a duplicate must surface as a
    database failure, never be silently deduplicated or reclassified as a
    validation rejection."""
    from sqlalchemy.exc import IntegrityError

    mock_insert.side_effect = IntegrityError(
        "INSERT INTO telemetry_events ...", {}, Exception("duplicate key value violates unique constraint")
    )
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/telemetry/events", json={"events": [_event()]})
    assert resp.status_code == 500
    body = resp.json()
    assert body.get("rejected") != 1  # not reclassified as a validation rejection
    assert "stored" not in body


@pytest.mark.asyncio
async def test_persistence_failure_never_swallowed_or_logged_as_rejection(mock_insert, caplog):
    mock_insert.side_effect = RuntimeError("connection reset")
    with caplog.at_level(logging.ERROR):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/api/v1/telemetry/events", json={"events": [_event()]})
    assert resp.status_code == 500
    log_text = "\n".join(r.message for r in caplog.records)
    assert "Failed to persist telemetry batch" in log_text


# ── Logging: size + event types only, never the payload ──────────────────


@pytest.mark.asyncio
async def test_batch_logs_counts_and_event_types_without_payload(caplog, mock_insert):
    with caplog.at_level(logging.INFO, logger="app.routers.telemetry"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/telemetry/events",
                json={"events": [_event(), _event(event_type="login_failed")]},
            )
    assert resp.status_code == 200
    log_text = "\n".join(r.message for r in caplog.records)
    assert "received=2" in log_text
    assert "stored=2" in log_text
    assert "rejected=0" in log_text
    assert "inbound_order_created" in log_text
    assert "login_failed" in log_text
    # Never log full payloads or event-specific properties.
    assert "CO-MEDELLIN" not in log_text
    assert "supplier_id" not in log_text


# ── TELEMETRY_ENDPOINT setting (unchanged from Phase 1) ───────────────────


def test_telemetry_endpoint_setting_is_read_without_outbound_calls(monkeypatch):
    monkeypatch.setenv("TELEMETRY_ENDPOINT", "https://telemetry.example.com/ingest")
    get_settings.cache_clear()
    try:
        settings = get_settings()
        assert settings.TELEMETRY_ENDPOINT == "https://telemetry.example.com/ingest"
    finally:
        get_settings.cache_clear()


def test_telemetry_endpoint_defaults_to_empty_without_failing_startup():
    settings = get_settings()
    assert isinstance(settings.TELEMETRY_ENDPOINT, str)
