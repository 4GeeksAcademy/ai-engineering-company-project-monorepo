"""In-memory Brasaland knowledge-assistant chat sessions and event bus.

Field and event names: docs/10-realtime/communication/CONTEXT-company.md

The agent **produces** named events onto ``ChatEventHub`` (topic = ``session_id`` /
``thread_id``). WebSocket connections **subscribe** and consume that topic. Redis
is not required; the in-process hub is the pub/sub backplane for this deliverable.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Iterator
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from data.pipelines.rag import query_stream

COMPANY_SLUG = "brasaland"
AGENT_ID = "brasaland_knowledge_assistant"
SESSION_ID_PREFIX = "BRS-CHAT-"
SESSION_STATUSES = ("idle", "streaming", "interrupted")
TURN_STATUSES = ("complete", "interrupted")
EVENT_USER_MESSAGE = "knowledge_user_message"
EVENT_INTERRUPT = "knowledge_interrupt"
EVENT_AUTH = "knowledge_auth"
EVENT_SESSION = "knowledge_session"
EVENT_TOKEN = "knowledge_token"
EVENT_ASSISTANT_MESSAGE = "knowledge_assistant_message"
EVENT_ERROR = "knowledge_error"
CLIENT_EVENTS = (EVENT_USER_MESSAGE, EVENT_INTERRUPT)
SERVER_EVENTS = (EVENT_SESSION, EVENT_TOKEN, EVENT_ASSISTANT_MESSAGE, EVENT_ERROR)
SESSION_EVENT_FIELDS = (
    "event",
    "session_id",
    "thread_id",
    "company",
    "agent_id",
    "status",
    "messages",
)
TOKEN_EVENT_FIELDS = ("event", "session_id", "thread_id", "delta")
ASSISTANT_EVENT_FIELDS = ("event", "session_id", "thread_id", "content", "status")
ERROR_EVENT_FIELDS = ("event", "detail")
SESSION_RECORD_FIELDS = (
    "session_id",
    "thread_id",
    "company",
    "agent_id",
    "status",
    "created_at",
)
PART1_PAYLOAD_FIELDS = frozenset(
    {
        "ticket_id",
        "ticket_type",
        "location_id",
        "assignee",
        "amount_usd",
        "protein_days_remaining",
        "consecutive_shrinkage_weeks",
        "category",
        "kg",
        "protein",
    }
)
PART1_EVENT_NAMES = frozenset(
    {
        "emergency_order_created",
        "waste_escalation_created",
        "rfp_ticket_created",
        "emergency_order",
        "waste_escalation",
    }
)
WS_CLOSE_UNAUTHORIZED = 4401
WS_CLOSE_NO_THREAD = 4404
WS_CLOSE_BUSY = 4409
AUTH_TIMEOUT_SECONDS = 5.0
THREAD_QUERY_PARAMS = ("session_id", "thread_id")
# LangGraph astream mode that fits token UI. This agent is not a graph; query_stream
# yields the same thing ``stream_mode="messages"`` would (AIMessageChunk text).
STREAM_MODE = "messages"
# Assignment rubric names → Part 2 CONTEXT wire events (generic names are not sent).
TOKEN_CHUNK = EVENT_TOKEN  # token_chunk
GENERATION_INTERRUPTED = "interrupted"
GENERATION_COMPLETED = "complete"


class SessionBusyError(Exception):
    """Another socket is already attached to this conversation thread."""


def thread_id_from_websocket(websocket: Any) -> str:
    """LangGraph ``thread_id`` is an alias of Brasaland ``session_id`` (this agent is not a graph)."""
    for key in THREAD_QUERY_PARAMS:
        value = (websocket.query_params.get(key) or "").strip()
        if value:
            return value
    return ""


def _utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class ChatSessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, dict[str, Any]] = {}
        self._seq = 0

    def reset(self) -> None:
        self._sessions.clear()
        self._seq = 0

    def create(self) -> dict[str, Any]:
        self._seq += 1
        session_id = f"{SESSION_ID_PREFIX}{self._seq:06d}"
        session = {
            "session_id": session_id,
            "thread_id": session_id,
            "company": COMPANY_SLUG,
            "agent_id": AGENT_ID,
            "status": "idle",
            "messages": [],
            "created_at": _utcnow(),
            "attached": False,
        }
        self._sessions[session_id] = session
        return deepcopy(session)

    def close(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def attach(self, session_id: str) -> dict[str, Any]:
        session = self._sessions.get(session_id)
        if session is None:
            raise KeyError(session_id)
        if session.get("attached"):
            raise SessionBusyError(session_id)
        session["attached"] = True
        return deepcopy(session)

    def detach(self, session_id: str) -> None:
        session = self._sessions.get(session_id)
        if session is not None:
            session["attached"] = False

    def get(self, session_id: str) -> dict[str, Any] | None:
        session = self._sessions.get(session_id)
        return deepcopy(session) if session else None

    def active_ids(self) -> tuple[str, ...]:
        return tuple(self._sessions)

    def set_status(self, session_id: str, status: str) -> dict[str, Any]:
        if status not in SESSION_STATUSES:
            raise ValueError("status must be idle, streaming, or interrupted")
        session = self._sessions[session_id]
        session["status"] = status
        return deepcopy(session)

    def add_message(self, session_id: str, role: str, content: str) -> dict[str, Any]:
        session = self._sessions[session_id]
        session["messages"].append(
            {
                "role": role,
                "content": content,
                "created_at": _utcnow(),
            }
        )
        return deepcopy(session)

    def history_for_llm(self, session_id: str) -> list[dict[str, str]]:
        session = self._sessions[session_id]
        return [
            {"role": row["role"], "content": row["content"]}
            for row in session["messages"]
            if row.get("role") in {"user", "assistant"} and row.get("content")
        ]

    def public_record(self, session_id: str) -> dict[str, Any]:
        session = self._sessions[session_id]
        return {
            "session_id": session["session_id"],
            "thread_id": session["thread_id"],
            "company": session["company"],
            "agent_id": session["agent_id"],
            "status": session["status"],
            "created_at": session["created_at"],
        }

    def public_session(self, session_id: str) -> dict[str, Any]:
        """``knowledge_session`` wire frame, including the thread checkpoint."""
        session = self._sessions[session_id]
        return {
            "event": EVENT_SESSION,
            "session_id": session["session_id"],
            "thread_id": session["thread_id"],
            "company": session["company"],
            "agent_id": session["agent_id"],
            "status": session["status"],
            "messages": deepcopy(session["messages"]),
        }


def knowledge_token_event(session_id: str, delta: str) -> dict[str, Any]:
    """``knowledge_token`` wire frame: ``session_id``, ``thread_id``, ``delta``."""
    return {
        "event": EVENT_TOKEN,
        "session_id": session_id,
        "thread_id": session_id,
        "delta": delta,
    }


def knowledge_assistant_event(session_id: str, content: str, status: str) -> dict[str, Any]:
    """``knowledge_assistant_message`` wire frame (complete or interrupted)."""
    return {
        "event": EVENT_ASSISTANT_MESSAGE,
        "session_id": session_id,
        "thread_id": session_id,
        "content": content,
        "status": status,
    }


def knowledge_error_event(detail: str) -> dict[str, str]:
    """``knowledge_error`` wire frame: ``detail`` only."""
    return {"event": EVENT_ERROR, "detail": detail}


def _next_delta(iterator: Iterator[str]) -> str | None:
    try:
        return next(iterator)
    except StopIteration:
        return None
    except Exception:
        return None


class ChatEventHub:
    """In-process pub/sub for knowledge-assistant events. Topic is ``session_id``.

    Same producer/consumer shape as Redis pub/sub: the agent publishes, sockets
    subscribe. Queues stay in-process so this deliverable does not need Redis.
    """

    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = {}

    def reset(self) -> None:
        self._subscribers.clear()

    def subscribe(self, topic: str) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._subscribers.setdefault(topic, set()).add(queue)
        return queue

    def unsubscribe(self, topic: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        buckets = self._subscribers.get(topic)
        if not buckets:
            return
        buckets.discard(queue)
        if not buckets:
            self._subscribers.pop(topic, None)

    async def publish(self, topic: str, event: dict[str, Any]) -> None:
        payload = deepcopy(event)
        for queue in list(self._subscribers.get(topic, ())):
            await queue.put(deepcopy(payload))


class KnowledgeProducer:
    """Runs ``query_stream`` and publishes named events. No WebSocket here."""

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self._cancel = asyncio.Event()
        self._task: asyncio.Task[None] | None = None
        self._model_abort: Callable[[], None] | None = None

    def _register_model_abort(self, close_stream: Callable[[], None]) -> None:
        if self._cancel.is_set():
            close_stream()
            self._model_abort = None
            return
        self._model_abort = close_stream

    async def publish(self, event: dict[str, Any]) -> None:
        await hub.publish(self.session_id, event)

    async def abort_generation(self) -> None:
        """Stop this generation: close the model stream and cancel the turn task.

        This is not LangGraph ``interrupt()`` HITL. There is no graph to pause.
        """
        self._cancel.set()
        closer = self._model_abort
        self._model_abort = None
        if closer is not None:
            try:
                closer()
            except Exception:
                pass
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def start_turn(self, content: str) -> None:
        text = content.strip()
        if not text:
            await self.publish(knowledge_error_event("content is required"))
            return
        if self._task and not self._task.done():
            await self.abort_generation()
        self._cancel.clear()
        self._task = asyncio.create_task(self._run_turn(text))

    async def interrupt(self, content: str = "") -> None:
        await self.abort_generation()
        steer = content.strip()
        if steer:
            await self.start_turn(steer)

    async def _run_turn(self, content: str) -> None:
        store.add_message(self.session_id, "user", content)
        store.set_status(self.session_id, "streaming")
        await self.publish(store.public_session(self.session_id))
        collected: list[str] = []
        history = store.history_for_llm(self.session_id)[:-1]
        iterator = query_stream(
            content,
            history=history,
            should_cancel=self._cancel.is_set,
            on_abort=self._register_model_abort,
        )
        try:
            while not self._cancel.is_set():
                delta = await asyncio.to_thread(_next_delta, iterator)
                if delta is None or self._cancel.is_set():
                    break
                if not isinstance(delta, str) or not delta:
                    continue
                collected.append(delta)
                if self._cancel.is_set():
                    break
                await self.publish(knowledge_token_event(self.session_id, delta))
        except asyncio.CancelledError:
            self._cancel.set()
        except Exception as error:
            if not self._cancel.is_set():
                await self.publish(knowledge_error_event(str(error)))
        finally:
            answer = "".join(collected)
            interrupted = self._cancel.is_set()
            if answer:
                store.add_message(self.session_id, "assistant", answer)
            store.set_status(self.session_id, "interrupted" if interrupted else "idle")
            try:
                await self.publish(
                    knowledge_assistant_event(
                        self.session_id,
                        answer,
                        "interrupted" if interrupted else "complete",
                    )
                )
                await self.publish(store.public_session(self.session_id))
            except (asyncio.CancelledError, Exception):
                pass


class ProducerRegistry:
    def __init__(self) -> None:
        self._producers: dict[str, KnowledgeProducer] = {}

    def reset(self) -> None:
        self._producers.clear()

    def get(self, session_id: str) -> KnowledgeProducer:
        producer = self._producers.get(session_id)
        if producer is None:
            producer = KnowledgeProducer(session_id)
            self._producers[session_id] = producer
        return producer

    def drop(self, session_id: str) -> None:
        self._producers.pop(session_id, None)


store = ChatSessionStore()
hub = ChatEventHub()
producers = ProducerRegistry()


def reset_chats() -> None:
    store.reset()
    hub.reset()
    producers.reset()
