"""
services/api/ws_chat_manager.py
Gestor Pub/Sub en memoria por sesión (canal `chat.<session_id>`) para chat WebSocket
del agente de soporte de primera línea (`first_line_support`).
"""
from __future__ import annotations

import asyncio
import datetime
import uuid
from contextlib import suppress
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Dict, List, Literal, Optional, Set

from pydantic import BaseModel


class ChatMessage(BaseModel):
    """Mensaje individual dentro de una sesión de chat."""
    message_id: str
    session_id: str
    role: Literal["user", "assistant"]
    content: str
    status: Literal["streaming", "completed", "interrupted"] = "completed"
    created_at: str


class ChatSession(BaseModel):
    """Entidad de sesión de chat alineada con el BRIEFING de Nexova (Parte 2)."""
    session_id: str
    agent_id: str = "first_line_support"
    user_id: str
    client_id: Optional[str] = None
    status: Literal["active", "interrupted", "closed"] = "active"
    created_at: str


@dataclass
class _SessionChannel:
    """Estado en memoria y suscriptores Pub/Sub de una sesión (`chat.<session_id>`)."""
    session: ChatSession
    subscribers: Set[asyncio.Queue[Dict[str, Any]]] = field(default_factory=set)
    messages: List[ChatMessage] = field(default_factory=list)
    active_task: Optional[asyncio.Task[None]] = None
    active_message: Optional[ChatMessage] = None
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    @property
    def channel_name(self) -> str:
        return f"chat.{self.session.session_id}"


class ChatSessionManager:
    """
    Desacopla la ejecución del agente (productor) de las conexiones WebSocket (consumidores)
    mediante canales Pub/Sub por `session_id`.
    """

    def __init__(self, max_queue_size: int = 200) -> None:
        self._channels: Dict[str, _SessionChannel] = {}
        self._max_queue_size = max_queue_size

    @staticmethod
    def _utc_now() -> str:
        return datetime.datetime.now(datetime.timezone.utc).isoformat()

    def get_or_create_channel(
        self,
        session_id: str,
        user_id: str,
        client_id: Optional[str] = None,
    ) -> _SessionChannel:
        """Obtiene el canal `chat.<session_id>` o inicializa una nueva ChatSession."""
        channel = self._channels.get(session_id)
        if channel is None:
            session = ChatSession(
                session_id=session_id,
                agent_id="first_line_support",
                user_id=user_id,
                client_id=client_id,
                status="active",
                created_at=self._utc_now(),
            )
            channel = _SessionChannel(session=session)
            self._channels[session_id] = channel
        return channel

    def get_session(self, session_id: str) -> Optional[ChatSession]:
        channel = self._channels.get(session_id)
        return channel.session if channel else None

    def build_snapshot_event(self, session_id: str) -> Dict[str, Any]:
        """Construye el evento `session_snapshot` para rehidratar el hilo al conectar/reconectar."""
        channel = self._channels[session_id]
        return {
            "event": "session_snapshot",
            "data": {
                "session_id": session_id,
                "agent_id": channel.session.agent_id,
                "status": channel.session.status,
                "messages": [msg.model_dump() for msg in channel.messages],
            },
        }

    def subscribe(
        self,
        session_id: str,
        user_id: str,
        client_id: Optional[str] = None,
    ) -> tuple[asyncio.Queue[Dict[str, Any]], Dict[str, Any]]:
        """Suscribe un consumidor WebSocket al canal `chat.<session_id>` y retorna su snapshot."""
        channel = self.get_or_create_channel(
            session_id=session_id,
            user_id=user_id,
            client_id=client_id,
        )
        queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=self._max_queue_size)
        channel.subscribers.add(queue)
        return queue, self.build_snapshot_event(session_id)

    def unsubscribe(self, session_id: str, queue: asyncio.Queue[Dict[str, Any]]) -> None:
        """Elimina la cola de un cliente WebSocket desconectado."""
        channel = self._channels.get(session_id)
        if channel is not None:
            channel.subscribers.discard(queue)

    def active_subscribers(self, session_id: str) -> int:
        channel = self._channels.get(session_id)
        return len(channel.subscribers) if channel else 0

    async def publish(self, session_id: str, event: str, data: Dict[str, Any]) -> int:
        """Publica un evento estructurado a todos los consumidores suscritos a `chat.<session_id>`."""
        channel = self._channels.get(session_id)
        if channel is None or not channel.subscribers:
            return 0

        envelope = {"event": event, "data": data}
        delivered = 0
        for queue in list(channel.subscribers):
            try:
                queue.put_nowait(envelope)
                delivered += 1
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                    queue.put_nowait(envelope)
                    delivered += 1
                except (asyncio.QueueEmpty, asyncio.QueueFull):
                    pass
        return delivered

    def append_user_message(self, session_id: str, text: str) -> ChatMessage:
        """Registra un mensaje entrante del usuario en el historial de la sesión."""
        channel = self._channels[session_id]
        msg = ChatMessage(
            message_id=f"msg_{uuid.uuid4().hex[:8]}",
            session_id=session_id,
            role="user",
            content=text,
            status="completed",
            created_at=self._utc_now(),
        )
        channel.messages.append(msg)
        return msg

    async def append_token(
        self,
        session_id: str,
        message_id: str,
        token: str,
        sequence: int,
    ) -> None:
        """Acumula un token en el mensaje activo y lo difunde como `token_chunk`."""
        channel = self._channels.get(session_id)
        if channel is None or channel.active_message is None:
            return
        if channel.active_message.message_id != message_id:
            return

        channel.active_message.content += token
        await self.publish(
            session_id=session_id,
            event="token_chunk",
            data={
                "session_id": session_id,
                "message_id": message_id,
                "token": token,
                "sequence": sequence,
            },
        )

    async def complete_assistant_message(self, session_id: str, message_id: str) -> None:
        """Marca el mensaje del asistente como completado y emite `generation_completed`."""
        channel = self._channels.get(session_id)
        if channel is None or channel.active_message is None:
            return
        if channel.active_message.message_id != message_id:
            return

        channel.active_message.status = "completed"
        channel.session.status = "active"
        channel.active_message = None

        await self.publish(
            session_id=session_id,
            event="generation_completed",
            data={
                "session_id": session_id,
                "message_id": message_id,
            },
        )

    async def _abort_unlocked(self, session_id: str) -> Optional[ChatMessage]:
        """Cancela la tarea de generación en curso y marca el mensaje parcial como `interrupted`."""
        channel = self._channels.get(session_id)
        if channel is None:
            return None

        task = channel.active_task
        if task is not None and not task.done():
            task.cancel()
            with suppress(asyncio.CancelledError, Exception):
                await task
        channel.active_task = None

        interrupted_msg = channel.active_message
        if interrupted_msg is not None and interrupted_msg.status == "streaming":
            interrupted_msg.status = "interrupted"
            channel.session.status = "interrupted"
            channel.active_message = None
            await self.publish(
                session_id=session_id,
                event="generation_interrupted",
                data={
                    "session_id": session_id,
                    "message_id": interrupted_msg.message_id,
                    "status": "interrupted",
                },
            )
            return interrupted_msg

        channel.active_message = None
        return None

    async def interrupt_generation(self, session_id: str) -> Optional[ChatMessage]:
        """Aborta de forma segura la generación activa de una sesión."""
        channel = self._channels.get(session_id)
        if channel is None:
            return None
        async with channel.lock:
            return await self._abort_unlocked(session_id)

    async def start_generation(
        self,
        session_id: str,
        user_text: str,
        runner_factory: Callable[[ChatMessage], Awaitable[None]],
    ) -> ChatMessage:
        """
        Si había una generación en curso, la aborta limpiamente primero;
        registra el turno del usuario y lanza una nueva tarea asíncrona para el asistente.
        """
        channel = self._channels[session_id]
        async with channel.lock:
            if channel.active_task is not None and not channel.active_task.done():
                await self._abort_unlocked(session_id)

            self.append_user_message(session_id=session_id, text=user_text)
            channel.session.status = "active"

            assistant_msg = ChatMessage(
                message_id=f"msg_{uuid.uuid4().hex[:8]}",
                session_id=session_id,
                role="assistant",
                content="",
                status="streaming",
                created_at=self._utc_now(),
            )
            channel.messages.append(assistant_msg)
            channel.active_message = assistant_msg

            async def _run_wrapper() -> None:
                try:
                    await runner_factory(assistant_msg)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    if channel.active_message and channel.active_message.message_id == assistant_msg.message_id:
                        assistant_msg.content += f"\n[Error en generación: {exc}]"
                        await self.complete_assistant_message(session_id, assistant_msg.message_id)

            channel.active_task = asyncio.create_task(_run_wrapper())
            return assistant_msg


# Instancia singleton compartida por los routers de FastAPI
chat_session_manager = ChatSessionManager()