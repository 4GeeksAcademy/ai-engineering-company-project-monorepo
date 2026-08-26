from __future__ import annotations

import asyncio
import time
from asyncio import QueueEmpty
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from api.app import app
from chat import (
    AGENT_ID,
    ASSISTANT_EVENT_FIELDS,
    COMPANY_SLUG,
    ERROR_EVENT_FIELDS,
    EVENT_ASSISTANT_MESSAGE,
    EVENT_AUTH,
    EVENT_ERROR,
    EVENT_INTERRUPT,
    EVENT_SESSION,
    EVENT_TOKEN,
    EVENT_USER_MESSAGE,
    KnowledgeProducer,
    PART1_EVENT_NAMES,
    PART1_PAYLOAD_FIELDS,
    SERVER_EVENTS,
    SESSION_EVENT_FIELDS,
    SESSION_RECORD_FIELDS,
    SESSION_STATUSES,
    STREAM_MODE,
    TOKEN_EVENT_FIELDS,
    TURN_STATUSES,
    WS_CLOSE_NO_THREAD,
    WS_CLOSE_UNAUTHORIZED,
    hub,
    reset_chats,
    store,
)
from data.pipelines.rag import query_stream

REPO = Path(__file__).resolve().parents[2]
GENERIC_CHAT_EVENTS = {
    "message",
    "user_message",
    "interrupt",
    "session",
    "token",
    "assistant_message",
    "error",
    "token_chunk",
}
CONTEXT_FRAME_FIELDS = {
    EVENT_SESSION: set(SESSION_EVENT_FIELDS),
    EVENT_TOKEN: set(TOKEN_EVENT_FIELDS),
    EVENT_ASSISTANT_MESSAGE: set(ASSISTANT_EVENT_FIELDS),
    EVENT_ERROR: set(ERROR_EVENT_FIELDS),
}


def _assert_part2_frame(frame: dict) -> None:
    """Wire frames must be Part 2 CONTEXT entities, not Part 1 tickets."""
    assert isinstance(frame, dict)
    event = frame.get("event")
    assert event in SERVER_EVENTS
    assert event not in PART1_EVENT_NAMES
    assert event not in GENERIC_CHAT_EVENTS
    assert "ticket_id" not in frame
    assert "ticket_type" not in frame
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
        assert frame["status"] not in {"open", "pending_approval", "escalated"}
        assert isinstance(frame["messages"], list)
        for row in frame["messages"]:
            assert set(row) >= {"role", "content", "created_at"}
            assert row["role"] in {"user", "assistant"}
    if event == EVENT_ASSISTANT_MESSAGE:
        assert frame["status"] in TURN_STATUSES


def _backoffice_token(client: TestClient) -> str:
    response = client.post(
        "/auth/login",
        json={"username": "mariana", "password": "brasaland"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _open_thread(client: TestClient, token: str | None = None) -> tuple[str, str]:
    token = token or _backoffice_token(client)
    response = client.post(
        "/knowledge/sessions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert set(body) == set(SESSION_RECORD_FIELDS)
    assert body["session_id"].startswith("BRS-CHAT-")
    assert body["thread_id"] == body["session_id"]
    assert body["company"] == COMPANY_SLUG
    assert body["agent_id"] == AGENT_ID
    assert body["status"] == "idle"
    for field in PART1_PAYLOAD_FIELDS:
        assert field not in body
    return token, body["session_id"]


def _ws_path(
    token: str,
    session_id: str,
    *,
    token_param: str = "token",
    thread_param: str = "session_id",
) -> str:
    return f"/knowledge/ws?{token_param}={token}&{thread_param}={session_id}"


def test_query_stream_yields_model_deltas():
    with (
        patch("data.pipelines.rag.retrieve") as mock_retrieve,
        patch("data.pipelines.rag.generation_client") as mock_generation_client,
    ):
        mock_retrieve.return_value = [
            {
                "text": "Minimum stock rule: 3 days of main protein inventory.",
                "source_document": "supplier-ordering",
                "section": "Minimum stock rule",
            }
        ]

        def _chunk(text: str) -> MagicMock:
            chunk = MagicMock()
            chunk.choices = [MagicMock(delta=MagicMock(content=text))]
            return chunk

        empty = MagicMock()
        empty.choices = [MagicMock(delta=MagicMock(content=None))]
        mock_generation_client.chat.completions.create.return_value = [
            empty,
            _chunk("Locations "),
            _chunk("must keep 3 days."),
        ]

        deltas = list(query_stream("What is the minimum stock rule for proteins?"))

        assert deltas == ["Locations ", "must keep 3 days."]
        assert all(isinstance(delta, str) for delta in deltas)
        call_kwargs = mock_generation_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["stream"] is True


def test_query_stream_closes_model_stream_when_cancelled():
    closed: list[bool] = []
    cancel = {"stop": False}

    def _chunk(text: str) -> MagicMock:
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=MagicMock(content=text))]
        return chunk

    class FakeStream:
        def __iter__(self):
            yield _chunk("Locations ")
            cancel["stop"] = True
            yield _chunk("must keep 3 days.")
            yield _chunk(" leftover")

        def close(self):
            closed.append(True)

    abort_hooks: list = []

    with (
        patch("data.pipelines.rag.retrieve") as mock_retrieve,
        patch("data.pipelines.rag.generation_client") as mock_generation_client,
    ):
        mock_retrieve.return_value = [
            {
                "text": "Minimum stock rule: 3 days of main protein inventory.",
                "source_document": "supplier-ordering",
                "section": "Minimum stock rule",
            }
        ]
        mock_generation_client.chat.completions.create.return_value = FakeStream()
        deltas = list(
            query_stream(
                "What is the minimum stock rule for proteins?",
                should_cancel=lambda: cancel["stop"],
                on_abort=abort_hooks.append,
            )
        )

    assert deltas == ["Locations "]
    assert closed == [True]
    assert abort_hooks
    abort_hooks[0]()
    assert closed == [True, True]


def test_websocket_session_uses_context_fields():
    reset_chats()
    with TestClient(app) as client:
        token, session_id = _open_thread(client)
        with client.websocket_connect(_ws_path(token, session_id)) as websocket:
            handshake = websocket.receive_json()

    _assert_part2_frame(handshake)
    assert handshake["event"] == EVENT_SESSION
    assert handshake["session_id"] == session_id
    assert handshake["thread_id"] == session_id
    assert handshake["company"] == COMPANY_SLUG
    assert handshake["agent_id"] == AGENT_ID
    assert handshake["status"] == "idle"
    assert handshake["messages"] == []
    assert set(handshake) == set(SESSION_EVENT_FIELDS)


def test_unauthenticated_websocket_is_rejected_before_chat_events():
    reset_chats()
    with TestClient(app) as client:
        with client.websocket_connect("/knowledge/ws") as websocket:
            websocket.send_json(
                {"event": EVENT_USER_MESSAGE, "content": "What is Brasa Points?"}
            )
            with pytest.raises(WebSocketDisconnect) as excinfo:
                websocket.receive_json()
    assert excinfo.value.code == WS_CLOSE_UNAUTHORIZED
    assert store.active_ids() == ()


def test_invalid_query_token_is_rejected_before_chat_events():
    reset_chats()
    with TestClient(app) as client:
        with client.websocket_connect("/knowledge/ws?token=not-a-jwt") as websocket:
            with pytest.raises(WebSocketDisconnect) as excinfo:
                websocket.receive_json()
    assert excinfo.value.code == WS_CLOSE_UNAUTHORIZED
    assert store.active_ids() == ()


def test_access_token_query_param_authenticates_like_sse():
    reset_chats()
    with TestClient(app) as client:
        token, session_id = _open_thread(client)
        with client.websocket_connect(
            _ws_path(token, session_id, token_param="access_token")
        ) as websocket:
            handshake = websocket.receive_json()
    assert handshake["event"] == EVENT_SESSION
    assert handshake["session_id"] == session_id


def test_first_auth_frame_authenticates_without_query_token():
    reset_chats()
    with TestClient(app) as client:
        token, session_id = _open_thread(client)
        with client.websocket_connect(f"/knowledge/ws?session_id={session_id}") as websocket:
            websocket.send_json({"event": EVENT_AUTH, "token": token})
            handshake = websocket.receive_json()
    assert handshake["event"] == EVENT_SESSION
    assert handshake["agent_id"] == AGENT_ID
    assert handshake["session_id"] == session_id
    _assert_part2_frame(handshake)


def test_create_session_requires_backoffice_jwt():
    reset_chats()
    with TestClient(app) as client:
        response = client.post("/knowledge/sessions")
    assert response.status_code == 401
    assert store.active_ids() == ()


def test_websocket_without_session_id_is_rejected_before_chat_events():
    reset_chats()
    with TestClient(app) as client:
        token = _backoffice_token(client)
        with client.websocket_connect(f"/knowledge/ws?token={token}") as websocket:
            with pytest.raises(WebSocketDisconnect) as excinfo:
                websocket.receive_json()
    assert excinfo.value.code == WS_CLOSE_NO_THREAD
    assert store.active_ids() == ()


def test_unknown_session_id_is_rejected_before_chat_events():
    reset_chats()
    with TestClient(app) as client:
        token = _backoffice_token(client)
        with client.websocket_connect(
            f"/knowledge/ws?token={token}&session_id=BRS-CHAT-999999"
        ) as websocket:
            with pytest.raises(WebSocketDisconnect) as excinfo:
                websocket.receive_json()
    assert excinfo.value.code == WS_CLOSE_NO_THREAD
    assert store.active_ids() == ()


def test_thread_id_query_binds_the_same_conversation():
    reset_chats()
    with TestClient(app) as client:
        token, session_id = _open_thread(client)
        with client.websocket_connect(
            _ws_path(token, session_id, thread_param="thread_id")
        ) as websocket:
            handshake = websocket.receive_json()
    assert handshake["session_id"] == session_id
    assert handshake["thread_id"] == session_id


def test_reconnect_resumes_the_same_thread():
    reset_chats()

    def fake_stream(question, history=None, should_cancel=None, on_abort=None):
        yield f"Answer about {question}."

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
                _drain_until_assistant(websocket)
            with client.websocket_connect(_ws_path(token, session_id)) as websocket:
                handshake = websocket.receive_json()
                live = store.get(session_id)

    assert handshake["session_id"] == session_id
    assert handshake["thread_id"] == session_id
    assert handshake["messages"], "reconnect must restore the thread checkpoint, not an empty chat"
    assert [row["role"] for row in handshake["messages"]] == ["user", "assistant"]
    assert handshake["messages"][0]["content"] == "What is Brasa Points?"
    assert "Brasa Points" in handshake["messages"][1]["content"]
    assert [row["role"] for row in live["messages"]] == ["user", "assistant"]
    assert live["messages"] == handshake["messages"]


def test_reconnect_with_same_session_id_restores_checkpoint_not_empty_chat():
    """Reconnect WS /knowledge/ws?session_id=… must replay thread history."""
    reset_chats()

    def fake_stream(question, history=None, should_cancel=None, on_abort=None):
        yield "Minimum stock is 3 days of protein."

    with patch("chat.query_stream", side_effect=fake_stream):
        with TestClient(app) as client:
            token, session_id = _open_thread(client)
            with client.websocket_connect(_ws_path(token, session_id)) as first:
                first_hello = first.receive_json()
                assert first_hello["messages"] == []
                first.send_json(
                    {
                        "event": EVENT_USER_MESSAGE,
                        "content": "What is the minimum stock rule for proteins?",
                    }
                )
                _drain_until_assistant(first)
            with client.websocket_connect(_ws_path(token, session_id)) as second:
                checkpoint = second.receive_json()
            _, other_id = _open_thread(client, token)
            with client.websocket_connect(_ws_path(token, other_id)) as other:
                other_hello = other.receive_json()

    _assert_part2_frame(checkpoint)
    assert checkpoint["event"] == EVENT_SESSION
    assert checkpoint["session_id"] == session_id
    assert checkpoint["messages"] != []
    assert len(checkpoint["messages"]) == 2
    assert checkpoint["messages"][0] == store.get(session_id)["messages"][0]
    assert checkpoint["messages"][0]["role"] == "user"
    assert checkpoint["messages"][1]["role"] == "assistant"
    assert "3 days of protein" in checkpoint["messages"][1]["content"]
    assert other_hello["session_id"] != session_id
    assert other_hello["messages"] == []


def _drain_until_assistant(websocket) -> list[dict]:
    frames = []
    while True:
        frame = websocket.receive_json()
        _assert_part2_frame(frame)
        frames.append(frame)
        if frame.get("event") == EVENT_ASSISTANT_MESSAGE:
            return frames


def test_each_websocket_is_its_own_session():
    reset_chats()
    with TestClient(app) as client:
        token, first_id = _open_thread(client)
        _, second_id = _open_thread(client, token)
        with client.websocket_connect(_ws_path(token, first_id)) as first:
            with client.websocket_connect(_ws_path(token, second_id)) as second:
                handshake_a = first.receive_json()
                handshake_b = second.receive_json()
                assert handshake_a["event"] == EVENT_SESSION
                assert handshake_b["event"] == EVENT_SESSION
                assert handshake_a["session_id"] == first_id
                assert handshake_b["session_id"] == second_id
                assert handshake_a["session_id"] != handshake_b["session_id"]
                assert set(store.active_ids()) == {first_id, second_id}


def test_connection_stays_open_for_multiple_turns_on_one_session():
    reset_chats()
    calls: list[dict] = []

    def fake_stream(question, history=None, should_cancel=None, on_abort=None):
        calls.append({"question": question, "history": list(history or [])})
        yield f"Answer about {question}."

    with patch("chat.query_stream", side_effect=fake_stream):
        with TestClient(app) as client:
            token, session_id = _open_thread(client)
            with client.websocket_connect(_ws_path(token, session_id)) as websocket:
                handshake = websocket.receive_json()
                session_id = handshake["session_id"]
                websocket.send_json(
                    {
                        "event": EVENT_USER_MESSAGE,
                        "content": "What is Brasa Points?",
                    }
                )
                first_turn = _drain_until_assistant(websocket)
                websocket.send_json(
                    {
                        "event": EVENT_USER_MESSAGE,
                        "content": "What is the minimum stock rule for proteins?",
                    }
                )
                second_turn = _drain_until_assistant(websocket)
                live = store.get(session_id)

    assert handshake["event"] == EVENT_SESSION
    assert all(frame.get("session_id") == session_id for frame in first_turn if "session_id" in frame)
    assert all(frame.get("session_id") == session_id for frame in second_turn if "session_id" in frame)
    assert first_turn[-1]["status"] == "complete"
    assert second_turn[-1]["status"] == "complete"
    assert live is not None
    assert [row["role"] for row in live["messages"]] == [
        "user",
        "assistant",
        "user",
        "assistant",
    ]
    assert calls[1]["history"][0]["role"] == "user"
    assert calls[1]["history"][1]["role"] == "assistant"
    assert store.get(session_id) is not None
    assert store.get(session_id)["attached"] is False


def test_unknown_event_keeps_the_session_open():
    reset_chats()

    def fake_stream(question, history=None, should_cancel=None, on_abort=None):
        yield "Locations must keep 3 days of protein stock."

    with patch("chat.query_stream", side_effect=fake_stream):
        with TestClient(app) as client:
            token, session_id = _open_thread(client)
            with client.websocket_connect(_ws_path(token, session_id)) as websocket:
                handshake = websocket.receive_json()
                websocket.send_json({"event": "message", "content": "hello"})
                error = websocket.receive_json()
                websocket.send_json(
                    {
                        "event": EVENT_USER_MESSAGE,
                        "content": "What is the minimum stock rule for proteins?",
                    }
                )
                frames = _drain_until_assistant(websocket)

    assert error["event"] == EVENT_ERROR
    assert handshake["session_id"] == frames[-1]["session_id"]
    assert frames[-1]["status"] == "complete"


def test_websocket_streams_named_token_events():
    reset_chats()

    def fake_stream(question, history=None, should_cancel=None, on_abort=None):
        yield "Locations "
        yield "must keep 3 days of protein stock."

    with patch("chat.query_stream", side_effect=fake_stream):
        with TestClient(app) as client:
            token, session_id = _open_thread(client)
            with client.websocket_connect(_ws_path(token, session_id)) as websocket:
                handshake = websocket.receive_json()
                websocket.send_json(
                    {
                        "event": EVENT_USER_MESSAGE,
                        "content": "What is the minimum stock rule for proteins?",
                    }
                )
                frames = []
                while True:
                    frame = websocket.receive_json()
                    frames.append(frame)
                    if frame.get("event") == EVENT_ASSISTANT_MESSAGE:
                        break

    events = [frame["event"] for frame in frames]
    _assert_part2_frame(handshake)
    for frame in frames:
        _assert_part2_frame(frame)
    assert handshake["event"] == EVENT_SESSION
    assert EVENT_TOKEN in events
    assert EVENT_ASSISTANT_MESSAGE in events
    token_frames = [frame for frame in frames if frame["event"] == EVENT_TOKEN]
    tokens = [frame["delta"] for frame in token_frames]
    assert STREAM_MODE == "messages"
    assert tokens == ["Locations ", "must keep 3 days of protein stock."]
    assert len(token_frames) == 2
    token_indexes = [index for index, event in enumerate(events) if event == EVENT_TOKEN]
    final_index = events.index(EVENT_ASSISTANT_MESSAGE)
    assert token_indexes
    assert max(token_indexes) < final_index
    for frame in token_frames:
        _assert_part2_frame(frame)
        assert set(frame) == set(TOKEN_EVENT_FIELDS)
        assert frame["session_id"] == handshake["session_id"]
        assert frame["thread_id"] == handshake["session_id"]
        assert isinstance(frame["delta"], str)
        assert "updates" not in frame
        assert "values" not in frame
    final = next(frame for frame in frames if frame["event"] == EVENT_ASSISTANT_MESSAGE)
    assert final["status"] == "complete"
    assert final["session_id"] == handshake["session_id"]
    assert final["thread_id"] == handshake["session_id"]
    assert "".join(tokens) == final["content"]
    assert "protein stock" in final["content"]
    assert set(events).issubset(set(SERVER_EVENTS))


def test_interrupt_stops_stream_before_the_answer_finishes():
    reset_chats()
    aborted: list[bool] = []

    def slow_stream(question, history=None, should_cancel=None, on_abort=None):
        stop = {"value": False}

        def close_stream() -> None:
            stop["value"] = True
            aborted.append(True)

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
                handshake = websocket.receive_json()
                websocket.send_json(
                    {
                        "event": EVENT_USER_MESSAGE,
                        "content": "Explain the protein stock rule in detail.",
                    }
                )
                saw_token = False
                while True:
                    frame = websocket.receive_json()
                    _assert_part2_frame(frame)
                    if frame.get("event") == EVENT_TOKEN:
                        saw_token = True
                        websocket.send_json({"event": EVENT_INTERRUPT})
                        break
                rest = []
                while True:
                    frame = websocket.receive_json()
                    rest.append(frame)
                    if frame.get("event") == EVENT_ASSISTANT_MESSAGE:
                        break

    _assert_part2_frame(handshake)
    for frame in rest:
        _assert_part2_frame(frame)
    assert handshake["event"] == EVENT_SESSION
    assert saw_token
    assert aborted == [True]
    assert EVENT_TOKEN not in {frame["event"] for frame in rest}
    final = next(frame for frame in rest if frame["event"] == EVENT_ASSISTANT_MESSAGE)
    assert final["status"] == "interrupted"
    assert final["content"] != "Minimum stock is three days of protein."
    assert "days of protein." not in final["content"]


def test_unknown_client_event_is_named_error():
    reset_chats()
    with TestClient(app) as client:
        token, session_id = _open_thread(client)
        with client.websocket_connect(_ws_path(token, session_id)) as websocket:
            websocket.receive_json()
            websocket.send_json({"event": "message", "content": "hello"})
            payload = websocket.receive_json()
    _assert_part2_frame(payload)
    assert payload["event"] == EVENT_ERROR
    assert EVENT_USER_MESSAGE in payload["detail"]
    assert EVENT_INTERRUPT in payload["detail"]


def test_interrupt_with_content_steers_a_new_turn():
    reset_chats()
    questions: list[str] = []

    def fake_stream(question, history=None, should_cancel=None, on_abort=None):
        questions.append(question)
        stop = {"value": False}

        def close_stream() -> None:
            stop["value"] = True

        if on_abort:
            on_abort(close_stream)
        if "first" in question:
            for part in ["Wrong path ", "should not finish."]:
                if stop["value"] or (should_cancel and should_cancel()):
                    return
                yield part
                for _ in range(12):
                    if stop["value"] or (should_cancel and should_cancel()):
                        return
                    time.sleep(0.01)
            return
        yield "Minimum stock is 3 days of protein."

    with patch("chat.query_stream", side_effect=fake_stream):
        with TestClient(app) as client:
            token, session_id = _open_thread(client)
            with client.websocket_connect(_ws_path(token, session_id)) as websocket:
                websocket.receive_json()
                websocket.send_json(
                    {
                        "event": EVENT_USER_MESSAGE,
                        "content": "Tell me the first thing that comes to mind.",
                    }
                )
                while True:
                    frame = websocket.receive_json()
                    if frame.get("event") == EVENT_TOKEN:
                        websocket.send_json(
                            {
                                "event": EVENT_INTERRUPT,
                                "content": "What is the minimum stock rule for proteins?",
                            }
                        )
                        break
                finals = []
                interrupted_rest = []
                while True:
                    frame = websocket.receive_json()
                    interrupted_rest.append(frame)
                    if frame.get("event") == EVENT_ASSISTANT_MESSAGE:
                        finals.append(frame)
                        break
                assert EVENT_TOKEN not in {frame["event"] for frame in interrupted_rest}
                while True:
                    frame = websocket.receive_json()
                    if frame.get("event") == EVENT_ASSISTANT_MESSAGE:
                        finals.append(frame)
                        if frame.get("status") == "complete":
                            break

    assert finals[0]["status"] == "interrupted"
    assert "should not finish." not in finals[0]["content"]
    assert finals[-1]["status"] == "complete"
    assert "3 days of protein" in finals[-1]["content"]
    assert any("first thing" in question for question in questions)
    assert any("minimum stock" in question for question in questions)


def test_hub_fans_out_to_subscribers_on_one_thread():
    reset_chats()

    async def _run():
        topic = "BRS-CHAT-000001"
        first = hub.subscribe(topic)
        second = hub.subscribe(topic)
        other = hub.subscribe("BRS-CHAT-000002")
        try:
            await hub.publish(
                topic,
                {"event": EVENT_TOKEN, "session_id": topic, "thread_id": topic, "delta": "Hi"},
            )
            assert first.get_nowait()["delta"] == "Hi"
            assert second.get_nowait()["delta"] == "Hi"
            with pytest.raises(QueueEmpty):
                other.get_nowait()
        finally:
            hub.unsubscribe(topic, first)
            hub.unsubscribe(topic, second)
            hub.unsubscribe("BRS-CHAT-000002", other)

    asyncio.run(_run())


def test_producer_publishes_tokens_without_a_websocket():
    reset_chats()
    session = store.create()
    session_id = session["session_id"]

    def fake_stream(question, history=None, should_cancel=None, on_abort=None):
        yield "Locations "
        yield "must keep 3 days of protein stock."

    async def _run():
        queue = hub.subscribe(session_id)
        producer = KnowledgeProducer(session_id)
        try:
            with patch("chat.query_stream", side_effect=fake_stream):
                await producer.start_turn("What is the minimum stock rule for proteins?")
                assert producer._task is not None
                await producer._task
            frames = []
            while True:
                try:
                    frames.append(queue.get_nowait())
                except QueueEmpty:
                    break
            return frames
        finally:
            hub.unsubscribe(session_id, queue)

    frames = asyncio.run(_run())
    for frame in frames:
        _assert_part2_frame(frame)
    tokens = [frame for frame in frames if frame["event"] == EVENT_TOKEN]
    final = next(frame for frame in frames if frame["event"] == EVENT_ASSISTANT_MESSAGE)
    assert [frame["delta"] for frame in tokens] == [
        "Locations ",
        "must keep 3 days of protein stock.",
    ]
    assert final["status"] == "complete"
    assert final["content"] == "Locations must keep 3 days of protein stock."


def test_producer_interrupt_stops_hub_tokens_without_a_websocket():
    reset_chats()
    session = store.create()
    session_id = session["session_id"]
    aborted: list[bool] = []

    def slow_stream(question, history=None, should_cancel=None, on_abort=None):
        stop = {"value": False}

        def close_stream() -> None:
            stop["value"] = True
            aborted.append(True)

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

    async def _run():
        queue = hub.subscribe(session_id)
        producer = KnowledgeProducer(session_id)
        try:
            with patch("chat.query_stream", side_effect=slow_stream):
                await producer.start_turn("Explain the protein stock rule in detail.")
                first_token = None
                while True:
                    frame = await asyncio.wait_for(queue.get(), timeout=2)
                    if frame.get("event") == EVENT_TOKEN:
                        first_token = frame
                        break
                await producer.interrupt()
                rest = []
                while True:
                    frame = await asyncio.wait_for(queue.get(), timeout=2)
                    rest.append(frame)
                    if frame.get("event") == EVENT_ASSISTANT_MESSAGE:
                        break
            return first_token, rest
        finally:
            hub.unsubscribe(session_id, queue)

    first_token, rest = asyncio.run(_run())
    assert first_token is not None
    assert aborted == [True]
    assert EVENT_TOKEN not in {frame["event"] for frame in rest}
    final = next(frame for frame in rest if frame["event"] == EVENT_ASSISTANT_MESSAGE)
    assert final["status"] == "interrupted"
    assert "days of protein." not in final["content"]


def test_chat_lives_in_existing_services_uis_tests_layout():
    chat_src = (REPO / "services" / "api" / "chat.py").read_text(encoding="utf-8")
    consumer_src = (REPO / "services" / "api" / "routers" / "chat.py").read_text(encoding="utf-8")
    assert (REPO / "services" / "api" / "chat.py").is_file()
    assert (REPO / "services" / "api" / "routers" / "chat.py").is_file()
    assert (REPO / "services" / "api" / "routers" / "knowledge.py").is_file()
    assert (REPO / "uis" / "knowledge" / "index.html").is_file()
    assert (REPO / "uis" / "knowledge" / "chat.js").is_file()
    assert (REPO / "tests" / "api" / "test_websocket_chat.py").is_file()
    assert not (REPO / "delivery").exists()
    assert "class KnowledgeProducer" in chat_src
    assert "class ChatEventHub" in chat_src
    assert "query_stream" in chat_src
    assert "query_stream" not in consumer_src
    assert "hub.subscribe" in consumer_src
    assert "websocket.send_json" not in chat_src
    assert "from fastapi import WebSocket" not in chat_src



def test_knowledge_ui_uses_named_websocket_events():
    html = (REPO / "uis" / "knowledge" / "index.html").read_text(encoding="utf-8")
    chat_js = (REPO / "uis" / "knowledge" / "chat.js").read_text(encoding="utf-8")
    combined = html + chat_js

    assert "chat.js" in html
    assert "new WebSocket" in combined
    assert "/knowledge/ws?token=" in combined or "/knowledge/ws?token=${" in combined
    assert "session_id=" in combined
    assert "/knowledge/sessions" in combined
    assert "/knowledge/query" not in combined
    pages_ui = (REPO / "services" / "api" / "uis" / "pages" / "knowledge.js").read_text(
        encoding="utf-8"
    )
    assert "/knowledge/query" not in pages_ui
    assert "new WebSocket" in chat_js
    assert "query-form" in html
    assert 'id="question"' in html
    assert "Ask Assistant" in html
    assert "brasaland-backoffice-token" in combined
    assert "/auth/login" in combined
    assert EVENT_AUTH in combined
    assert EVENT_USER_MESSAGE in combined
    assert EVENT_INTERRUPT in combined
    assert "interrupt-btn" in html
    assert "abortInFlight" in combined
    assert "is-interrupted" in combined
    assert "Interrupted" in combined
    assert EVENT_SESSION in combined
    assert EVENT_TOKEN in combined
    assert "payload.delta" in combined
    assert "appendToken" in combined
    assert "textContent = payload.content" not in combined
    assert EVENT_ASSISTANT_MESSAGE in combined
    assert EVENT_ERROR in combined
    assert "emergency_order_created" not in combined
    assert "waste_escalation_created" not in combined
    assert "rfp_ticket_created" not in combined
    assert "ticket_id" not in combined
    assert "ticket_type" not in combined
    assert "location_id" not in combined
    assert "payload.messages" in combined
    assert "renderCheckpoint" in combined


def test_knowledge_chat_assets_are_served_from_uis():
    with TestClient(app) as client:
        page = client.get("/knowledge/")
        script = client.get("/knowledge/chat.js")
    assert page.status_code == 200
    assert "chat.js" in page.text
    assert script.status_code == 200
    assert EVENT_USER_MESSAGE in script.text
    assert "new WebSocket" in script.text
    assert "appendToken" in script.text
    assert "payload.delta" in script.text
    assert "/knowledge/query" not in script.text
    assert "/knowledge/query" not in page.text
