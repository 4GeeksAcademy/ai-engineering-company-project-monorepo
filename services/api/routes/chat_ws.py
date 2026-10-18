"""
chat_ws.py — Router de WebSocket y REST para Chat Streaming en FastAPI
Módulo: Real-Time Communication (Parte 2 de 2)

Endpoints:
- WEBSOCKET /ws/chat/{session_id}              : Canal full-duplex de streaming de conversación.
- GET       /api/chat/sessions/{session_id}/history : Historial de mensajes de una sesión.
- DELETE    /api/chat/sessions/{session_id}         : Limpia el historial de una sesión.
- GET       /api/chat/stats                         : Métricas operativas de sockets y sesiones activas.
"""

import time
import json
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from pydantic import ValidationError

from models.chat_models import (
    ClientWSMessage,
    ConnectionAckPayload,
    ChatStartPayload,
    ChatChunkPayload,
    ChatCompletePayload,
    PongPayload,
    ErrorPayload,
    ChatSessionHistoryResponse
)
from services.websocket_manager import connection_manager
from services.chat_stream_service import chat_stream_service

logger = logging.getLogger("api.chat_ws")
router = APIRouter(tags=["chat"])


@router.websocket("/ws/chat/{session_id}")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str):
    """
    Endpoint WebSocket bidireccional para chat con streaming incremental de respuestas.
    Soporta múltiples clientes simultáneos por session_id y pings de latencia.
    """
    client_id = await connection_manager.connect(session_id, websocket)

    try:
        # 1. Enviar acuse de conexión exitosa
        existing_history = chat_stream_service.get_history(session_id)
        ack = ConnectionAckPayload(
            session_id=session_id,
            client_id=client_id,
            history_count=len(existing_history)
        )
        await connection_manager.send_json(websocket, ack)

        # 2. Bucle continuo de escucha de mensajes entrantes
        while True:
            text_data = await websocket.receive_text()

            try:
                raw_dict = json.loads(text_data)
                client_msg = ClientWSMessage.model_validate(raw_dict)
            except (json.JSONDecodeError, ValidationError) as parse_err:
                await connection_manager.send_json(
                    websocket,
                    ErrorPayload(
                        code="INVALID_MESSAGE_FORMAT",
                        detail=f"Estructura de mensaje no válida: {str(parse_err)}"
                    )
                )
                continue

            # Procesamiento según tipo de mensaje
            if client_msg.type == "ping":
                # Heartbeat de comprobación de latencia
                pong = PongPayload(client_timestamp=client_msg.timestamp)
                await connection_manager.send_json(websocket, pong)

            elif client_msg.type == "clear_history":
                # Limpiar memoria de la sesión
                await chat_stream_service.clear_history(session_id)
                await connection_manager.broadcast_to_session(
                    session_id,
                    {
                        "type": "system_notification",
                        "event": "history_cleared",
                        "session_id": session_id
                    }
                )

            elif client_msg.type == "user_message":
                user_content = (client_msg.content or "").strip()
                if not user_content:
                    await connection_manager.send_json(
                        websocket,
                        ErrorPayload(
                            code="EMPTY_CONTENT",
                            detail="El contenido del mensaje no puede estar vacío."
                        )
                    )
                    continue

                # Iniciar streaming del asistente
                msg_id = f"msg_{uuid.uuid4().hex[:8]}"
                start_time = time.perf_counter()

                # Notificar a la sesión que el asistente comenzó a responder
                await connection_manager.broadcast_to_session(
                    session_id,
                    ChatStartPayload(session_id=session_id, message_id=msg_id)
                )

                accumulated_parts = []
                chunk_index = 0

                # Transmitir fragmentos token por token en tiempo real
                async for chunk in chat_stream_service.generate_response_stream(
                    session_id=session_id,
                    user_prompt=user_content
                ):
                    accumulated_parts.append(chunk)
                    chunk_payload = ChatChunkPayload(
                        session_id=session_id,
                        message_id=msg_id,
                        chunk=chunk,
                        index=chunk_index
                    )
                    await connection_manager.broadcast_to_session(session_id, chunk_payload)
                    chunk_index += 1

                # Emitir señal de finalización con el texto consolidado
                duration_ms = (time.perf_counter() - start_time) * 1000
                complete_payload = ChatCompletePayload(
                    session_id=session_id,
                    message_id=msg_id,
                    full_content="".join(accumulated_parts),
                    duration_ms=round(duration_ms, 2)
                )
                await connection_manager.broadcast_to_session(session_id, complete_payload)

    except WebSocketDisconnect:
        logger.info(f"Cliente desconectado de sesión {session_id}")
    except Exception as exc:
        logger.error(f"Error inesperado en WebSocket: {exc}")
    finally:
        # Liberación determinista de recursos en memoria
        await connection_manager.disconnect(session_id, websocket)


# ─────────────────────────────────────────────────────────────
# Endpoints REST de Consulta y Gestión de Sesiones
# ─────────────────────────────────────────────────────────────

@router.get(
    "/api/chat/sessions/{session_id}/history",
    response_model=ChatSessionHistoryResponse
)
async def get_session_history(session_id: str):
    """
    Recupera el historial de mensajes acumulados en una sesión conversacional.
    """
    messages = chat_stream_service.get_history(session_id)
    active_conns = connection_manager.get_session_connection_count(session_id)

    return ChatSessionHistoryResponse(
        session_id=session_id,
        total_messages=len(messages),
        messages=messages,
        active_connections=active_conns
    )


@router.delete("/api/chat/sessions/{session_id}")
async def delete_session_history(session_id: str):
    """
    Elimina los mensajes almacenados de una sesión conversacional.
    """
    cleared = await chat_stream_service.clear_history(session_id)
    return {
        "status": "cleared" if cleared else "not_found",
        "session_id": session_id
    }


@router.get("/api/chat/stats")
async def get_chat_stats():
    """
    Devuelve métricas operativas de sockets WebSocket y sesiones activas.
    """
    return {
        "websocket": connection_manager.get_stats(),
        "storage": chat_stream_service.get_session_stats()
    }
