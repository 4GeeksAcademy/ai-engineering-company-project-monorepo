"""Execution log — docs/PIPELINE_DESIGN.md sections 9-10.

Plain functions, deliberately *not* Prefect tasks: per section 10, "la
escritura del log (reporting.pipeline_runs) no es una tarea de Prefect —
vive como código plano dentro del cuerpo del flow ... porque no necesita
la semántica de reintentos de Prefect; es la propia bitácora de lo que les
pasó a las tareas." Writing the log is not expected to fail the way a
network call to an external service is — it uses the same DB connection
as every other step, and if it did fail, retrying it has no special
recovery semantics worth encoding here.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import insert, select, update
from sqlmodel import Session

import _pathsetup  # noqa: F401

from app.core.database import engine
from schema import pipeline_runs_table


def start_pipeline_run(
    *,
    pipeline_name: str,
    pipeline_version: str,
    requested_week_start: date,
    triggered_by: str,
    prefect_flow_run_id: str | None = None,
    scope: dict[str, Any] | None = None,
) -> UUID:
    """Insert the `running` row for a new attempt; return its id.

    Every run gets its own row (section 9: "cada fila de pipeline_runs es
    un intento inmutable; un rerun crea una fila nueva, nunca sobrescribe
    el resultado de una corrida pasada").
    """
    run_id = uuid4()
    with Session(engine) as db:
        db.execute(
            insert(pipeline_runs_table).values(
                id=run_id,
                prefect_flow_run_id=prefect_flow_run_id,
                pipeline_name=pipeline_name,
                pipeline_version=pipeline_version,
                requested_week_start=requested_week_start,
                scope=scope or {},
                status="running",
                started_at=datetime.now(timezone.utc),
                triggered_by=triggered_by,
            )
        )
        db.commit()
    return run_id


def set_prefect_flow_run_id(run_id: UUID, prefect_flow_run_id: str) -> None:
    """Attach the current Prefect flow run's id to an already-created row
    — used when `run_id` was created by a caller (e.g. the manual-trigger
    endpoint) before the flow itself even started, so `start_pipeline_run`
    never got the chance to set it (see flow.py).
    """
    with Session(engine) as db:
        db.execute(
            update(pipeline_runs_table)
            .where(pipeline_runs_table.c.id == run_id)
            .values(prefect_flow_run_id=prefect_flow_run_id)
        )
        db.commit()


def finish_pipeline_run(
    run_id: UUID,
    *,
    status: str,
    records_read: int | None = None,
    records_rejected: int | None = None,
    records_transformed: int | None = None,
    records_loaded: int | None = None,
    failed_stage: str | None = None,
    error_summary: str | None = None,
    optional_step_error: str | None = None,
) -> None:
    """Update a run's final state ('succeeded' or 'failed').

    `error_summary`/`failed_stage` are for a mandatory-stage
    (extract/transform/load) failure; `optional_step_error` is set
    independently (possibly alongside `status='succeeded'`) when only the
    optional/non-critical step failed — the two are never conflated, per
    this phase's explicit requirement to distinguish them.
    """
    if status not in ("succeeded", "failed"):
        raise ValueError(f"finish_pipeline_run: invalid status {status!r}")

    with Session(engine) as db:
        db.execute(
            update(pipeline_runs_table)
            .where(pipeline_runs_table.c.id == run_id)
            .values(
                status=status,
                finished_at=datetime.now(timezone.utc),
                records_read=records_read,
                records_rejected=records_rejected,
                records_transformed=records_transformed,
                records_loaded=records_loaded,
                failed_stage=failed_stage,
                error_summary=error_summary,
                optional_step_error=optional_step_error,
            )
        )
        db.commit()


def get_run(run_id: UUID) -> dict[str, Any] | None:
    with Session(engine) as db:
        row = db.execute(select(pipeline_runs_table).where(pipeline_runs_table.c.id == run_id)).mappings().first()
    return dict(row) if row else None


def has_running_attempt_for_week(pipeline_name: str, requested_week_start: date) -> bool:
    """True if a `running` row already exists for this exact
    (pipeline_name, requested_week_start) — docs/PIPELINE_DESIGN.md section
    8/11: two concurrent runs for the SAME week are rejected (a 409 at the
    API layer), because two concurrent extractions could read
    `telemetry_events` at different instants and disagree on a late-arriving
    event for an otherwise-identical scope. A concurrent run for a
    *different* week is explicitly allowed (not checked here) — `UNIQUE
    (location_id, week_start)` partitions the destination table by week, so
    there is no shared row between them to race on.
    """
    with Session(engine) as db:
        row = (
            db.execute(
                select(pipeline_runs_table.c.id)
                .where(pipeline_runs_table.c.pipeline_name == pipeline_name)
                .where(pipeline_runs_table.c.requested_week_start == requested_week_start)
                .where(pipeline_runs_table.c.status == "running")
                .limit(1)
            )
            .mappings()
            .first()
        )
    return row is not None


def get_latest_attempt(pipeline_name: str) -> dict[str, Any] | None:
    """The most recent attempt regardless of status — may be 'running' or
    'failed' (docs/PIPELINE_DESIGN.md section 9's "último intento").
    """
    with Session(engine) as db:
        row = (
            db.execute(
                select(pipeline_runs_table)
                .where(pipeline_runs_table.c.pipeline_name == pipeline_name)
                .order_by(pipeline_runs_table.c.started_at.desc())
                .limit(1)
            )
            .mappings()
            .first()
        )
    return dict(row) if row else None


def get_latest_succeeded(pipeline_name: str) -> dict[str, Any] | None:
    """The most recent *successful* attempt (section 9's "última carga
    exitosa") — what defines data freshness for a consumer of the KPIs.
    """
    with Session(engine) as db:
        row = (
            db.execute(
                select(pipeline_runs_table)
                .where(pipeline_runs_table.c.pipeline_name == pipeline_name)
                .where(pipeline_runs_table.c.status == "succeeded")
                .order_by(pipeline_runs_table.c.started_at.desc())
                .limit(1)
            )
            .mappings()
            .first()
        )
    return dict(row) if row else None
