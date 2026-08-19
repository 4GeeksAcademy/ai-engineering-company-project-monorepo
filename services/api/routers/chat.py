"""WebSocket consumer for brasaland_knowledge_assistant.

The handshake URL must name an existing conversation (``session_id`` or
LangGraph-style ``thread_id`` — the same ``BRS-CHAT-`` value). Auth uses the
same backoffice JWT as tickets/SSE.

This module does not run the model. It subscribes to ``ChatEventHub`` and
forwards published events to the socket. Generation lives on ``KnowledgeProducer``.
"""

from __future__ import annotations

import asyncio
import json

from auth import AuthError, claims_from_access_token, token_from_websocket
from chat import (
    AUTH_TIMEOUT_SECONDS,
    EVENT_AUTH,
    EVENT_INTERRUPT,
    EVENT_USER_MESSAGE,
    WS_CLOSE_BUSY,
    WS_CLOSE_NO_THREAD,
    WS_CLOSE_UNAUTHORIZED,
    SessionBusyError,
    hub,
    knowledge_error_event,
    producers,
    store,
    thread_id_from_websocket,
)
from fastapi import WebSocket, WebSocketDisconnect


async def authenticate_websocket(websocket: WebSocket) -> dict:
    """Require the backoffice JWT before attaching to a thread or sending chat events."""
    token = token_from_websocket(websocket)
    if token:
        return claims_from_access_token(token)
    try:
        data = await asyncio.wait_for(
            websocket.receive_json(),
            timeout=AUTH_TIMEOUT_SECONDS,
        )
    except WebSocketDisconnect as error:
        raise AuthError("Not authenticated") from error
    except (TimeoutError, asyncio.TimeoutError) as error:
        raise AuthError("Not authenticated") from error
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError, TypeError) as error:
        raise AuthError("Not authenticated") from error
    if not isinstance(data, dict) or data.get("event") != EVENT_AUTH:
        raise AuthError("Not authenticated")
    frame_token = str(data.get("token") or data.get("access_token") or "")
    return claims_from_access_token(frame_token)


async def _close_socket(websocket: WebSocket, code: int, reason: str) -> None:
    try:
        await websocket.close(code=code, reason=reason)
    except Exception:
        pass


async def bind_existing_thread(websocket: WebSocket) -> str:
    """Bind this socket to ``session_id`` / ``thread_id`` from the handshake URL."""
    session_id = thread_id_from_websocket(websocket)
    if not session_id:
        raise KeyError("session_id or thread_id required")
    return store.attach(session_id)["session_id"]


async def _consume_hub(websocket: WebSocket, queue: asyncio.Queue) -> None:
    """Consumer: drain the session topic onto this socket."""
    try:
        while True:
            payload = await queue.get()
            await websocket.send_json(payload)
    except asyncio.CancelledError:
        raise
    except (WebSocketDisconnect, Exception):
        return


async def run_knowledge_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await authenticate_websocket(websocket)
    except AuthError:
        await _close_socket(websocket, WS_CLOSE_UNAUTHORIZED, "Not authenticated")
        return

    try:
        session_id = await bind_existing_thread(websocket)
    except SessionBusyError:
        await _close_socket(websocket, WS_CLOSE_BUSY, "Session already connected")
        return
    except KeyError:
        await _close_socket(
            websocket,
            WS_CLOSE_NO_THREAD,
            "session_id or thread_id must name an existing conversation",
        )
        return

    queue = hub.subscribe(session_id)
    producer = producers.get(session_id)
    consumer = asyncio.create_task(_consume_hub(websocket, queue))
    await hub.publish(session_id, store.public_session(session_id))

    try:
        while True:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                raise
            except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
                await hub.publish(
                    session_id,
                    knowledge_error_event("frame must be JSON with an event field"),
                )
                continue
            if not isinstance(data, dict):
                await hub.publish(
                    session_id,
                    knowledge_error_event("frame must be JSON with an event field"),
                )
                continue
            event = data.get("event")
            if event == EVENT_USER_MESSAGE:
                await producer.start_turn(str(data.get("content") or ""))
            elif event == EVENT_INTERRUPT:
                await producer.interrupt(str(data.get("content") or ""))
            else:
                await hub.publish(
                    session_id,
                    knowledge_error_event(
                        "event must be knowledge_user_message or knowledge_interrupt"
                    ),
                )
    except WebSocketDisconnect:
        pass
    finally:
        consumer.cancel()
        try:
            await consumer
        except asyncio.CancelledError:
            pass
        hub.unsubscribe(session_id, queue)
        await producer.abort_generation()
        live = store.get(session_id)
        if live and live["status"] == "streaming":
            store.set_status(session_id, "interrupted")
        store.detach(session_id)
        producers.drop(session_id)
