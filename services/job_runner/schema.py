"""Tabla `job_runs` (hito 21, ticket #DEV-53).

- En PostgreSQL (Supabase) la fuente de verdad del DDL es `sql/001_job_runs.sql`;
  `ensure_job_runs_table()` la ejecuta y es idempotente.
- En SQLite (tests) la tabla se crea desde esta definición, con los mismos checks e índices
  (SQLite también admite índices únicos parciales, así que el lock se prueba de verdad).

Usa su propio `MetaData`: `services/database.create_db_and_tables` (el arranque de la API) nunca
la crea ni la toca. Es del script nocturno, no de la API.
"""

from pathlib import Path

from sqlalchemy import (
    JSON, CheckConstraint, Column, Date, DateTime, Index, MetaData, Table, Text, Uuid, text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.engine import Engine

SQL_DIR = Path(__file__).resolve().parent / "sql"
SCHEMA_SQL = SQL_DIR / "001_job_runs.sql"

PENDING, PROCESSING, COMPLETED, FAILED = "pending", "processing", "completed", "failed"
JOB_STATUSES = (PENDING, PROCESSING, COMPLETED, FAILED)

JsonType = JSON().with_variant(JSONB(), "postgresql")

metadata = MetaData()

job_runs = Table(
    "job_runs",
    metadata,
    # El id lo genera la aplicación (uuid4) para que el mismo INSERT valga en PostgreSQL y SQLite.
    Column("id", Uuid, primary_key=True),
    Column("job_name", Text, nullable=False),
    Column("target_date", Date, nullable=False),
    Column("status", Text, nullable=False),
    Column("started_at", DateTime(timezone=True)),
    Column("finished_at", DateTime(timezone=True)),
    Column("error_message", Text),
    Column("details", JsonType, nullable=False, default=dict),
    Column("created_at", DateTime(timezone=True), nullable=False),
    CheckConstraint(f"status in {JOB_STATUSES}", name="ck_job_runs_status"),
    CheckConstraint("status <> 'processing' or started_at is not null", name="ck_job_runs_started"),
    CheckConstraint("status not in ('completed', 'failed') or finished_at is not null", name="ck_job_runs_finished"),
    CheckConstraint("status <> 'failed' or error_message is not null", name="ck_job_runs_error"),
    Index("ix_job_runs_job_name_target_date", "job_name", "target_date"),
    # El lock: como mucho una fila `processing` por job.
    Index("ux_job_runs_one_processing", "job_name", unique=True,
          sqlite_where=text("status = 'processing'"), postgresql_where=text("status = 'processing'")),
    # La idempotencia, también en la base: un solo `completed` por (job, día).
    Index("ux_job_runs_one_completed_per_date", "job_name", "target_date", unique=True,
          sqlite_where=text("status = 'completed'"), postgresql_where=text("status = 'completed'")),
)


def ensure_job_runs_table(engine: Engine) -> None:
    """Crea `job_runs` y sus índices si no existen. Nunca borra ni altera datos."""
    if engine.dialect.name == "postgresql":
        # psycopg 3 acepta varias sentencias en una ejecución sin parámetros.
        with engine.begin() as connection:
            connection.exec_driver_sql(SCHEMA_SQL.read_text(encoding="utf-8"))
    else:
        metadata.create_all(engine, checkfirst=True)
