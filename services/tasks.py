"""Celery tasks for heavy API operations."""
from __future__ import annotations

import logging
import time

from services.celery_app import app
from services.dead_letter import record_dead_letter
from services.safe_errors import public_error_text

logger = logging.getLogger(__name__)


def _execute_pipeline(start_date: str, end_date: str) -> None:
    """Import lazily so the worker can start without loading the full ETL stack."""
    from data.pipelines.pipeline import run_pipeline

    run_pipeline(start_date, end_date)


def _log_task_event(
    *,
    task_id: str,
    attempt: int,
    status: str,
    duration_ms: float,
    error: str | None = None,
) -> None:
    """Structured observability log for every task attempt."""
    message = (
        "task_id=%s attempt=%s status=%s duration_ms=%.2f"
        % (task_id, attempt, status, duration_ms)
    )
    if error is not None:
        message = "%s error=%s" % (message, error)
        logger.error(message)
    else:
        logger.info(message)


@app.task(bind=True, max_retries=3, name="services.tasks.run_weekly_pipeline")
def run_weekly_pipeline(self, start_date: str, end_date: str) -> dict:
    """Async wrapper for the heavy ``POST /reporting/pipeline-runs`` operation.

    Retries up to ``max_retries=3`` with exponential backoff on the countdown.
    Exhausted failures are written to the dead-letter table.
    """
    task_id = str(self.request.id)
    attempt = self.request.retries + 1
    started = time.perf_counter()

    try:
        _execute_pipeline(start_date, end_date)
    except Exception as exc:
        duration_ms = (time.perf_counter() - started) * 1000
        safe_error = public_error_text(str(exc), "pipeline is unavailable")
        _log_task_event(
            task_id=task_id,
            attempt=attempt,
            status="failure",
            duration_ms=duration_ms,
            error=safe_error,
        )
        # Celery re-raises the original exception when retries are exhausted
        # (not always MaxRetriesExceededError), so check the attempt budget first.
        if self.request.retries >= self.max_retries:
            record_dead_letter(
                task_id=task_id,
                attempt=attempt,
                error_message=safe_error,
            )
            _log_task_event(
                task_id=task_id,
                attempt=attempt,
                status="failure_exhausted",
                duration_ms=duration_ms,
                error=safe_error,
            )
            raise

        # Exponential backoff: 2^retries seconds (1, 2, 4, ...) — never immediate.
        countdown = 2 ** self.request.retries
        logger.warning(
            "task_id=%s attempt=%s status=retry countdown=%ss",
            task_id,
            attempt,
            countdown,
        )
        raise self.retry(exc=exc, countdown=countdown)

    duration_ms = (time.perf_counter() - started) * 1000
    _log_task_event(
        task_id=task_id,
        attempt=attempt,
        status="success",
        duration_ms=duration_ms,
    )
    return {
        "status": "success",
        "start_date": start_date,
        "end_date": end_date,
        "task_id": task_id,
        "attempt": attempt,
        "duration_ms": round(duration_ms, 2),
    }


@app.task(bind=True, max_retries=0, name="services.tasks.flower_demo_succeed")
def flower_demo_succeed(self) -> dict:
    """Lightweight success task for Flower / observability demos."""
    task_id = str(self.request.id)
    _log_task_event(task_id=task_id, attempt=1, status="success", duration_ms=0.0)
    return {"status": "success", "task_id": task_id}


@app.task(bind=True, max_retries=0, name="services.tasks.flower_demo_fail")
def flower_demo_fail(self) -> dict:
    """Lightweight failure task for Flower / observability demos."""
    task_id = str(self.request.id)
    err = "flower demo intentional failure"
    _log_task_event(
        task_id=task_id,
        attempt=1,
        status="failure",
        duration_ms=0.0,
        error=err,
    )
    raise RuntimeError(err)
