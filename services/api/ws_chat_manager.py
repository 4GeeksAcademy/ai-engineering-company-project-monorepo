"""
services/api/ws_chat_manager.py
Gestor Pub/Sub por sesión (canal `chat.<session_id>`) con persistencia en DB (SQLModel)
y soporte Redis Pub/Sub (`redis.asyncio`) con fallback automático a memoria.
"""
from __future__ import annotations

import asyncio
import datetime
import json
import logging
import os
import uuid
from contextlib import suppress
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Dict, List, Literal, Optional, Set

from pydantic import BaseModel
from sqlmodel import Field, Session, SQLModel, select

from services.api.database import engine as default_engine

logger = logging.getLogger("nexova.ws_chat_manager")


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


class ChatSessionRecord(SQLModel, table=True):
    """Tabla persistente para sesiones de chat (sobrevive a reinicios del servidor)."""
    __tablename__ = "support_chat_sessions"
    __table_args__ = {"extend_existing": True}

    session_id: str = Field(primary_key=True)
    agent_id: str = Field(default="first_line_support")
    user_id: str
    client_id: Optional[str] = Field(default=None)
    status: str = Field(default="active")
    created_at: str


class ChatMessageRecord(SQLModel, table=True):
    """Tabla persistente para mensajes de chat ordenados por inserción."""
    __tablename__ = "support_chat_messages"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: str = Field(index=True)
    session_id: str = Field(index=True)
    role: str
    content: str
    status: str = Field(default="completed")
    created_at: str


@dataclass
class _SessionChannel:
    """Estado en memoria y suscriptores Pub/Sub de una sesión (`chat.<session_id>`)."""
    session: ChatSession
    subscribers: Set[asyncio.Queue[Dict[str, Any]]] = field(default_factory=set)
    messages: List[ChatMessage] = field(default_factory=list)
    active_task: Optional[asyncio.Task[None]] = None
    active_message: Optional[ChatMessage] = None
    redis_listener_task: Optional[asyncio.Task[None]] = None
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    @property
    def channel_name(self) -> str:
        return f"chat.{self.session.session_id}"


class ChatSessionManager:
    """
    Desacopla la ejecución del agente (productor) de las conexiones WebSocket (consumidores)
    mediante canales Pub/Sub `chat.<session_id>` (Redis cuando está disponible, o memoria en fallback)
    y persiste el historial en SQLite/PostgreSQL para sobrevivir a reinicios del servidor.
    """

    def __init__(self, max_queue_size: int = 200, db_engine: Any = None) -> None:
        self._channels: Dict[str, _SessionChannel] = {}
        self._max_queue_size = max_queue_size
        self._engine = db_engine or default_engine
        self._tables_initialized_for: set[int] = set()
        self._redis_unavailable: bool = False

    def set_engine(self, db_engine: Any) -> None:
        """Permite inyectar un engine de pruebas aislado."""
        self._engine = db_engine
        self._tables_initialized_for.clear()

    def _ensure_tables(self) -> None:
        eng_id = id(self._engine)
        if eng_id in self._tables_initialized_for:
            return
        id_col = (
            "id SERIAL PRIMARY KEY"
            if self._engine.dialect.name == "postgresql"
            else "id INTEGER PRIMARY KEY AUTOINCREMENT"
        )
        with self._engine.begin() as conn:
            conn.exec_driver_sql(
                """
                CREATE TABLE IF NOT EXISTS support_chat_sessions (
                    session_id TEXT PRIMARY KEY,
                    agent_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    client_id TEXT,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.exec_driver_sql(
                f"""
                CREATE TABLE IF NOT EXISTS support_chat_messages (
                    {id_col},
                    message_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
        self._tables_initialized_for.add(eng_id)

    @staticmethod
    def _utc_now() -> str:
        return datetime.datetime.now(datetime.timezone.utc).isoformat()

    def _load_or_create_db_channel(
        self,
        session_id: str,
        user_id: str,
        client_id: Optional[str] = None,
    ) -> _SessionChannel:
        self._ensure_tables()
        with Session(self._engine) as db:
            db_session = db.get(ChatSessionRecord, session_id)
            if db_session is None:
                db_session = ChatSessionRecord(
                    session_id=session_id,
                    agent_id="first_line_support",
                    user_id=user_id,
                    client_id=client_id,
                    status="active",
                    created_at=self._utc_now(),
                )
                db.add(db_session)
                db.commit()
                db.refresh(db_session)

            db_messages = db.exec(
                select(ChatMessageRecord)
                .where(ChatMessageRecord.session_id == session_id)
                .order_by(ChatMessageRecord.id)
            ).all()

            session_model = ChatSession(
                session_id=db_session.session_id,
                agent_id=db_session.agent_id,
                user_id=db_session.user_id,
                client_id=db_session.client_id,
                status=db_session.status,  # type: ignore[arg-type]
                created_at=db_session.created_at,
            )
            messages = [
                ChatMessage(
                    message_id=m.message_id,
                    session_id=m.session_id,
                    role=m.role,  # type: ignore[arg-type]
                    content=m.content,
                    status=m.status,  # type: ignore[arg-type]
                    created_at=m.created_at,
                )
                for m in db_messages
            ]
            return _SessionChannel(session=session_model, messages=messages)

    def _persist_new_message(self, msg: ChatMessage) -> None:
        self._ensure_tables()
        with Session(self._engine) as db:
            db.add(
                ChatMessageRecord(
                    message_id=msg.message_id,
                    session_id=msg.session_id,
                    role=msg.role,
                    content=msg.content,
                    status=msg.status,
                    created_at=msg.created_at,
                )
            )
            db.commit()

    def _persist_message_update(
        self,
        session_id: str,
        message_id: str,
        content: str,
        msg_status: str,
        session_status: Optional[str] = None,
    ) -> None:
        self._ensure_tables()
        with Session(self._engine) as db:
            record = db.exec(
                select(ChatMessageRecord).where(
                    ChatMessageRecord.session_id == session_id,
                    ChatMessageRecord.message_id == message_id,
                )
            ).first()
            if record is not None:
                record.content = content
                record.status = msg_status
                db.add(record)

            if session_status is not None:
                sess = db.get(ChatSessionRecord, session_id)
                if sess is not None:
                    sess.status = session_status
                    db.add(sess)
            db.commit()

    def get_or_create_channel(
        self,
        session_id: str,
        user_id: str,
        client_id: Optional[str] = None,
    ) -> _SessionChannel:
        """Obtiene el canal `chat.<session_id>` desde memoria o lo rehidrata desde DB."""
        channel = self._channels.get(session_id)
        if channel is None:
            channel = self._load_or_create_db_channel(
                session_id=session_id,
                user_id=user_id,
                client_id=client_id,
            )
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

    def _dispatch_to_local_queues(self, session_id: str, envelope: Dict[str, Any]) -> int:
        channel = self._channels.get(session_id)
        if channel is None or not channel.subscribers:
            return 0
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

    async def _get_redis_client(self):
        """Intenta crear una conexión async a Redis si REDIS_URL está configurado y accesible."""
        if self._redis_unavailable:
            return None
        redis_url = os.getenv("REDIS_URL", "").strip()
        if not redis_url:
            return None
        try:
            import redis.asyncio as aioredis

            client = aioredis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=0.4,
                socket_timeout=1.0,
            )
            await client.ping()
            return client
        except Exception as exc:
            logger.info(f"Redis Pub/Sub no disponible ({exc}); usando canal en memoria.")
            self._redis_unavailable = True
            return None

    async def _ensure_redis_listener(self, session_id: str) -> None:
        channel = self._channels.get(session_id)
        if channel is None:
            return
        if channel.redis_listener_task is not None and not channel.redis_listener_task.done():
            return
        client = await self._get_redis_client()
        if client is None:
            return

        pubsub = client.pubsub()
        await pubsub.subscribe(channel.channel_name)

        async def _listen() -> None:
            try:
                async for raw_msg in pubsub.listen():
                    if raw_msg.get("type") != "message":
                        continue
                    try:
                        envelope = json.loads(raw_msg["data"])
                        self._dispatch_to_local_queues(session_id, envelope)
                    except Exception:
                        pass
            except asyncio.CancelledError:
                raise
            finally:
                with suppress(Exception):
                    await pubsub.unsubscribe(channel.channel_name)
                    await pubsub.close()
                    await client.aclose()

        channel.redis_listener_task = asyncio.create_task(_listen())

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
        if os.getenv("REDIS_URL", "").strip() and not self._redis_unavailable:
            with suppress(RuntimeError):
                asyncio.create_task(self._ensure_redis_listener(session_id))
        return queue, self.build_snapshot_event(session_id)

    def unsubscribe(self, session_id: str, queue: asyncio.Queue[Dict[str, Any]]) -> None:
        """Elimina la cola de un cliente WebSocket desconectado."""
        channel = self._channels.get(session_id)
        if channel is not None:
            channel.subscribers.discard(queue)
            if (
                not channel.subscribers
                and channel.redis_listener_task is not None
                and not channel.redis_listener_task.done()
            ):
                channel.redis_listener_task.cancel()
                channel.redis_listener_task = None

    def active_subscribers(self, session_id: str) -> int:
        channel = self._channels.get(session_id)
        return len(channel.subscribers) if channel else 0

    async def publish(self, session_id: str, event: str, data: Dict[str, Any]) -> int:
        """
        Publica un evento estructurado en el canal `chat.<session_id>`.
        Si Redis Pub/Sub está activo, difunde vía Redis para múltiples workers; si no, usa memoria.
        """
        channel = self._channels.get(session_id)
        if channel is None:
            return 0

        envelope = {"event": event, "data": data}
        if channel.redis_listener_task is not None and not channel.redis_listener_task.done():
            client = await self._get_redis_client()
            if client is not None:
                try:
                    receivers = await client.publish(
                        channel.channel_name, json.dumps(envelope, ensure_ascii=False)
                    )
                    await client.aclose()
                    return int(receivers)
                except Exception:
                    with suppress(Exception):
                        await client.aclose()

        return self._dispatch_to_local_queues(session_id, envelope)

    def append_user_message(self, session_id: str, text: str) -> ChatMessage:
        """Registra un mensaje entrante del usuario en memoria y en DB."""
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
        self._persist_new_message(msg)
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
        """Marca el mensaje del asistente como completado, persiste en DB y emite `generation_completed`."""
        channel = self._channels.get(session_id)
        if channel is None or channel.active_message is None:
            return
        if channel.active_message.message_id != message_id:
            return

        channel.active_message.status = "completed"
        channel.session.status = "active"
        final_content = channel.active_message.content
        channel.active_message = None

        self._persist_message_update(
            session_id=session_id,
            message_id=message_id,
            content=final_content,
            msg_status="completed",
            session_status="active",
        )

        await self.publish(
            session_id=session_id,
            event="generation_completed",
            data={
                "session_id": session_id,
                "message_id": message_id,
            },
        )

    async def _abort_unlocked(self, session_id: str) -> Optional[ChatMessage]:
        """Cancela la tarea de generación en curso, persiste estado `interrupted` y notifica."""
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

            self._persist_message_update(
                session_id=session_id,
                message_id=interrupted_msg.message_id,
                content=interrupted_msg.content,
                msg_status="interrupted",
                session_status="interrupted",
            )

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
        registra el turno del usuario en DB y lanza una nueva tarea asíncrona para el asistente.
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
            self._persist_new_message(assistant_msg)
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
