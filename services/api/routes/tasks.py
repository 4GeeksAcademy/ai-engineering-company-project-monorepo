"""
Router para consulta de estado de tareas asíncronas con Celery.
Ticket #DEV-55 — Colas de Mensajes y Tareas Asíncronas (Nexova Solutions).
"""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from celery.result import AsyncResult

from services.celery_app import celery_app
from services.api.routes.auth import get_current_user

logger = logging.getLogger("nexova.tasks_route")

router = APIRouter(tags=["Tasks & Background Jobs"])


@router.get("/tasks/{task_id}")
@router.get("/api/tasks/{task_id}", include_in_schema=False)
def get_task_status(task_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Consulta el estado actual de una tarea asíncrona en Redis.
    Estados posibles: 'pending', 'started', 'success', 'failure'.
    Retorna el resultado cuando esté disponible.
    """
    try:
        async_result = AsyncResult(task_id, app=celery_app)
        raw_status = async_result.status.upper()

        # Normalización canónica de estados conforme al ticket DEV-55
        if raw_status in ("PENDING", "RECEIVED"):
            status = "pending"
            result = None
        elif raw_status in ("STARTED", "RETRY"):
            status = "started"
            result = None
        elif raw_status == "SUCCESS":
            status = "success"
            result = async_result.result
        elif raw_status in ("FAILURE", "REVOKED"):
            status = "failure"
            result = str(async_result.result)
        else:
            status = raw_status.lower()
            result = None

        return {
            "task_id": task_id,
            "status": status,
            "result": result
        }

    except Exception as exc:
        logger.error(f"Error consultando estado de task {task_id}: {exc}")
        raise HTTPException(status_code=500, detail=f"Error consultando estado de la tarea: {str(exc)}")
