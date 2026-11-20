"""
tests/api/test_websocket_chat.py
Suite de pruebas para el canal WebSocket bidireccional del agente `first_line_support`.
Verifica JWT handshake, streaming `token_chunk`, abort real (`generation_interrupted`),
rehidratación (`session_snapshot`) y difusión Pub/Sub (`chat.<session_id>`).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import create_engine
from starlette.websockets import WebSocketDisconnect

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.api.main import app
from services.api.security import create_access_token
from services.api.ws_chat_manager import chat_session_manager


@pytest.fixture(autouse=True)
def reset_chat_sessions(tmp_path: Path):
    """Aísla la base de datos y limpia los canales en memoria entre pruebas."""
    test_db = create_engine(
        f"sqlite:///{tmp_path / 'test_ws_chat.db'}",
        connect_args={"check_same_thread": False},
    )
    chat_session_manager.set_engine(test_db)
    chat_session_manager._redis_unavailable = True
    chat_session_manager._channels.clear()
    yield
    chat_session_manager._channels.clear()


@pytest.fixture
def valid_jwt() -> str:
    return create_access_token(data={"sub": "client-user-1"})


@pytest.fixture
def mock_auth_user():
    with patch(
        "services.api.routes.auth.get_user_by_id",
        return_value={"id": "client-user-1", "email": "cliente@nexova.com", "role": "user"},
    ):
        yield


def test_websocket_rejects_invalid_or_missing_token():
    """Verifica que una conexión sin JWT válido sea rechazada antes de recibir eventos de chat."""
    with TestClient(app) as client:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/agent/ws/chat_unauth?token=invalid.jwt.token") as ws:
                ws.receive_json()


def test_websocket_streams_tokens_and_completes(valid_jwt, mock_auth_user):
    """Verifica `session_snapshot` inicial + streaming `token_chunk` + `generation_completed`."""

    async def fake_astream(initial_state, config=None, stream_mode=None):
        assert config["configurable"]["thread_id"] == "chat_0157"
        yield ("updates", {"generate_answer": {"answer": "Claro, la garantía es de 90 días."}})

    with patch("services.api.routes.agent.agent_app.astream", side_effect=fake_astream):
        with TestClient(app) as client:
            with client.websocket_connect(f"/agent/ws/chat_0157?token={valid_jwt}") as ws:
                snapshot = ws.receive_json()
                assert snapshot["event"] == "session_snapshot"
                assert snapshot["data"]["session_id"] == "chat_0157"
                assert snapshot["data"]["messages"] == []

                ws.send_json({
                    "event": "user_message",
                    "data": {"session_id": "chat_0157", "text": "¿Cuál es la garantía?"},
                })

                tokens = []
                completed = None
                while True:
                    msg = ws.receive_json()
                    if msg["event"] == "token_chunk":
                        tokens.append(msg["data"])
                    elif msg["event"] == "generation_completed":
                        completed = msg["data"]
                        break

                assert len(tokens) > 1
                assert [t["sequence"] for t in tokens] == list(range(1, len(tokens) + 1))
                assert "".join(t["token"] for t in tokens) == "Claro, la garantía es de 90 días."
                assert completed["session_id"] == "chat_0157"
                assert completed["message_id"].startswith("msg_")


def test_websocket_interrupt_aborts_generation_and_rehydrates_on_reconnect(valid_jwt, mock_auth_user):
    """
    Verifica:
    1. Interrumpir tras 2 tokens detiene más tokens de la generación original (`generation_interrupted`).
    2. Arranca un nuevo turno que refleja `new_input`.
    3. Reconectar con el mismo `session_id` restaura todo el historial incluyendo el mensaje `interrupted`.
    """
    long_turn_1 = " ".join([f"palabra{i}" for i in range(1, 35)])
    turn_2_answer = "Entendido, revisemos tu factura pendiente ahora mismo."
    calls = []

    async def fake_astream(initial_state, config=None, stream_mode=None):
        calls.append(initial_state["question"])
        if len(calls) == 1:
            yield ("updates", {"generate_answer": {"answer": long_turn_1}})
        else:
            yield ("updates", {"generate_answer": {"answer": turn_2_answer}})

    with patch("services.api.routes.agent.agent_app.astream", side_effect=fake_astream):
        with TestClient(app) as client:
            with client.websocket_connect(f"/agent/ws/chat_0158?token={valid_jwt}") as ws:
                _snapshot = ws.receive_json()

                ws.send_json({
                    "event": "user_message",
                    "data": {"session_id": "chat_0158", "text": "Cuéntame todo sobre selección"},
                })

                # Recibimos solo 2 tokens del primer turno y abortamos
                first_tokens = []
                for _ in range(2):
                    frame = ws.receive_json()
                    assert frame["event"] == "token_chunk"
                    first_tokens.append(frame["data"]["token"])

                ws.send_json({
                    "event": "interrupt_requested",
                    "data": {
                        "session_id": "chat_0158",
                        "new_input": "en realidad mi pregunta era sobre la factura",
                    },
                })

                interrupted_event = None
                second_turn_tokens = []
                completed_event = None

                while True:
                    frame = ws.receive_json()
                    if frame["event"] == "generation_interrupted":
                        interrupted_event = frame["data"]
                    elif frame["event"] == "token_chunk":
                        if interrupted_event is not None:
                            second_turn_tokens.append(frame["data"]["token"])
                    elif frame["event"] == "generation_completed":
                        completed_event = frame["data"]
                        break

                assert interrupted_event is not None
                assert interrupted_event["session_id"] == "chat_0158"
                assert interrupted_event["status"] == "interrupted"

                full_second = "".join(second_turn_tokens)
                assert full_second == turn_2_answer
                assert "palabra20" not in full_second
                assert completed_event["message_id"] != interrupted_event["message_id"]

            # Reconexión con el mismo session_id: debe rehidratar los 4 mensajes del hilo
            with client.websocket_connect(f"/agent/ws/chat_0158?token={valid_jwt}") as ws_reconnected:
                rehydrated = ws_reconnected.receive_json()
                assert rehydrated["event"] == "session_snapshot"
                msgs = rehydrated["data"]["messages"]
                assert len(msgs) == 4
                assert msgs[0]["role"] == "user"
                assert msgs[1]["role"] == "assistant"
                assert msgs[1]["status"] == "interrupted"
                assert msgs[2]["role"] == "user"
                assert "factura" in msgs[2]["content"]
                assert msgs[3]["role"] == "assistant"
                assert msgs[3]["status"] == "completed"
                assert msgs[3]["content"] == turn_2_answer


def test_websocket_pubsub_multiple_subscribers_single_agent_call(valid_jwt, mock_auth_user):
    """Verifica que dos clientes suscritos a `chat.<session_id>` reciben los mismos tokens con 1 sola llamada al agente."""
    call_count = 0

    async def fake_astream(initial_state, config=None, stream_mode=None):
        nonlocal call_count
        call_count += 1
        yield ("updates", {"format_tool_answer": {"answer": "Ticket INC-42 resuelto."}})

    with patch("services.api.routes.agent.agent_app.astream", side_effect=fake_astream):
        with TestClient(app) as client:
            with client.websocket_connect(f"/agent/ws/chat_0159?token={valid_jwt}") as ws_user:
                with client.websocket_connect(f"/agent/ws/chat_0159?token={valid_jwt}") as ws_supervisor:
                    assert ws_user.receive_json()["event"] == "session_snapshot"
                    assert ws_supervisor.receive_json()["event"] == "session_snapshot"

                    ws_user.send_json({
                        "event": "user_message",
                        "data": {"session_id": "chat_0159", "text": "Estado de INC-42"},
                    })

                    user_tokens = []
                    sup_tokens = []

                    while True:
                        u_msg = ws_user.receive_json()
                        s_msg = ws_supervisor.receive_json()
                        if u_msg["event"] == "token_chunk":
                            user_tokens.append(u_msg["data"]["token"])
                        if s_msg["event"] == "token_chunk":
                            sup_tokens.append(s_msg["data"]["token"])
                        if u_msg["event"] == "generation_completed" and s_msg["event"] == "generation_completed":
                            break

                    assert call_count == 1
                    assert "".join(user_tokens) == "Ticket INC-42 resuelto."
                    assert "".join(sup_tokens) == "Ticket INC-42 resuelto."


def test_websocket_persists_history_across_server_restart(valid_jwt, mock_auth_user):
    """Simula un reinicio completo del servidor limpiando memoria RAM y verifica rehidratación desde DB."""

    async def fake_astream(initial_state, config=None, stream_mode=None):
        yield ("updates", {"generate_answer": {"answer": "SLA P1: escalado en 60 minutos."}})

    with patch("services.api.routes.agent.agent_app.astream", side_effect=fake_astream):
        with TestClient(app) as client:
            with client.websocket_connect(f"/agent/ws/chat_persist?token={valid_jwt}") as ws:
                assert ws.receive_json()["event"] == "session_snapshot"
                ws.send_json({
                    "event": "user_message",
                    "data": {"session_id": "chat_persist", "text": "¿Cuál es el SLA P1?"},
                })
                while True:
                    if ws.receive_json()["event"] == "generation_completed":
                        break

            # Simula reinicio total del servidor (se pierde todo el diccionario en RAM)
            chat_session_manager._channels.clear()

            with client.websocket_connect(f"/agent/ws/chat_persist?token={valid_jwt}") as ws_after_restart:
                snapshot = ws_after_restart.receive_json()
                assert snapshot["event"] == "session_snapshot"
                msgs = snapshot["data"]["messages"]
                assert len(msgs) == 2
                assert msgs[0]["role"] == "user"
                assert msgs[0]["content"] == "¿Cuál es el SLA P1?"
                assert msgs[1]["role"] == "assistant"
                assert msgs[1]["status"] == "completed"
                assert msgs[1]["content"] == "SLA P1: escalado en 60 minutos."