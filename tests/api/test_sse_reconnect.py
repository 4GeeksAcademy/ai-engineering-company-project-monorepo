"""Reconnect backoff, missed-ticket recovery, and ticket_id UI deduplication."""

from __future__ import annotations

import re
from pathlib import Path

from fastapi.testclient import TestClient

from tickets import store

REPO = Path(__file__).resolve().parents[2]
STREAM_JS = (REPO / "uis" / "backoffice" / "tickets-stream.js").read_text(encoding="utf-8")
DASHBOARD_HTML = (REPO / "uis" / "backoffice" / "index.html").read_text(encoding="utf-8")

BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000]


def _backoff_delay(attempt: int) -> int:
    return BACKOFF_MS[min(max(attempt, 0), len(BACKOFF_MS) - 1)]


def _ingest_tickets(*batches: list[dict]) -> list[str]:
    """Mirror the dashboard Map keyed by ticket_id — never render the same id twice."""
    tickets_by_id: dict[str, dict] = {}
    for batch in batches:
        for ticket in batch:
            tickets_by_id[ticket["ticket_id"]] = ticket
    return list(tickets_by_id)


def test_reconnect_backoff_is_progressive():
    match = re.search(r"const BACKOFF_MS = \[([^\]]+)\]", STREAM_JS)
    assert match, STREAM_JS
    js_schedule = [int(part.strip()) for part in match.group(1).split(",")]
    assert js_schedule == BACKOFF_MS
    delays = [_backoff_delay(attempt) for attempt in range(len(BACKOFF_MS) + 2)]
    assert delays[:6] == BACKOFF_MS
    assert delays == sorted(delays)
    assert delays[-1] == BACKOFF_MS[-1]
    assert "backoffDelay" in STREAM_JS
    assert "onBeforeReconnect" in STREAM_JS


def test_reconnect_sends_last_event_id_and_refetches_tickets():
    combined = STREAM_JS + DASHBOARD_HTML
    assert "Last-Event-ID" in combined
    assert "getLastEventId" in combined
    assert "recoverTickets" in combined
    assert "onBeforeReconnect" in combined
    assert "ticketsById" in combined


def test_missed_tickets_are_recovered_after_last_event_id():
    first = store.create(
        {
            "ticket_type": "emergency_order",
            "location_id": "miami-downtown",
            "amount_usd": 80,
            "currency": "USD",
        }
    )
    missed = store.create(
        {
            "ticket_type": "waste_escalation",
            "location_id": "bogota-norte",
            "category": "kitchen_error",
            "kg": 2.4,
        }
    )
    replayed = store.after(first["ticket_id"])
    assert [row["ticket_id"] for row in replayed] == [missed["ticket_id"]]
    assert missed["ticket_id"] == "BRS-000002"


def test_same_ticket_id_is_never_shown_twice(client: TestClient, auth_headers: dict[str, str]):
    created = client.post(
        "/tickets",
        headers=auth_headers,
        json={
            "ticket_type": "emergency_order",
            "location_id": "miami-downtown",
            "amount_usd": 620,
            "currency": "USD",
            "protein_days_remaining": 2,
        },
    ).json()
    listed = client.get("/tickets", headers=auth_headers).json()["tickets"]
    replay = store.after(None)
    live_duplicate = dict(created)

    rendered_ids = _ingest_tickets(listed, replay, [live_duplicate], [created])
    assert rendered_ids.count(created["ticket_id"]) == 1
    assert rendered_ids == ["BRS-000001"]


def test_dashboard_dedupes_by_ticket_id():
    assert "ticketsById.set" in DASHBOARD_HTML
    assert "data-ticket-id" in DASHBOARD_HTML
    assert "upsertTicket" in DASHBOARD_HTML
    on_ticket_block = DASHBOARD_HTML.split("onTicket(ticket)", 1)[1].split("onStatus", 1)[0]
    assert "loadKPIs" not in on_ticket_block
