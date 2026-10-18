"""
chat_models.py — Modelos de Datos para Streaming de Chat por WebSocket
Módulo: Real-Time Communication (Parte 2 de 2)

Define los esquemas Pydantic v2 para mensajes bidireccionales, roles,
fragmentos de streaming y estados de sesión.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Literal, List
from pydantic import BaseModel, Field, ConfigDict


ClientMessageType = Literal["user_message", "ping", "clear_history"]
ServerMessageType = Literal[
    "connection_ack",
    "chat_start",
    "chat_chunk",
    "chat_complete",
    "pong",
    "error"
]
MessageRole = Literal["user", "assistant", "system"]


def get_utc_now_iso() -> str:
    """Devuelve la fecha/hora UTC actual en formato ISO 8601."""
    return datetime.now(timezone.utc).isoformat()


class ChatMessage(BaseModel):
    """
    Representa un mensaje individual dentro del historial conversacional de una sesión.
    """
    model_config = ConfigDict(extra="forbid")

    message_id: str = Field(
        default_factory=lambda: f"msg_{uuid.uuid4().hex[:8]}",
        description="Identificador único del mensaje"
    )
    role: MessageRole = Field(description="Rol del emisor: user, assistant o system")
    content: str = Field(description="Contenido textual del mensaje")
    timestamp: str = Field(
        default_factory=get_utc_now_iso,
        description="Marca de tiempo en formato ISO 8601"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadatos adicionales (ej: duración, tokens, contexto logístico)"
    )


class ClientWSMessage(BaseModel):
    """
    Esquema de validación para mensajes entrantes desde el cliente vía WebSocket.
    """
    model_config = ConfigDict(extra="ignore")

    type: ClientMessageType = Field(description="Tipo de mensaje del cliente")
    content: Optional[str] = Field(
        default=None,
        description="Texto del mensaje cuando type='user_message'"
    )
    timestamp: Optional[str] = Field(
        default=None,
        description="Marca de tiempo opcional del cliente"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Datos opcionales adicionales"
    )


class ConnectionAckPayload(BaseModel):
    """
    Mensaje de confirmación emitido al cliente al aceptar la conexión WebSocket.
    """
    type: Literal["connection_ack"] = "connection_ack"
    session_id: str
    client_id: str
    history_count: int = 0
    timestamp: str = Field(default_factory=get_utc_now_iso)


class ChatStartPayload(BaseModel):
    """
    Notifica al cliente que el asistente ha iniciado la generación de una respuesta.
    """
    type: Literal["chat_start"] = "chat_start"
    session_id: str
    message_id: str
    timestamp: str = Field(default_factory=get_utc_now_iso)


class ChatChunkPayload(BaseModel):
    """
    Fragmento de texto emitido durante el streaming de la respuesta del asistente.
    """
    type: Literal["chat_chunk"] = "chat_chunk"
    session_id: str
    message_id: str
    chunk: str
    index: int
    timestamp: str = Field(default_factory=get_utc_now_iso)


class ChatCompletePayload(BaseModel):
    """
    Señal de finalización de respuesta con el texto consolidado y métricas de ejecución.
    """
    type: Literal["chat_complete"] = "chat_complete"
    session_id: str
    message_id: str
    full_content: str
    duration_ms: float
    timestamp: str = Field(default_factory=get_utc_now_iso)


class PongPayload(BaseModel):
    """
    Respuesta inmediata a un ping de latencia enviado por el cliente.
    """
    type: Literal["pong"] = "pong"
    timestamp: str = Field(default_factory=get_utc_now_iso)
    client_timestamp: Optional[str] = None


class ErrorPayload(BaseModel):
    """
    Notificación de error enviada al cliente cuando falla el procesamiento de un mensaje.
    """
    type: Literal["error"] = "error"
    code: str
    detail: str
    timestamp: str = Field(default_factory=get_utc_now_iso)


class ChatSessionHistoryResponse(BaseModel):
    """
    Respuesta REST con el historial completo de mensajes de una sesión.
    """
    session_id: str
    total_messages: int
    messages: List[ChatMessage]
    active_connections: int
