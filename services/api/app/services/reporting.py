"""Reporting service — Fase 5, docs/PIPELINE_DESIGN.md section 11.

Thin bridge between app.routers.reporting and the pipeline's own code in
data/pipelines/weekly-location-performance/ — this module imports that
pipeline's flow, run log, and table definitions; it never redefines or
duplicates their logic, per this phase's explicit "no dupliques la lógica
del pipeline dentro de services/" requirement. The same reasoning
app.services.telemetry_analysis already follows for
app.models.telemetry_storage (a thin layer over the real I/O/logic
module), just crossing a top-level directory boundary (services/api ->
data/pipelines) instead of a module boundary within services/api.

Deliberately separate from services/telemetry/ (in this repo:
app/routers/telemetry.py + app/services/telemetry_analysis.py) per
docs/company-briefing.md section 7 — nothing here imports or calls into
either of those.
"""

from __future__ import annotations

import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlmodel import Session

from app.core.database import engine

# data/pipelines/weekly-location-performance is a sibling of services/api
# at the repo root, not a package under services/api — this is the actual
# cross-directory import the task requires ("Importa los flows o las
# funciones necesarias desde data/pipelines/"). Its folder name is
# kebab-case (data/pipelines/README.md's own convention: "sales-etl",
# "customer-segmentation"), so it can't be a dotted Python package either
# — same sys.path-by-directory technique as that pipeline's own
# _pathsetup.py, applied here from the services/api side.
_PIPELINE_DIR = Path(__file__).resolve().parents[4] / "data" / "pipelines" / "weekly-location-performance"
if str(_PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_DIR))

import run_log  # noqa: E402
from flow import (  # noqa: E402
    PIPELINE_NAME,
    PIPELINE_VERSION,
    most_recently_closed_iso_week,
    weekly_location_performance_flow,
)
from schema import weekly_location_performance_table  # noqa: E402


def resolve_week_start(week_start: date | None) -> date:
    """Same default-period convention as the flow itself
    (data/pipelines/weekly-location-performance/flow.py) — the most
    recently closed ISO week (UTC) when `week_start` is omitted.
    """
    return week_start or most_recently_closed_iso_week(datetime.now(timezone.utc).date())


def get_run(run_id: UUID) -> dict[str, Any] | None:
    return run_log.get_run(run_id)


def get_latest_attempt(pipeline_name: str = PIPELINE_NAME) -> dict[str, Any] | None:
    return run_log.get_latest_attempt(pipeline_name)


def get_latest_succeeded(pipeline_name: str = PIPELINE_NAME) -> dict[str, Any] | None:
    return run_log.get_latest_succeeded(pipeline_name)


def has_running_attempt_for_week(week_start: date, pipeline_name: str = PIPELINE_NAME) -> bool:
    return run_log.has_running_attempt_for_week(pipeline_name, week_start)


def start_manual_run(week_start: date, triggered_by: str) -> UUID:
    """Create the `running` reporting.pipeline_runs row synchronously, so
    the caller (POST /reporting/pipeline-runs) can return its id
    immediately — actual execution is handed off separately (see
    `run_pipeline_in_background`), never run inline here.
    """
    return run_log.start_pipeline_run(
        pipeline_name=PIPELINE_NAME,
        pipeline_version=PIPELINE_VERSION,
        requested_week_start=week_start,
        triggered_by=triggered_by,
    )


def run_pipeline_in_background(week_start: date, run_id: UUID, triggered_by: str) -> None:
    """Runs the existing flow for an already-created run_id — intended as
    a FastAPI `BackgroundTasks` callback (see app/routers/reporting.py),
    executed after the HTTP response is already sent, so the manual-
    trigger endpoint never blocks on the pipeline's own runtime.

    This calls `weekly_location_performance_flow` directly rather than via
    a Prefect *deployment run* (docs/PIPELINE_DESIGN.md section 11's
    original proposal) — that proposal assumed a deployment/worker is
    always registered and reachable, which isn't guaranteed for every
    environment this API runs in (e.g. a plain `uvicorn` dev process with
    no self-hosted Prefect server up). Calling the flow function directly
    is "the mechanism compatible with the current architecture" this
    phase asks for: it is exactly how `data/pipelines/pipeline.py` and
    the self-hosted `serve.py` deployment both already invoke it — same
    function, same retries/caching/idempotency, same
    reporting.pipeline_runs bookkeeping. If PREFECT_API_URL happens to
    point at a running self-hosted server when this executes, the run is
    also visible there; if not, Prefect falls back to its own ephemeral
    orchestration for this one call, same as any other direct invocation.
    """
    weekly_location_performance_flow(week_start=week_start, triggered_by=triggered_by, run_id=run_id)


def get_default_kpi_week_start() -> date | None:
    """Default `week_start` for GET /reporting/weekly-location-performance
    when omitted: the week of the most recent SUCCEEDED run
    (docs/company-briefing.md section 6: "por defecto, la semana calculada
    más reciente") — never "today", since the destination table is keyed
    by week_start, not by freshness of the calendar. None if the pipeline
    has never succeeded.
    """
    latest_succeeded = run_log.get_latest_succeeded(PIPELINE_NAME)
    if latest_succeeded is None:
        return None
    return latest_succeeded["requested_week_start"]


def get_weekly_location_performance(
    week_start: date,
    location_id: str | None = None,
    country: str | None = None,
) -> list[dict[str, Any]]:
    """Read-only query against reporting.weekly_location_performance —
    never recomputes the ETL (docs/PIPELINE_DESIGN.md section 11's
    explicit requirement for this endpoint).
    """
    statement = select(weekly_location_performance_table).where(
        weekly_location_performance_table.c.week_start == week_start
    )
    if location_id is not None:
        statement = statement.where(weekly_location_performance_table.c.location_id == location_id)
    if country is not None:
        statement = statement.where(weekly_location_performance_table.c.country == country)
    statement = statement.order_by(weekly_location_performance_table.c.location_id)

    with Session(engine) as db:
        rows = db.execute(statement).mappings().all()
    return [dict(row) for row in rows]
