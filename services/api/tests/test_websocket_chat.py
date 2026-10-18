"""
test_websocket_chat.py — Suite de Pruebas Automatizadas para Streaming de Chat por WebSocket
Módulo: Real-Time Communication (Parte 2 de 2)

Cubre:
1. Validación de esquemas y modelos Pydantic v2 (mensajes de cliente, respuestas del servidor).
2. Gestor de conexiones en memoria (alta, aislamiento entre sesiones, broadcast y liberación).
3. Motor conversacional y streaming (adición al historial, streaming por tokens y persistencia).
4. Endpoints WebSocket y REST (handshake, ping/pong, streaming incremental, errores y multi-cliente).
"""

import json
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from main import app
from models.chat_models import (
    ChatMessage,
    ClientWSMessage,
    ConnectionAckPayload,
    ChatStartPayload,
    ChatChunkPayload,
    ChatCompletePayload,
    PongPayload,
    ErrorPayload
)
from services.websocket_manager import ConnectionManager, connection_manager
from services.chat_stream_service import ChatStreamService, chat_stream_service


# ─────────────────────────────────────────────────────────────
# 1. Pruebas de Modelos y Serialización
# ─────────────────────────────────────────────────────────────

def test_chat_models_validation():
    """Valida la creación y serialización de los modelos Pydantic del chat."""
    msg = ChatMessage(
        role="user",
        content="Consulta de inventario",
        metadata={"priority": "high"}
    )
    assert msg.message_id.startswith("msg_")
    assert msg.role == "user"
    assert msg.content == "Consulta de inventario"
    assert msg.metadata["priority"] == "high"

    # ClientWSMessage
    client_msg = ClientWSMessage(type="user_message", content="Hola")
    assert client_msg.type == "user_message"
    assert client_msg.content == "Hola"

    # Payloads de servidor
    ack = ConnectionAckPayload(session_id="s1", client_id="c1", history_count=3)
    assert ack.type == "connection_ack"
    assert ack.history_count == 3

    chunk = ChatChunkPayload(session_id="s1", message_id="m1", chunk="Texto", index=0)
    assert chunk.type == "chat_chunk"
    assert chunk.chunk == "Texto"

    comp = ChatCompletePayload(
        session_id="s1",
        message_id="m1",
        full_content="Texto completo",
        duration_ms=120.5
    )
    assert comp.type == "chat_complete"
    assert comp.duration_ms == 120.5


def test_invalid_client_message_validation():
    """Valida que mensajes entrantes con tipos desconocidos sean rechazados por Pydantic."""
    with pytest.raises(Exception):
        ClientWSMessage.model_validate({"type": "tipo_desconocido", "content": "Test"})


# ─────────────────────────────────────────────────────────────
# 2. Pruebas de ConnectionManager
# ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_connection_manager_lifecycle():
    """Valida el ciclo de vida: connect, conteo de conexiones y disconnect."""
    mgr = ConnectionManager()
    mock_ws = MagicMock()
    mock_ws.accept = AsyncMock()
    mock_ws.send_json = AsyncMock()

    client_id = await mgr.connect("session_alpha", mock_ws)
    assert client_id.startswith("ws_cli_")
    assert mock_ws.accept.called
    assert mgr.get_session_connection_count("session_alpha") == 1
    assert mgr.get_total_connections() == 1
    assert "session_alpha" in mgr.get_active_sessions()

    # Desconectar
    await mgr.disconnect("session_alpha", mock_ws)
    assert mgr.get_session_connection_count("session_alpha") == 0
    assert mgr.get_total_connections() == 0
    assert "session_alpha" not in mgr.get_active_sessions()


@pytest.mark.asyncio
async def test_connection_manager_multi_client_and_isolation():
    """Valida el broadcast a múltiples clientes en una sesión y el aislamiento entre sesiones."""
    mgr = ConnectionManager()

    # Sesión 1: dos clientes
    ws1_s1 = MagicMock()
    ws1_s1.accept = AsyncMock()
    ws1_s1.send_json = AsyncMock()

    ws2_s1 = MagicMock()
    ws2_s1.accept = AsyncMock()
    ws2_s1.send_json = AsyncMock()

    # Sesión 2: un cliente
    ws1_s2 = MagicMock()
    ws1_s2.accept = AsyncMock()
    ws1_s2.send_json = AsyncMock()

    await mgr.connect("sess_1", ws1_s1)
    await mgr.connect("sess_1", ws2_s1)
    await mgr.connect("sess_2", ws1_s2)

    assert mgr.get_session_connection_count("sess_1") == 2
    assert mgr.get_session_connection_count("sess_2") == 1
    assert mgr.get_total_connections() == 3

    # Broadcast solo a sess_1
    delivered = await mgr.broadcast_to_session("sess_1", {"event": "update_sess_1"})
    assert delivered == 2
    assert ws1_s1.send_json.called
    assert ws2_s1.send_json.called
    assert not ws1_s2.send_json.called  # No debe recibirlo

    # Limpieza
    await mgr.disconnect("sess_1", ws1_s1)
    await mgr.disconnect("sess_1", ws2_s1)
    await mgr.disconnect("sess_2", ws1_s2)


# ─────────────────────────────────────────────────────────────
# 3. Pruebas de ChatStreamService
# ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_stream_service_history():
    """Valida adición, consulta y purga de historial conversacional."""
    service = ChatStreamService()
    session_id = "test_hist_session"

    assert service.get_history(session_id) == []

    m1 = await service.add_message(session_id, role="user", content="Hola")
    m2 = await service.add_message(session_id, role="assistant", content="En qué te ayudo?")

    history = service.get_history(session_id)
    assert len(history) == 2
    assert history[0].role == "user"
    assert history[1].role == "assistant"

    cleared = await service.clear_history(session_id)
    assert cleared is True
    assert service.get_history(session_id) == []


@pytest.mark.asyncio
async def test_chat_stream_service_streaming_response():
    """Valida la emisión de chunks y la consolidación de respuesta en el historial."""
    service = ChatStreamService()
    session_id = "test_stream_session"

    chunks = []
    async for chunk in service.generate_response_stream(
        session_id=session_id,
        user_prompt="Alerta en sensor de temperatura",
        chunk_delay=0.0
    ):
        chunks.append(chunk)

    full_text = "".join(chunks)
    assert len(chunks) > 1
    assert "incidencias" in full_text.lower()

    # Comprobar que usuario y asistente quedaron registrados
    history = service.get_history(session_id)
    assert len(history) == 2
    assert history[0].role == "user"
    assert history[0].content == "Alerta en sensor de temperatura"
    assert history[1].role == "assistant"
    assert history[1].content == full_text


# ─────────────────────────────────────────────────────────────
# 4. Pruebas del Endpoint WebSocket con TestClient
# ─────────────────────────────────────────────────────────────

def test_ws_connection_ack():
    """Valida el handshake y la recepción inmediata de connection_ack."""
    client = TestClient(app)
    with client.websocket_connect("/ws/chat/sess_ack_test") as ws:
        ack_data = ws.receive_json()
        assert ack_data["type"] == "connection_ack"
        assert ack_data["session_id"] == "sess_ack_test"
        assert ack_data["client_id"].startswith("ws_cli_")
        assert ack_data["history_count"] == 0


def test_ws_ping_pong_heartbeat():
    """Valida el intercambio de frames ping y pong para control de latencia."""
    client = TestClient(app)
    with client.websocket_connect("/ws/chat/sess_ping_test") as ws:
        # Descartar ack inicial
        ws.receive_json()

        # Enviar ping
        ws.send_json({"type": "ping", "timestamp": "2026-10-18T14:30:00Z"})
        pong_data = ws.receive_json()

        assert pong_data["type"] == "pong"
        assert pong_data["client_timestamp"] == "2026-10-18T14:30:00Z"
        assert "timestamp" in pong_data


def test_ws_chat_streaming_flow():
    """Valida el flujo conversacional completo: user_message -> chat_start -> chat_chunk* -> chat_complete."""
    client = TestClient(app)
    with client.websocket_connect("/ws/chat/sess_stream_flow") as ws:
        # Descartar ack
        ws.receive_json()

        # Enviar pregunta
        ws.send_json({"type": "user_message", "content": "Consulta estado de la flota de camiones"})

        # Frame 1: chat_start
        start_frame = ws.receive_json()
        assert start_frame["type"] == "chat_start"
        assert start_frame["session_id"] == "sess_stream_flow"
        message_id = start_frame["message_id"]

        # Chunks progresivos hasta chat_complete
        received_chunks = []
        full_complete_frame = None

        while True:
            frame = ws.receive_json()
            if frame["type"] == "chat_chunk":
                assert frame["message_id"] == message_id
                received_chunks.append(frame["chunk"])
            elif frame["type"] == "chat_complete":
                full_complete_frame = frame
                break

        assert len(received_chunks) > 0
        assert full_complete_frame is not None
        assert full_complete_frame["message_id"] == message_id
        assert full_complete_frame["full_content"] == "".join(received_chunks)
        assert "flota" in full_complete_frame["full_content"].lower()
        assert full_complete_frame["duration_ms"] >= 0


def test_ws_empty_message_error():
    """Valida que un user_message con contenido en blanco devuelva un frame de error."""
    client = TestClient(app)
    with client.websocket_connect("/ws/chat/sess_empty_err") as ws:
        ws.receive_json()  # ack

        ws.send_json({"type": "user_message", "content": "   "})
        err_frame = ws.receive_json()

        assert err_frame["type"] == "error"
        assert err_frame["code"] == "EMPTY_CONTENT"


def test_ws_invalid_format_error():
    """Valida que una trama con JSON o estructura inválida devuelva un frame de error."""
    client = TestClient(app)
    with client.websocket_connect("/ws/chat/sess_invalid_err") as ws:
        ws.receive_json()  # ack

        # Enviar JSON con tipo no reconocido
        ws.send_text(json.dumps({"type": "invalid_action_type"}))
        err_frame = ws.receive_json()

        assert err_frame["type"] == "error"
        assert err_frame["code"] == "INVALID_MESSAGE_FORMAT"


def test_ws_clear_history_command():
    """Valida que clear_history purgue el historial y emita notificación."""
    client = TestClient(app)
    with client.websocket_connect("/ws/chat/sess_clear_test") as ws:
        ws.receive_json()  # ack

        # Primero enviar un mensaje para tener historial
        ws.send_json({"type": "user_message", "content": "Mensaje previo"})
        while True:
            f = ws.receive_json()
            if f["type"] == "chat_complete":
                break

        # Limpiar
        ws.send_json({"type": "clear_history"})
        notif = ws.receive_json()
        assert notif["type"] == "system_notification"
        assert notif["event"] == "history_cleared"

    # Verificar REST que la sesión esté vacía
    res = client.get("/api/chat/sessions/sess_clear_test/history")
    assert res.status_code == 200
    assert res.json()["total_messages"] == 0


def test_ws_multi_client_session_broadcast():
    """Valida que dos clientes conectados a la misma sesión reciban el streaming simultáneamente."""
    client = TestClient(app)
    with client.websocket_connect("/ws/chat/sess_multi_sync") as ws_a:
        ws_a.receive_json()  # ack a

        with client.websocket_connect("/ws/chat/sess_multi_sync") as ws_b:
            ws_b.receive_json()  # ack b

            # ws_a envía la pregunta
            ws_a.send_json({"type": "user_message", "content": "Hola equipo"})

            # Ambos deben recibir chat_start
            start_a = ws_a.receive_json()
            start_b = ws_b.receive_json()
            assert start_a["type"] == "chat_start"
            assert start_b["type"] == "chat_start"
            assert start_a["message_id"] == start_b["message_id"]

            # Consumir hasta complete en ambos
            complete_a = None
            while True:
                f_a = ws_a.receive_json()
                f_b = ws_b.receive_json()
                assert f_a["type"] == f_b["type"]
                if f_a["type"] == "chat_complete":
                    complete_a = f_a
                    break

            assert complete_a is not None


# ─────────────────────────────────────────────────────────────
# 5. Pruebas de Endpoints REST Complementarios
# ─────────────────────────────────────────────────────────────

def test_rest_chat_stats_endpoint():
    """Valida el endpoint GET /api/chat/stats."""
    client = TestClient(app)
    response = client.get("/api/chat/stats")
    assert response.status_code == 200

    data = response.json()
    assert "websocket" in data
    assert "storage" in data
    assert "total_active_connections" in data["websocket"]
    assert "total_stored_sessions" in data["storage"]


def test_rest_delete_session_endpoint():
    """Valida el endpoint DELETE /api/chat/sessions/{session_id}."""
    client = TestClient(app)
    # Crear mensaje vía servicio
    chat_stream_service.get_history("sess_to_delete")

    response = client.delete("/api/chat/sessions/sess_to_delete")
    assert response.status_code == 200
    assert response.json()["status"] in ["cleared", "not_found"]
