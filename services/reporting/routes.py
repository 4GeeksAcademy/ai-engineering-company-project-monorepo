"""Reporting API routes for the weekly location cost & waste pipeline.

Phase 5 — Application integration (PIPELINE_DESIGN.md / CONTEXT-company.md):

| Role | Endpoint | Calls |
| --- | --- | --- |
| Status | ``GET /reporting/pipeline-runs/latest`` | ``get_latest_pipeline_run()`` |
| Trigger | ``POST /reporting/pipeline-runs`` | Celery → ``run_pipeline`` |
| KPI query | ``GET /reporting/weekly-location-performance`` | ``get_weekly_location_performance()`` |

Routes import flows/helpers from ``data/pipelines/`` only — no ETL duplication.
Authentication and error envelopes match the central API (Bearer JWT +
``{status, code, message, detail}``).
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from data.pipelines.pipeline import (
    get_latest_pipeline_run,
    get_weekly_location_performance,
)
from services.reporting.auth_deps import get_current_user
from services.reporting.schemas import (
    PipelineRunLatestResponse,
    PipelineTriggerRequest,
    PipelineTriggerResponse,
    TaskStatusResponse,
    WeeklyLocationPerformanceResponse,
)
from services.safe_errors import ExternalServiceError, public_error_text
from services.task_status import get_task_payload
from services.tasks import run_weekly_pipeline

logger = logging.getLogger("brasaland.reporting")

router = APIRouter(
    tags=["reporting"],
    dependencies=[Depends(get_current_user)],
)

_STORAGE_ERRORS: tuple[type[BaseException], ...] = (
    OSError,
    TimeoutError,
    ConnectionError,
    ExternalServiceError,
    RuntimeError,
)
try:
    import httpx

    _STORAGE_ERRORS = (*_STORAGE_ERRORS, httpx.HTTPError)
except ImportError:
    pass
try:
    from postgrest.exceptions import APIError as PostgrestAPIError

    _STORAGE_ERRORS = (*_STORAGE_ERRORS, PostgrestAPIError)
except ImportError:
    pass

_ENQUEUE_ERRORS: tuple[type[BaseException], ...] = (
    OSError,
    TimeoutError,
    ConnectionError,
    RuntimeError,
)
try:
    from kombu.exceptions import OperationalError as KombuOperationalError

    _ENQUEUE_ERRORS = (*_ENQUEUE_ERRORS, KombuOperationalError)
except ImportError:
    pass
try:
    from redis.exceptions import RedisError

    _ENQUEUE_ERRORS = (*_ENQUEUE_ERRORS, RedisError)
except ImportError:
    pass
try:
    from celery.exceptions import CeleryError

    _ENQUEUE_ERRORS = (*_ENQUEUE_ERRORS, CeleryError)
except ImportError:
    pass


@router.get(
    "/reporting/pipeline-runs/latest",
    response_model=PipelineRunLatestResponse,
    response_model_exclude_unset=True,
)
def get_latest_run() -> PipelineRunLatestResponse:
    """Status query — newest ``reporting.pipeline_runs`` row (or ``last_run.json``).

    Returns CONTEXT-company.md run-log fields only. Does not open
    ``telemetry_events`` and does not start a run.
    """
    try:
        payload = get_latest_pipeline_run()
    except OSError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not read the last pipeline run.",
        ) from error
    if isinstance(payload, dict) and payload.get("error_message"):
        payload = {
            **payload,
            "error_message": public_error_text(
                payload.get("error_message"), "Pipeline failed."
            ),
        }
    if (
        isinstance(payload, dict)
        and payload.get("message")
        and payload.get("run_id") is None
        and payload.get("status") is None
    ):
        return PipelineRunLatestResponse(message=payload["message"])
    return PipelineRunLatestResponse(
        run_id=payload.get("run_id"),
        started_at=payload.get("started_at"),
        finished_at=payload.get("finished_at"),
        window_start=payload.get("window_start"),
        window_end=payload.get("window_end"),
        records_processed=payload.get("records_processed"),
        status=payload.get("status"),
        error_message=payload.get("error_message"),
    )


@router.post(
    "/reporting/pipeline-runs",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=PipelineTriggerResponse,
)
def trigger_pipeline(payload: PipelineTriggerRequest) -> PipelineTriggerResponse:
    """Manual trigger — enqueue Prefect ``run_pipeline`` via Celery; return 202.

    The worker runs extract → transform → load. This route does not call those
    stages itself.
    """
    try:
        async_result = run_weekly_pipeline.delay(payload.start_date, payload.end_date)
    except _ENQUEUE_ERRORS as error:
        logger.warning("pipeline enqueue failed: %s", error.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to enqueue the weekly pipeline. Confirm Redis is running.",
        ) from error
    return PipelineTriggerResponse(task_id=async_result.id)


@router.get(
    "/reporting/weekly-location-performance",
    response_model=WeeklyLocationPerformanceResponse,
)
def get_weekly_performance(
    week_start: Optional[str] = Query(
        default=None,
        description="Optional chain-week start (YYYY-MM-DD) filter",
    ),
) -> WeeklyLocationPerformanceResponse:
    """KPI query — reads ``reporting.weekly_location_performance`` only.

    Response shape matches CONTEXT-company.md. Feed for Part 3's dashboard
    (Mariana, Felipe, Lucía). No ETL in this layer.
    """
    try:
        payload = get_weekly_location_performance(week_start=week_start)
    except _STORAGE_ERRORS as error:
        logger.warning("weekly performance query failed: %s", error.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to read weekly location performance from reporting storage.",
        ) from error
    return WeeklyLocationPerformanceResponse.model_validate(payload)


@router.get(
    "/tasks/{task_id}",
    response_model=TaskStatusResponse,
)
def get_task_status(task_id: str) -> TaskStatusResponse:
    """Poll Celery task status for a manual ``POST /reporting/pipeline-runs`` trigger."""
    try:
        payload = get_task_payload(task_id)
    except _ENQUEUE_ERRORS as error:
        logger.warning("task status lookup failed: %s", error.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Task status is unavailable. Confirm Redis is running.",
        ) from error
    return TaskStatusResponse.model_validate(payload)
