"""Control de estado de los jobs programados: tabla `job_runs` (hito 21, ticket #DEV-53).

    schema.py   la tabla, sus checks e índices (DDL de PostgreSQL en sql/001_job_runs.sql)
    db.py       conexión sin pasar por la API (JOB_RUNS_DATABASE_URL o DATABASE_URL)
    runs.py     máquina de estados pending → processing → completed | failed, lock e idempotencia

No importa FastAPI ni la configuración de la API: lo usa scripts/nightly_export.py, un proceso
independiente.
"""

from .db import DatabaseNotConfigured, make_engine, safe_url
from .runs import (
    InvalidTransition, JobAlreadyCompleted, JobAlreadyRunning, TrackedRun, claim_run, create_run, error_message,
    fail_stale_runs, get_run, has_completed_for_date, has_processing_lock, list_runs, mark_completed, mark_failed,
    mark_processing, tracked_run,
)
from .schema import COMPLETED, FAILED, JOB_STATUSES, PENDING, PROCESSING, ensure_job_runs_table, job_runs

__all__ = [
    "COMPLETED", "FAILED", "JOB_STATUSES", "PENDING", "PROCESSING",
    "DatabaseNotConfigured", "InvalidTransition", "JobAlreadyCompleted", "JobAlreadyRunning", "TrackedRun",
    "claim_run", "create_run", "ensure_job_runs_table", "error_message", "fail_stale_runs", "get_run",
    "has_completed_for_date", "has_processing_lock", "job_runs", "list_runs", "make_engine", "mark_completed",
    "mark_failed", "mark_processing", "safe_url", "tracked_run",
]
