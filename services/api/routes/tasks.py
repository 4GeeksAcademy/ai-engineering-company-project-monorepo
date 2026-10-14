from __future__ import annotations

from fastapi import APIRouter, HTTPException
from celery.result import AsyncResult

from services.celery_app import celery_app

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/{task_id}")
def get_task_status(task_id: str) -> dict:
    """
    Consulta el estado de una tarea asíncrona encolada con Celery.

    Returns:
        - task_id: ID de la tarea
        - status: PENDING | STARTED | SUCCESS | FAILURE | RETRY
        - result: resultado si la tarea completó exitosamente
        - error: mensaje de error si la tarea falló
    """
    result: AsyncResult = AsyncResult(task_id, app=celery_app)

    response: dict = {
        "task_id": task_id,
        "status": result.status,
    }

    if result.status == "SUCCESS":
        response["result"] = result.result
    elif result.status == "FAILURE":
        response["error"] = str(result.result) if result.result else "Unknown error"
        response["traceback"] = str(result.traceback) if result.traceback else None
    elif result.status == "RETRY":
        response["message"] = "Task is being retried"

    return response