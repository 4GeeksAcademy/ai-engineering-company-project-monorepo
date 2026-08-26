"""Unit tests for the Brasaland WebSocket event contract.

The assignment rubric talks about token_chunk, interrupt, generation_interrupted,
and generation_completed. This CONTEXT sends those as:

- token_chunk → ``knowledge_token`` (``delta``)
- interrupt → client ``knowledge_interrupt``
- generation_interrupted → ``knowledge_assistant_message`` with ``status: interrupted``
- generation_completed → ``knowledge_assistant_message`` with ``status: complete``

Generic rubric names and Part 1 SSE ticket payloads must not appear on the wire.
"""

from __future__ import annotations

import time
from unittest.mock import patch

from fastapi.testclient import TestClient

from api.app import app
from chat import (
    AGENT_ID,
    ASSISTANT_EVENT_FIELDS,
    COMPANY_SLUG,
    ERROR_EVENT_FIELDS,
    EVENT_ASSISTANT_MESSAGE,
    EVENT_ERROR,
    EVENT_INTERRUPT,
    EVENT_SESSION,
    EVENT_TOKEN,
    EVENT_USER_MESSAGE,
    GENERATION_COMPLETED,
    GENERATION_INTERRUPTED,
    PART1_EVENT_NAMES,
    PART1_PAYLOAD_FIELDS,
    SERVER_EVENTS,
    SESSION_EVENT_FIELDS,
    SESSION_RECORD_FIELDS,
    SESSION_STATUSES,
    TOKEN_CHUNK,
    TOKEN_EVENT_FIELDS,
    TURN_STATUSES,
    reset_chats,
)

GENERIC_CHAT_EVENTS = {
    "message",
    "user_message",
    "interrupt",
    "session",
    "token",
    "assistant_message",
    "error",
    "token_chunk",
    "generation_interrupted",
    "generation_completed",
}
CONTEXT_FRAME_FIELDS = {
    EVENT_SESSION: set(SESSION_EVENT_FIELDS),
    EVENT_TOKEN: set(TOKEN_EVENT_FIELDS),
    EVENT_ASSISTANT_MESSAGE: set(ASSISTANT_EVENT_FIELDS),
    EVENT_ERROR: set(ERROR_EVENT_FIELDS),
}


def _assert_part2_frame(frame: dict) -> None:
    assert isinstance(frame, dict)
    event = frame.get("event")
    assert event in SERVER_EVENTS
    assert event not in PART1_EVENT_NAMES
    assert event not in GENERIC_CHAT_EVENTS
    for field in PART1_PAYLOAD_FIELDS:
        assert field not in frame
    assert set(frame) == CONTEXT_FRAME_FIELDS[event]
    if "session_id" in frame:
        assert str(frame["session_id"]).startswith("BRS-CHAT-")
        assert frame["thread_id"] == frame["session_id"]
    if event == EVENT_SESSION:
        assert frame["company"] == COMPANY_SLUG
        assert frame["agent_id"] == AGENT_ID
        assert frame["status"] in SESSION_STATUSES
        assert isinstance(frame["messages"], list)
    if event == EVENT_ASSISTANT_MESSAGE:
        assert frame["status"] in TURN_STATUSES


def _open_thread(client: TestClient) -> tuple[str, str]:
    response = client.post(
        "/auth/login",
        json={"username": "mariana", "password": "brasaland"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    created = client.post(
        "/knowledge/sessions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert created.status_code == 201
    body = created.json()
    assert set(body) == set(SESSION_RECORD_FIELDS)
    return token, body["session_id"]


def _ws_path(token: str, session_id: str) -> str:
    return f"/knowledge/ws?token={token}&session_id={session_id}"


def test_contract_maps_rubric_names_onto_context_events():
    assert TOKEN_CHUNK == EVENT_TOKEN == "knowledge_token"
    assert TOKEN_CHUNK != "token_chunk"
    assert EVENT_INTERRUPT == "knowledge_interrupt"
    assert EVENT_INTERRUPT != "interrupt"
    assert GENERATION_INTERRUPTED == "interrupted"
    assert GENERATION_COMPLETED == "complete"
    assert EVENT_ASSISTANT_MESSAGE == "knowledge_assistant_message"


def test_token_chunk_events_are_knowledge_token_deltas():
    """token_chunk: each model delta is flushed as knowledge_token before completion."""
    reset_chats()

    def fake_stream(question, history=None, should_cancel=None, on_abort=None):
        yield "Locations "
        yield "must keep 3 days of protein stock."

    with patch("chat.query_stream", side_effect=fake_stream):
        with TestClient(app) as client:
            token, session_id = _open_thread(client)
            with client.websocket_connect(_ws_path(token, session_id)) as websocket:
                websocket.receive_json()
                websocket.send_json(
                    {
                        "event": EVENT_USER_MESSAGE,
                        "content": "What is the minimum stock rule for proteins?",
                    }
                )
                token_chunks = []
                completed = None
                while True:
                    frame = websocket.receive_json()
                    _assert_part2_frame(frame)
                    assert frame["event"] != "token_chunk"
                    if frame["event"] == TOKEN_CHUNK:
                        token_chunks.append(frame["delta"])
                    if frame["event"] == EVENT_ASSISTANT_MESSAGE:
                        completed = frame
                        break

    assert token_chunks == ["Locations ", "must keep 3 days of protein stock."]
    assert completed is not None
    assert completed["status"] == GENERATION_COMPLETED
    assert "".join(token_chunks) == completed["content"]


def test_interrupt_emits_generation_interrupted_and_stops_token_chunks():
    """interrupt → abort; generation_interrupted; no further token_chunk events."""
    reset_chats()

    def slow_stream(question, history=None, should_cancel=None, on_abort=None):
        stop = {"value": False}

        def close_stream() -> None:
            stop["value"] = True

        if on_abort:
            on_abort(close_stream)
        for part in ["Minimum ", "stock ", "is three ", "days of protein."]:
            if stop["value"] or (should_cancel and should_cancel()):
                return
            yield part
            for _ in range(12):
                if stop["value"] or (should_cancel and should_cancel()):
                    return
                time.sleep(0.01)

    with patch("chat.query_stream", side_effect=slow_stream):
        with TestClient(app) as client:
            token, session_id = _open_thread(client)
            with client.websocket_connect(_ws_path(token, session_id)) as websocket:
                websocket.receive_json()
                websocket.send_json(
                    {
                        "event": EVENT_USER_MESSAGE,
                        "content": "Explain the protein stock rule in detail.",
                    }
                )
                while True:
                    frame = websocket.receive_json()
                    _assert_part2_frame(frame)
                    if frame["event"] == TOKEN_CHUNK:
                        websocket.send_json({"event": EVENT_INTERRUPT})
                        break
                rest = []
                interrupted = None
                while True:
                    frame = websocket.receive_json()
                    _assert_part2_frame(frame)
                    rest.append(frame)
                    if frame["event"] == EVENT_ASSISTANT_MESSAGE:
                        interrupted = frame
                        break

    assert interrupted is not None
    assert interrupted["status"] == GENERATION_INTERRUPTED
    assert interrupted["event"] != "generation_interrupted"
    assert TOKEN_CHUNK not in {frame["event"] for frame in rest}
    assert "token_chunk" not in {frame["event"] for frame in rest}
    assert "days of protein." not in interrupted["content"]


def test_generation_completed_follows_token_chunks():
    """generation_completed: full answer after token_chunk stream, status complete."""
    reset_chats()

    def fake_stream(question, history=None, should_cancel=None, on_abort=None):
        yield "Brasa Points "
        yield "is the loyalty program."

    with patch("chat.query_stream", side_effect=fake_stream):
        with TestClient(app) as client:
            token, session_id = _open_thread(client)
            with client.websocket_connect(_ws_path(token, session_id)) as websocket:
                websocket.receive_json()
                websocket.send_json(
                    {
                        "event": EVENT_USER_MESSAGE,
                        "content": "What is Brasa Points?",
                    }
                )
                events = []
                while True:
                    frame = websocket.receive_json()
                    _assert_part2_frame(frame)
                    events.append(frame)
                    if frame["event"] == EVENT_ASSISTANT_MESSAGE:
                        break

    token_indexes = [
        index for index, frame in enumerate(events) if frame["event"] == TOKEN_CHUNK
    ]
    completed = events[-1]
    assert token_indexes
    assert max(token_indexes) < len(events) - 1
    assert completed["event"] == EVENT_ASSISTANT_MESSAGE
    assert completed["status"] == GENERATION_COMPLETED
    assert completed["status"] != "generation_completed"
    assert completed["content"] == "Brasa Points is the loyalty program."
    assert "ticket_id" not in completed
