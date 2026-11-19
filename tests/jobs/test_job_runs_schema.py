"""Tabla `job_runs` (hito 21, Fase 1): columnas, checks e índices."""

import uuid
from datetime import date, datetime, timezone

import pytest
from sqlalchemy import inspect, insert
from sqlalchemy.exc import IntegrityError

from services.job_runner import ensure_job_runs_table, job_runs
from services.job_runner.schema import SCHEMA_SQL

NOW = datetime(2026, 11, 19, 2, 30, tzinfo=timezone.utc)
DAY = date(2026, 11, 18)


def _row(**values):
    row = {"id": uuid.uuid4(), "job_name": "nightly_export", "target_date": DAY, "status": "pending",
           "details": {}, "created_at": NOW}
    row.update(values)
    return row


def test_the_table_has_the_required_columns(jobs_db):
    columns = {column["name"] for column in inspect(jobs_db).get_columns("job_runs")}
    assert {"id", "job_name", "target_date", "status", "started_at", "finished_at", "error_message",
            "created_at"} <= columns


def test_there_is_an_index_on_job_name_and_target_date(jobs_db):
    indexes = {index["name"]: index for index in inspect(jobs_db).get_indexes("job_runs")}
    assert indexes["ix_job_runs_job_name_target_date"]["column_names"] == ["job_name", "target_date"]


def test_ensure_is_idempotent(jobs_db):
    ensure_job_runs_table(jobs_db)
    ensure_job_runs_table(jobs_db)


def test_status_outside_the_state_machine_is_rejected(jobs_db):
    with pytest.raises(IntegrityError), jobs_db.begin() as connection:
        connection.execute(insert(job_runs).values(_row(status="skipped")))


def test_a_failed_run_needs_an_error_message_and_a_finish_time(jobs_db):
    with pytest.raises(IntegrityError), jobs_db.begin() as connection:
        connection.execute(insert(job_runs).values(_row(status="failed", finished_at=NOW)))


def test_only_one_processing_row_per_job(jobs_db):
    with jobs_db.begin() as connection:
        connection.execute(insert(job_runs).values(_row(status="processing", started_at=NOW)))
        # Otro job sí puede estar en curso a la vez.
        connection.execute(insert(job_runs).values(_row(job_name="other_job", status="processing", started_at=NOW)))
    with pytest.raises(IntegrityError), jobs_db.begin() as connection:
        connection.execute(insert(job_runs).values(_row(status="processing", started_at=NOW,
                                                        target_date=date(2026, 11, 17))))


def test_only_one_completed_row_per_job_and_day(jobs_db):
    with jobs_db.begin() as connection:
        connection.execute(insert(job_runs).values(_row(status="completed", started_at=NOW, finished_at=NOW)))
        connection.execute(insert(job_runs).values(_row(status="failed", started_at=NOW, finished_at=NOW,
                                                        error_message="boom")))
    with pytest.raises(IntegrityError), jobs_db.begin() as connection:
        connection.execute(insert(job_runs).values(_row(status="completed", started_at=NOW, finished_at=NOW)))


def test_the_postgres_migration_declares_the_same_guarantees():
    sql = SCHEMA_SQL.read_text(encoding="utf-8")
    assert "create table if not exists public.job_runs" in sql
    assert "on public.job_runs (job_name, target_date)" in sql
    assert "where status = 'processing'" in sql
    assert "where status = 'completed'" in sql
    assert "pipeline_runs" in sql  # documenta que son capas distintas
