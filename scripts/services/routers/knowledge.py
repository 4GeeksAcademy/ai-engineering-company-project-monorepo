from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from data.pipelines.rag import query

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    answer: str


@router.post("/query", response_model=QueryResponse)
async def query_knowledge_base(payload: QueryRequest):
    """
    Accepts a question, delegates to data.pipelines.rag.query(),
    and returns only the model-generated answer string.
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        answer_text = query(payload.question)
        return QueryResponse(answer=answer_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process query: {str(e)}")