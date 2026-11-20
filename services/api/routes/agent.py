"""
services/api/routes/agent.py
Router FastAPI para el agente de soporte con LangGraph.
Endpoint protegido con Auth Guard Standard que delega la ejecución al grafo compilado.
"""
from __future__ import annotations
import logging
import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from services.api.routes.auth import get_current_user
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