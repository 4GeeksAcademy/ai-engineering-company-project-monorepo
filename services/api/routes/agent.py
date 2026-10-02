"""HTTP boundary for the LangGraph agent endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.agent_service.graph import run_agent

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentQuery(BaseModel):
    question: str = Field(min_length=2, max_length=1000)


class AgentStep(BaseModel):
    node: str
    timestamp: str
    input: str | dict | None = None
    output: str | dict | None = None


class AgentTrace(BaseModel):
    run_id: str
    question: str
    timestamp: str
    nodes: list[AgentStep]


class AgentAnswer(BaseModel):
    answer: str
    trace: dict | None = None
    run_id: str | None = None


@router.post("/query", response_model=AgentAnswer)
def agent_query(request: AgentQuery) -> AgentAnswer:
    """Execute the LangGraph agent graph and return the answer + trace.

    The endpoint contains no business logic — it only invokes the compiled
    graph. Errors return a clear message, never a raw stack trace.
    """
    try:
        result = run_agent(request.question.strip())
        return AgentAnswer(
            answer=result["answer"],
            trace=result["trace"],
            run_id=result["run_id"],
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error interno al procesar la consulta. Por favor intente nuevamente.",
        ) from exc


__all__ = ["router"]