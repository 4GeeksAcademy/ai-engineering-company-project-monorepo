"""POST /knowledge/query — question in, grounded answer and cited chunks out.

Mounted from ``services/api/app.py`` (the app ``uvicorn api.app:app`` loads).
Retrieval and wording live in ``data/pipelines/rag.py``.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from data.pipelines.rag import answer_question

logger = logging.getLogger("brasaland.knowledge")

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class SourceChunk(BaseModel):
    source_document: str
    section: str
    text: str
    score: float
    chunk_index: int
    language: str = "en"


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]


@router.post("/query", response_model=QueryResponse)
def query_knowledge_base(payload: QueryRequest) -> QueryResponse:
    """Answer from Brasaland knowledge documents and return the cited chunks."""
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    result = answer_question(question)
    logger.info("knowledge_query sources=%d", len(result["sources"]))
    return QueryResponse(**result)
