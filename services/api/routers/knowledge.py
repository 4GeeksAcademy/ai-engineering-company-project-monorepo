"""Brasaland knowledge-base query API (see CONTEXT-company.md).

POST /knowledge/query — request ``{"question": "..."}``, response ``{"answer": "..."}``.
POST /knowledge/sessions — create a conversation thread (``session_id`` / ``thread_id``).
WS /knowledge/ws — same ``query`` agent, streamed tokens, interruptible.
Handshake must include JWT plus ``session_id`` or ``thread_id`` for an existing thread.

This router is a thin HTTP/WebSocket adapter. ``POST /query`` delegates to
``data.pipelines.rag.query()``. Streaming lives on ``KnowledgeProducer``, which
publishes to ``ChatEventHub``; the WebSocket only subscribes. Retrieval,
embedding, and generation live in ``data/pipelines/`` — never duplicated here.
"""

from typing import Annotated, Any

from auth import require_backoffice_user
from chat import store
from data.pipelines.rag import query
from fastapi import APIRouter, Depends, HTTPException, WebSocket
from pydantic import BaseModel, ConfigDict, Field
from routers.chat import run_knowledge_websocket

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class QueryRequest(BaseModel):
    question: str = Field(min_length=1)


class QueryResponse(BaseModel):
    """Public API shape — answer string only; never chunks, scores, or Qdrant payloads."""

    model_config = ConfigDict(extra="forbid")

    answer: str


@router.post("/query", response_model=QueryResponse)
def query_knowledge_base(payload: QueryRequest) -> QueryResponse:
    """Return the model-generated answer only.

    Retrieval metadata (chunks, similarity scores, Qdrant hits) stays in
    ``data/pipelines/`` and may be logged server-side when ``RAG_DEBUG`` is set.
    """
    try:
        answer_text = query(payload.question.strip())
        return QueryResponse(answer=answer_text)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process knowledge query: {error}",
        ) from error


@router.post("/sessions", status_code=201)
def create_knowledge_session(
    _user: Annotated[dict, Depends(require_backoffice_user)],
) -> dict[str, Any]:
    """Open a conversation thread. The WebSocket handshake must pass this id."""
    session = store.create()
    return store.public_record(session["session_id"])


@router.websocket("/ws")
async def knowledge_query_stream(websocket: WebSocket) -> None:
    """Persistent socket bound to an existing ``session_id`` / ``thread_id``."""
    await run_knowledge_websocket(websocket)
