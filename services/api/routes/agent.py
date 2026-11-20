"""
services/api/routes/agent.py
Router FastAPI para el agente de soporte con LangGraph.
Endpoint protegido con Auth Guard Standard que delega la ejecución al grafo compilado.
"""
from __future__ import annotations
import asyncio
import logging
import re
import uuid
from contextlib import suppress
from typing import Any, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from pydantic import BaseModel, Field
from services.api.routes.auth import get_current_user
from services.api.ws_chat_manager import ChatMessage, chat_session_manager
from services.agent.graph import agent_app
from services.agent.state import AgentState
from services.agent.guardrails import guardrail_tracker

logger = logging.getLogger("nexova.agent_route")

router = APIRouter(prefix="/agent", tags=["Agente de Soporte (LangGraph)"])

class AgentQueryRequest(BaseModel):
    """Esquema de solicitud para consultar al agente."""
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Pregunta en lenguaje natural sobre políticas, procedimientos o servicios.",
        examples=["¿Cuál es la garantía de reposición en headhunting?"],
    )
    thread_id: Optional[str] = Field(
        default=None,
        description="ID opcional del hilo de conversación para seguimiento con checkpointing.",
    )

class AgentQueryResponse(BaseModel):
    """Esquema de respuesta estructurada con trazabilidad."""
    question: str
    answer: str
    execution_trace: list[str]
    sources_count: int
    thread_id: str
    intent: Optional[str] = None
    tool_data: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    memory_proposal: Optional[dict[str, Any]] = None
    memory_decision: Optional[str] = None
    memory_audit: Optional[dict[str, Any]] = None
    guardrail_triggered: bool = False
    guardrail_failure_type: Optional[str] = None

@router.post(
    "/query",
    response_model=AgentQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar al agente de soporte orquestado con LangGraph",
    description="Invoca el grafo de estados compilado. Retorna la respuesta y el trace de auditoría.",
)

def query_agent(
    payload: AgentQueryRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AgentQueryResponse:
    """
    Endpoint protegido para ejecutar una consulta contra el agente.
    Delega enteramente la orquestación al grafo de LangGraph.
    """
    active_thread = payload.thread_id or str(uuid.uuid4())
    logger.info(f"Invocando agente para usuario '{current_user.get('email', 'anónimo')}' (thread: {active_thread})")
    initial_state: AgentState = {
        "question": payload.question,
        "thread_id": active_thread,
        "context": [],
        "answer": "",
        "error": None,
        "execution_trace": [],
    }
    config = {"configurable": {"thread_id": active_thread}}
    try:
        final_state = agent_app.invoke(initial_state, config=config)
    except Exception as exc:
        logger.error(f"Fallo no controlado en la ejecución del grafo: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error interno al procesar la consulta en el flujo del agente.",
        )
    return AgentQueryResponse(
        question=final_state.get("question", payload.question),
        answer=final_state.get("answer", ""),
        execution_trace=final_state.get("execution_trace", []),
        sources_count=len(final_state.get("context", [])),
        thread_id=active_thread,
        intent=final_state.get("intent"),
        tool_data=final_state.get("tool_data"),
        error=final_state.get("error"),
        memory_proposal=final_state.get("memory_proposal"),
        memory_decision=final_state.get("memory_decision"),
        memory_audit=final_state.get("memory_audit"),
        guardrail_triggered=bool(final_state.get("guardrail_triggered", False)),
        guardrail_failure_type=final_state.get("guardrail_failure_type"),
    )

async def _stream_agent_turn(session_id: str, question: str, assistant_msg: ChatMessage) -> None:
    """
    Ejecuta el grafo `agent_app` en modo streaming y publica cada token en `chat.<session_id>`.
    Permite cancelación instantánea via `asyncio.CancelledError` sin modificar `services/agent/`.
    """
    initial_state: AgentState = {
        "question": question,
        "thread_id": session_id,
        "context": [],
        "answer": "",
        "error": None,
        "execution_trace": [],
    }
    config = {"configurable": {"thread_id": session_id}}

    sequence = 1
    streamed_from_messages = False

    async for mode, chunk in agent_app.astream(
        initial_state,
        config=config,
        stream_mode=["messages", "updates"],
    ):
        if mode == "messages":
            msg_chunk = chunk[0] if isinstance(chunk, tuple) else chunk
            token_text = getattr(msg_chunk, "content", None)
            if isinstance(token_text, str) and token_text:
                streamed_from_messages = True
                await chat_session_manager.append_token(
                    session_id=session_id,
                    message_id=assistant_msg.message_id,
                    token=token_text,
                    sequence=sequence,
                )
                sequence += 1
        elif mode == "updates" and not streamed_from_messages and isinstance(chunk, dict):
            for node_output in chunk.values():
                if isinstance(node_output, dict):
                    answer = node_output.get("answer")
                    if isinstance(answer, str) and answer:
                        tokens = re.findall(r"\S+\s*|\n", answer)
                        for tok in tokens:
                            await chat_session_manager.append_token(
                                session_id=session_id,
                                message_id=assistant_msg.message_id,
                                token=tok,
                                sequence=sequence,
                            )
                            sequence += 1
                            await asyncio.sleep(0.025)

    await chat_session_manager.complete_assistant_message(
        session_id=session_id,
        message_id=assistant_msg.message_id,
    )


async def _authenticate_websocket(
    websocket: WebSocket,
    query_token: Optional[str],
) -> Optional[dict[str, Any]]:
    """
    Valida el JWT recibido por query string (`?token=...`) o por primer frame `auth`.
    Cierra con código 1008 si falta o es inválido.
    """
    token = query_token
    accepted = False

    if not token:
        await websocket.accept()
        accepted = True
        try:
            first_frame = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
            if (
                isinstance(first_frame, dict)
                and first_frame.get("event") == "auth"
                and isinstance(first_frame.get("data"), dict)
            ):
                token = first_frame["data"].get("token")
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Auth required")
            return None

    if not token:
        if not accepted:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        else:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return None

    try:
        user = get_current_user(token=token)
    except HTTPException:
        if accepted:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        else:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return None

    if not accepted:
        await websocket.accept()

    return user


@router.websocket("/ws/{session_id}")
async def support_chat_websocket(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(default=None),
) -> None:
    """
    Endpoint WebSocket bidireccional para streaming token-a-token e interrupciones en vivo.
    Vincula la sesión al `thread_id` de LangGraph y difunde eventos vía `chat.<session_id>`.
    """
    if not session_id or not session_id.strip():
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="session_id required")
        return

    current_user = await _authenticate_websocket(websocket, token)
    if current_user is None:
        return

    user_id = str(current_user.get("id") or current_user.get("email") or "anonymous")
    queue, snapshot_event = chat_session_manager.subscribe(
        session_id=session_id,
        user_id=user_id,
    )

    # Enviar snapshot inicial de rehidratación antes de aceptar nuevos tokens
    await websocket.send_json(snapshot_event)

    async def _sender_loop() -> None:
        while True:
            envelope = await queue.get()
            await websocket.send_json(envelope)

    sender_task = asyncio.create_task(_sender_loop())

    try:
        while True:
            payload = await websocket.receive_json()
            if not isinstance(payload, dict):
                continue

            event_name = payload.get("event")
            data = payload.get("data") or {}

            if event_name == "user_message":
                text = str(data.get("text") or "").strip()
                if text:
                    await chat_session_manager.start_generation(
                        session_id=session_id,
                        user_text=text,
                        runner_factory=lambda msg, q=text: _stream_agent_turn(session_id, q, msg),
                    )
            elif event_name == "interrupt_requested":
                new_input = str(data.get("new_input") or "").strip()
                if new_input:
                    await chat_session_manager.start_generation(
                        session_id=session_id,
                        user_text=new_input,
                        runner_factory=lambda msg, q=new_input: _stream_agent_turn(session_id, q, msg),
                    )
                else:
                    await chat_session_manager.interrupt_generation(session_id=session_id)
    except WebSocketDisconnect:
        pass
    finally:
        sender_task.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await sender_task
        chat_session_manager.unsubscribe(session_id=session_id, queue=queue)


@router.get(
    "/guardrails/summary",
    status_code=status.HTTP_200_OK,
    summary="Resumen de observabilidad de guardrails",
    description="Devuelve cuántas veces se activó cada guardrail y el desglose por tipo de fallo.",
)
def get_guardrails_summary(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Endpoint protegido que expone las métricas de activación del harness de guardrails."""
    return guardrail_tracker.get_summary()
