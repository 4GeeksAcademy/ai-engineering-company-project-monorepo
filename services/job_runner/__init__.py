"""Control de estado de los jobs programados: tabla `job_runs` (hito 21, ticket #DEV-53).

    schema.py   la tabla, sus checks e índices (DDL de PostgreSQL en sql/001_job_runs.sql)
    db.py       conexión sin pasar por la API (JOB_RUNS_DATABASE_URL o DATABASE_URL)
"""

from .db import DatabaseNotConfigured, make_engine, safe_url
from .schema import COMPLETED, FAILED, JOB_STATUSES, PENDING, PROCESSING, ensure_job_runs_table, job_runs

__all__ = [
    "COMPLETED", "FAILED", "JOB_STATUSES", "PENDING", "PROCESSING",
    "DatabaseNotConfigured", "ensure_job_runs_table", "job_runs", "make_engine", "safe_url",
]
