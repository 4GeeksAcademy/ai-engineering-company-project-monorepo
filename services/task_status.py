"""Map Celery AsyncResult states to the API status vocabulary."""
from __future__ import annotations

from typing import Any, Dict, Optional

from celery.result import AsyncResult

from services.celery_app import app as celery_app
from services.safe_errors import public_error_text

# Checklist statuses: pending | started | success | failure
_STATUS_MAP = {
    "PENDING": "pending",
    "RECEIVED": "pending",
    "RETRY": "pending",
    "STARTED": "started",
    "SUCCESS": "success",
    "FAILURE": "failure",
    "REVOKED": "failure",
    "REJECTED": "failure",
}


def map_celery_status(celery_state: str) -> str:
    return _STATUS_MAP.get((celery_state or "PENDING").upper(), "pending")


def get_task_payload(task_id: str) -> Dict[str, Any]:
    """Query the Celery result backend (Redis) for task status/result."""
    async_result = AsyncResult(task_id, app=celery_app)
    status = map_celery_status(async_result.state)

    result: Optional[Any] = None
    if status == "success":
        result = async_result.result
    elif status == "failure":
        result = {"error": public_error_text(str(async_result.result), "Task failed.")}

    return {
        "task_id": task_id,
        "status": status,
        "result": result,
    }
