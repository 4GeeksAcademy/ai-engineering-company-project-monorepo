"""HTTP boundary for the TrackFlow knowledge assistant."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from data.pipelines.rag import query

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class KnowledgeQuery(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


class KnowledgeAnswer(BaseModel):
    answer: str


@router.post("/query", response_model=KnowledgeAnswer)
def ask_knowledge_base(request: KnowledgeQuery) -> KnowledgeAnswer:
    try:
        return KnowledgeAnswer(answer=query(request.question.strip()))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


__all__ = ["router"]
