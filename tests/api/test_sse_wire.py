"""Drive the SSE HTTP endpoint and inspect bytes on the wire.

TestClient.stream() never returns on this keep-alive generator, so tests speak
ASGI directly, then cancel the task after the frames they need have arrived.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient

from api.app import app

Predicate = Callable[[bytes, dict[str, str]], bool]


async def _asgi_until(
    method: str,
    path: str,
    headers: dict[str, str],
    *,
    body: bytes = b"",
    predicate: Predicate,
    timeout: float = 2.0,
) -> tuple[dict[str, str], int, bytes]:
    sent: list[dict[str, Any]] = []
    request_sent = False
    done = asyncio.Event()

    async def receive() -> dict[str, Any]:
        nonlocal request_sent
        if not request_sent:
            request_sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        await done.wait()
        return {"type": "http.disconnect"}

    def _headers() -> dict[str, str]:
        start = next((msg for msg in sent if msg["type"] == "http.response.start"), None)
        if start is None:
            return {}
        return {key.decode().lower(): value.decode() for key, value in start["headers"]}

    def _body() -> bytes:
        return b"".join(msg.get("body", b"") for msg in sent if msg["type"] == "http.response.body")

    def _status() -> int:
        start = next((msg for msg in sent if msg["type"] == "http.response.start"), None)
        return int(start["status"]) if start else 0

    async def send(message: dict[str, Any]) -> None:
        sent.append(message)
        if predicate(_body(), _headers()):
            done.set()

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [(key.lower().encode(), value.encode()) for key, value in headers.items()],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "root_path": "",
    }
    task = asyncio.create_task(app(scope, receive, send))
    try:
        await asyncio.wait_for(done.wait(), timeout=timeout)
    finally:
        done.set()
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    return _headers(), _status(), _body()


def read_sse_stream(
    auth_headers: dict[str, str],
    *,
    extra_headers: dict[str, str] | None = None,
    until: Callable[[str], bool],
    timeout: float = 2.0,
) -> tuple[dict[str, str], int, str]:
    headers = {**auth_headers, "Accept": "text/event-stream"}
    if extra_headers:
        headers.update(extra_headers)

    def predicate(raw: bytes, _response_headers: dict[str, str]) -> bool:
        return until(raw.decode("utf-8", errors="replace"))

    response_headers, status, raw = asyncio.run(
        _asgi_until(
            "GET",
            "/notifications/stream",
            headers,
            predicate=predicate,
            timeout=timeout,
        )
    )
    return response_headers, status, raw.decode("utf-8")


def parse_sse_frames(raw: str) -> list[dict[str, Any]]:
    frames: list[dict[str, Any]] = []
    for block in raw.replace("\r\n", "\n").replace("\r", "\n").split("\n\n"):
        if not block.strip():
            continue
        event = None
        event_id = None
        data_lines: list[str] = []
        comments: list[str] = []
        for line in block.split("\n"):
            if not line:
                continue
            if line.startswith(":"):
                comments.append(line[1:].lstrip())
                continue
            field, _, value = line.partition(":")
            value = value[1:] if value.startswith(" ") else value
            if field == "event":
                event = value
            elif field == "id":
                event_id = value
            elif field == "data":
                data_lines.append(value)
        frames.append(
            {
                "event": event,
                "id": event_id,
                "data": "\n".join(data_lines) if data_lines else None,
                "comments": comments,
            }
        )
    return frames


def named_payloads(raw: str) -> list[tuple[str, dict[str, Any]]]:
    out: list[tuple[str, dict[str, Any]]] = []
    for frame in parse_sse_frames(raw):
        if frame["event"] in {None, "message"} or not frame["data"]:
            continue
        out.append((frame["event"], json.loads(frame["data"])))
    return out


def test_sse_endpoint_content_type_is_event_stream(client: TestClient, auth_headers: dict[str, str]):
    client.post(
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
    response_headers, status, raw = read_sse_stream(
        auth_headers,
        until=lambda text: "event: emergency_order_created" in text,
    )
    assert status == 200
    assert "text/event-stream" in response_headers["content-type"]
    assert raw.startswith(": keep-alive") or ": keep-alive" in raw


def test_sse_endpoint_emits_emergency_order_created_on_the_wire(
    client: TestClient, auth_headers: dict[str, str]
):
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

    _headers, status, raw = read_sse_stream(
        auth_headers,
        until=lambda text: "event: emergency_order_created" in text and "data:" in text,
    )
    assert status == 200
    assert "event: emergency_order_created" in raw
    assert "event: rfp_ticket_created" not in raw
    assert "event: message" not in raw

    events = named_payloads(raw)
    assert events, raw
    event_name, payload = events[0]
    assert event_name == "emergency_order_created"
    assert payload["ticket_id"] == created["ticket_id"] == "BRS-000001"
    assert payload["status"] == "pending_approval"
    assert payload["ticket_type"] == "emergency_order"
    assert payload["location_id"] == "miami-downtown"
    assert payload["company"] == "brasaland"
    assert payload["amount_usd"] == 620
    assert payload["currency"] == "USD"
    assert payload["protein_days_remaining"] == 2
    assert payload["assignee"] == "Lucía Fernández"
    assert "created_at" in payload
    assert list(payload.keys())[:2] == ["ticket_id", "status"]


def test_sse_endpoint_emits_waste_escalation_created_on_the_wire(
    client: TestClient, auth_headers: dict[str, str]
):
    created = client.post(
        "/tickets",
        headers=auth_headers,
        json={
            "ticket_type": "waste_escalation",
            "location_id": "COL-01",
            "category": "unexplained_shrinkage",
            "kg": 6.5,
            "protein": "ribs",
            "consecutive_shrinkage_weeks": 0,
        },
    ).json()

    _headers, status, raw = read_sse_stream(
        auth_headers,
        until=lambda text: "event: waste_escalation_created" in text and "data:" in text,
    )
    assert status == 200
    assert "event: waste_escalation_created" in raw
    assert "event: rfp_ticket_created" not in raw
    assert "event: message" not in raw

    events = named_payloads(raw)
    assert events, raw
    event_name, payload = events[0]
    assert event_name == "waste_escalation_created"
    assert payload["ticket_id"] == created["ticket_id"] == "BRS-000001"
    assert payload["status"] == "escalated"
    assert payload["ticket_type"] == "waste_escalation"
    assert payload["location_id"] == "COL-01"
    assert payload["category"] == "unexplained_shrinkage"
    assert payload["kg"] == 6.5
    assert payload["protein"] == "ribs"
    assert payload["assignee"] == "Felipe Guerrero"
    assert payload["company"] == "brasaland"


def test_sse_endpoint_last_event_id_replays_only_missed_tickets(
    client: TestClient, auth_headers: dict[str, str]
):
    first = client.post(
        "/tickets",
        headers=auth_headers,
        json={
            "ticket_type": "emergency_order",
            "location_id": "miami-downtown",
            "amount_usd": 120,
            "currency": "USD",
        },
    ).json()
    second = client.post(
        "/tickets",
        headers=auth_headers,
        json={
            "ticket_type": "waste_escalation",
            "location_id": "bogota-norte",
            "category": "expiration",
            "kg": 1.2,
        },
    ).json()

    _headers, status, raw = read_sse_stream(
        auth_headers,
        extra_headers={"Last-Event-ID": first["ticket_id"]},
        until=lambda text: "event: waste_escalation_created" in text and "BRS-000002" in text,
    )
    assert status == 200
    events = named_payloads(raw)
    ids = [payload["ticket_id"] for _name, payload in events]
    assert second["ticket_id"] in ids
    assert first["ticket_id"] not in ids
    assert all(name != "message" for name, _payload in events)
