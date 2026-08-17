from __future__ import annotations

import asyncio
import json

from pathlib import Path

from fastapi.sse import ServerSentEvent
from fastapi.testclient import TestClient

from api.app import app
from routers.tickets import sse_payload, stream_notifications
from tickets import (
    ASSIGNEE_OPERATIONS,
    ASSIGNEE_PROCUREMENT,
    COMPANY_SLUG,
    SSE_EVENTS,
    event_name_for,
    hub,
    initial_status_for_emergency_order,
    initial_status_for_waste_escalation,
    store,
)

NAMED_SSE_EVENTS = frozenset(SSE_EVENTS.values())

def test_emergency_order_above_500_usd_starts_pending_approval():
    status, assignee = initial_status_for_emergency_order(620)
    assert status == "pending_approval"
    assert assignee == ASSIGNEE_PROCUREMENT


def test_emergency_order_at_or_below_500_usd_starts_open():
    status, assignee = initial_status_for_emergency_order(500)
    assert status == "open"
    assert assignee is None


def test_waste_premium_protein_over_5kg_starts_escalated():
    status, assignee = initial_status_for_waste_escalation(6.2, protein="tenderloin")
    assert status == "escalated"
    assert assignee == ASSIGNEE_OPERATIONS


def test_waste_three_shrinkage_weeks_starts_escalated():
    status, assignee = initial_status_for_waste_escalation(
        1.0,
        protein="chicken",
        consecutive_shrinkage_weeks=3,
    )
    assert status == "escalated"
    assert assignee == ASSIGNEE_OPERATIONS


def test_login_issues_backoffice_jwt(client: TestClient):
    response = client.post("/auth/login", json={"username": "felipe", "password": "brasaland"})
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["username"] == "felipe"
    assert body["access_token"]


def test_login_rejects_bad_password(client: TestClient):
    response = client.post("/auth/login", json={"username": "mariana", "password": "wrong"})
    assert response.status_code == 401


def test_unauthenticated_clients_do_not_receive_stream(client: TestClient):
    response = client.get("/notifications/stream")
    assert response.status_code == 401


def test_invalid_jwt_cannot_open_stream(client: TestClient):
    response = client.get(
        "/notifications/stream",
        headers={"Authorization": "Bearer not-a-token"},
    )
    assert response.status_code == 401


def test_unauthenticated_polling_is_rejected(client: TestClient):
    response = client.get("/tickets")
    assert response.status_code == 401


def test_create_emergency_ticket_uses_context_fields(client: TestClient, auth_headers: dict[str, str]):
    response = client.post(
        "/tickets",
        headers=auth_headers,
        json={
            "ticket_type": "emergency_order",
            "location_id": "miami-downtown",
            "amount_usd": 620,
            "currency": "USD",
            "protein_days_remaining": 2,
        },
    )

    assert response.status_code == 201
    ticket = response.json()
    assert ticket["ticket_id"] == "BRS-000001"
    assert ticket["ticket_type"] == "emergency_order"
    assert ticket["location_id"] == "miami-downtown"
    assert ticket["amount_usd"] == 620
    assert ticket["currency"] == "USD"
    assert ticket["status"] == "pending_approval"
    assert ticket["assignee"] == ASSIGNEE_PROCUREMENT
    assert ticket["company"] == COMPANY_SLUG
    assert "created_at" in ticket


def test_create_ignores_client_supplied_status(client: TestClient, auth_headers: dict[str, str]):
    response = client.post(
        "/tickets",
        headers=auth_headers,
        json={
            "ticket_type": "emergency_order",
            "location_id": "bogota-norte",
            "amount_usd": 120,
            "currency": "COP",
            "status": "escalated",
        },
    )

    assert response.status_code == 422


def test_rejects_unknown_location(client: TestClient, auth_headers: dict[str, str]):
    response = client.post(
        "/tickets",
        headers=auth_headers,
        json={
            "ticket_type": "emergency_order",
            "location_id": "MIA-01",
            "amount_usd": 120,
            "currency": "USD",
        },
    )
    assert response.status_code == 400


def test_rejects_currency_conversion_mismatch(client: TestClient, auth_headers: dict[str, str]):
    response = client.post(
        "/tickets",
        headers=auth_headers,
        json={
            "ticket_type": "emergency_order",
            "location_id": "bogota-norte",
            "amount_usd": 120,
            "currency": "USD",
        },
    )
    assert response.status_code == 400


def test_polling_list_returns_created_tickets(client: TestClient, auth_headers: dict[str, str]):
    client.post(
        "/tickets",
        headers=auth_headers,
        json={
            "ticket_type": "waste_escalation",
            "location_id": "bogota-norte",
            "category": "unexplained_shrinkage",
            "kg": 1.5,
            "consecutive_shrinkage_weeks": 1,
        },
    )

    response = client.get("/tickets", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body["tickets"]) == 1
    ticket = body["tickets"][0]
    assert ticket["ticket_id"] == "BRS-000001"
    assert ticket["status"] == "open"
    assert ticket["company"] == COMPANY_SLUG
    assert ticket["ticket_type"] == "waste_escalation"
    assert ticket["location_id"] == "bogota-norte"
    assert ticket["category"] == "unexplained_shrinkage"


def test_notifications_stream_route_is_sse():
    spec = app.openapi()
    assert "/notifications/stream" in spec["paths"]
    assert "get" in spec["paths"]["/notifications/stream"]
    assert "/tickets" in spec["paths"]
    assert "/auth/login" in spec["paths"]


def test_sse_event_names_match_context_not_generic_message():
    assert SSE_EVENTS["emergency_order"] == "emergency_order_created"
    assert SSE_EVENTS["waste_escalation"] == "waste_escalation_created"
    assert "message" not in NAMED_SSE_EVENTS
    assert "rfp_ticket_created" not in NAMED_SSE_EVENTS
    assert event_name_for("emergency_order") == "emergency_order_created"
    assert event_name_for("waste_escalation") == "waste_escalation_created"


def test_sse_payload_includes_ticket_id_and_initial_status():
    ticket = store.create(
        {
            "ticket_type": "emergency_order",
            "location_id": "miami-downtown",
            "amount_usd": 620,
            "currency": "USD",
            "protein_days_remaining": 2,
        }
    )
    payload = sse_payload(ticket)
    assert payload["ticket_id"] == "BRS-000001"
    assert payload["status"] == "pending_approval"
    assert list(payload.keys())[:2] == ["ticket_id", "status"]


async def _next_named_event(agen):
    while True:
        event = await agen.__anext__()
        if event.event in NAMED_SSE_EVENTS:
            return event


def test_sse_stream_replays_emergency_order_created():
    created = store.create(
        {
            "ticket_type": "emergency_order",
            "location_id": "miami-downtown",
            "amount_usd": 620,
            "currency": "USD",
            "protein_days_remaining": 2,
        }
    )

    async def _run():
        agen = stream_notifications(_user={"sub": "mariana"})
        try:
            event = await _next_named_event(agen)
        finally:
            await agen.aclose()
        return event

    event = asyncio.run(_run())
    assert isinstance(event, ServerSentEvent)
    assert event.event == "emergency_order_created"
    assert event.event != "message"
    assert event.id == created["ticket_id"]
    payload = event.data if isinstance(event.data, dict) else json.loads(event.data)
    assert payload["ticket_id"] == created["ticket_id"]
    assert payload["status"] == "pending_approval"
    assert payload["assignee"] == ASSIGNEE_PROCUREMENT
    assert payload["company"] == COMPANY_SLUG
    assert payload["location_id"] == "miami-downtown"


def test_sse_stream_receives_waste_escalation_created():
    async def _run():
        agen = stream_notifications(_user={"sub": "mariana"})
        waiter = asyncio.create_task(_next_named_event(agen))
        for _ in range(50):
            if hub._queues:
                break
            await asyncio.sleep(0.01)
        assert hub._queues, "SSE subscriber did not attach"
        ticket = store.create(
            {
                "ticket_type": "waste_escalation",
                "location_id": "COL-01",
                "category": "unexplained_shrinkage",
                "kg": 6.5,
                "protein": "ribs",
                "consecutive_shrinkage_weeks": 0,
            }
        )
        await hub.publish(ticket)
        try:
            event = await asyncio.wait_for(waiter, timeout=1)
        finally:
            await agen.aclose()
        return event, ticket

    event, ticket = asyncio.run(_run())
    payload = event.data if isinstance(event.data, dict) else json.loads(event.data)
    assert event.event == "waste_escalation_created"
    assert event.event != "message"
    assert payload["ticket_id"] == ticket["ticket_id"]
    assert payload["status"] == "escalated"
    assert payload["assignee"] == ASSIGNEE_OPERATIONS
    assert payload["location_id"] == "COL-01"
    assert payload["protein"] == "ribs"


def test_sse_replay_skips_tickets_up_to_last_event_id():
    first = store.create(
        {
            "ticket_type": "emergency_order",
            "location_id": "miami-downtown",
            "amount_usd": 620,
            "currency": "USD",
            "protein_days_remaining": 2,
        }
    )
    second = store.create(
        {
            "ticket_type": "waste_escalation",
            "location_id": "COL-01",
            "category": "kitchen_error",
            "kg": 6.5,
            "protein": "ribs",
        }
    )

    async def _run():
        agen = stream_notifications(_user={"sub": "mariana"}, last_event_id=first["ticket_id"])
        try:
            event = await _next_named_event(agen)
        finally:
            await agen.aclose()
        return event

    event = asyncio.run(_run())
    assert event.id == second["ticket_id"]
    assert event.event == "waste_escalation_created"
    payload = event.data if isinstance(event.data, dict) else json.loads(event.data)
    assert payload["ticket_id"] == "BRS-000002"


def test_hub_publishes_to_subscribers():
    async def _run():
        queue = hub.subscribe()
        try:
            await hub.publish({"ticket_id": "BRS-000099", "status": "open"})
            assert queue.get_nowait()["ticket_id"] == "BRS-000099"
        finally:
            hub.unsubscribe(queue)

    asyncio.run(_run())


def test_backoffice_consumes_sse_with_fetch_jwt_and_last_event_id():
    repo = Path(__file__).resolve().parents[2]
    html = (repo / "uis" / "backoffice" / "index.html").read_text(encoding="utf-8")
    stream_js = (repo / "uis" / "backoffice" / "tickets-stream.js").read_text(encoding="utf-8")
    combined = html + stream_js

    assert "new EventSource" not in combined
    assert "ReadableStream" in combined
    assert "getReader" in combined
    assert "Authorization" in combined
    assert "Bearer" in combined
    assert "Last-Event-ID" in combined
    assert "emergency_order_created" in combined
    assert "waste_escalation_created" in combined
    assert "ticketsById" in combined
    assert "is-live-new" in combined
    assert "rfp_ticket_created" not in combined
    assert "tickets-stream.js" in html
