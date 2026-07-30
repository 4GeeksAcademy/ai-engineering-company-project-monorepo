from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from data.pipelines.rag import query

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class QueryRequest(BaseModel):
    question: str = Field(min_length=1)


class QueryResponse(BaseModel):
    answer: str


@router.post("/query", response_model=QueryResponse)
def query_knowledge_base(payload: QueryRequest) -> QueryResponse:
    try:
        answer_text = query(payload.question.strip())
        return QueryResponse(answer=answer_text)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process knowledge query: {error}",
        ) from error
