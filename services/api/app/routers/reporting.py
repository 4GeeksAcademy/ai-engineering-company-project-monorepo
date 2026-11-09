"""Reporting router — Fase 5 (docs/PIPELINE_DESIGN.md section 11).

Three endpoints over the weekly-location-performance pipeline
(data/pipelines/weekly-location-performance/):

GET  /reporting/pipeline-runs/latest           status + metadata of the last run(s)
POST /reporting/pipeline-runs                  trigger a manual run
GET  /reporting/weekly-location-performance    the KPI rows (docs/company-briefing.md section 6)

Deliberately a separate module from app/routers/telemetry.py (this repo's
equivalent of "services/telemetry/" per docs/company-briefing.md section
7) — nothing here imports or calls into telemetry.py or
app/services/telemetry_analysis.py. All three routes read/write
exclusively through app.services.reporting, which itself imports the
pipeline's flow/run-log/table definitions from
data/pipelines/weekly-location-performance/ — no ETL or run-log logic is
duplicated in this module.

Same conventions as the rest of this API: `require_staff` gate (same as
GET /incidents/metrics and GET /telemetry/report — this is operational
data for staff, not a public endpoint), `HTTPException` for error
responses, Pydantic response models from app.models.schemas.
"""

from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from app.core.deps import require_staff
from app.models.schemas import (
    LatestPipelineRunsResponse,
    PipelineRunResponse,
    TriggerPipelineRunRequest,
    TriggerPipelineRunResponse,
    WeeklyLocationPerformanceResponse,
)
from app.services import reporting as reporting_service

router = APIRouter(prefix="/reporting", tags=["reporting"])


def _to_pipeline_run_response(row: dict) -> PipelineRunResponse:
    return PipelineRunResponse(
        id=str(row["id"]),
        prefect_flow_run_id=str(row["prefect_flow_run_id"]) if row["prefect_flow_run_id"] else None,
        pipeline_name=row["pipeline_name"],
        pipeline_version=row["pipeline_version"],
        requested_week_start=row["requested_week_start"],
        scope=row["scope"] or {},
        status=row["status"],
        started_at=row["started_at"],
        finished_at=row["finished_at"],
        records_read=row["records_read"],
        records_rejected=row["records_rejected"],
        records_transformed=row["records_transformed"],
        records_loaded=row["records_loaded"],
        failed_stage=row["failed_stage"],
        error_summary=row["error_summary"],
        optional_step_error=row["optional_step_error"],
        triggered_by=row["triggered_by"],
    )


# ── GET /reporting/pipeline-runs/latest ────────────────────────────────
@router.get("/pipeline-runs/latest")
async def get_latest_pipeline_run(
    pipeline_name: str = Query(default=reporting_service.PIPELINE_NAME),
    run_id: UUID | None = Query(
        default=None,
        description=(
            "Poll one specific run by its reporting.pipeline_runs id "
            "(e.g. the run_id returned by POST /reporting/pipeline-runs) "
            "instead of the most recent one."
        ),
    ),
    current_user: dict = Depends(require_staff),
) -> dict:
    """Status + metadata of the last pipeline run, or one specific run.

    Without `run_id`: returns both "último intento" (any status) and
    "última carga exitosa" (docs/PIPELINE_DESIGN.md section 9) so a caller
    can tell "the last attempt failed 10 minutes ago, but the last
    successful load was 6 days ago" without a second call. 404 if this
    `pipeline_name` has never run at all.

    With `run_id`: returns that one run directly. 404 if no run exists
    with that id.
    """
    if run_id is not None:
        row = reporting_service.get_run(run_id)
        if row is None:
            raise HTTPException(status_code=404, detail=f"No pipeline run found with id '{run_id}'.")
        return _to_pipeline_run_response(row).model_dump(mode="json")

    latest_attempt = reporting_service.get_latest_attempt(pipeline_name)
    if latest_attempt is None:
        raise HTTPException(
            status_code=404,
            detail=f"Pipeline '{pipeline_name}' has never run.",
        )
    latest_succeeded = reporting_service.get_latest_succeeded(pipeline_name)

    return LatestPipelineRunsResponse(
        latest_attempt=_to_pipeline_run_response(latest_attempt),
        latest_succeeded=_to_pipeline_run_response(latest_succeeded) if latest_succeeded else None,
    ).model_dump(mode="json")


# ── POST /reporting/pipeline-runs ──────────────────────────────────────
@router.post("/pipeline-runs", response_model=TriggerPipelineRunResponse, status_code=202)
async def trigger_pipeline_run(
    background_tasks: BackgroundTasks,
    payload: TriggerPipelineRunRequest | None = None,
    current_user: dict = Depends(require_staff),
) -> TriggerPipelineRunResponse:
    """Trigger a manual run of weekly_location_performance_flow.

    Body is optional; `week_start` defaults to the most recently closed
    ISO week (UTC) when omitted (same resolution as the flow's own
    default, docs/PIPELINE_DESIGN.md section 10).

    The `running` reporting.pipeline_runs row is created synchronously,
    before this returns, so its `run_id` can be handed back immediately;
    the pipeline itself then runs in a FastAPI background task (see
    app.services.reporting.run_pipeline_in_background's docstring for why
    that — not a Prefect deployment run — is the mechanism compatible with
    this architecture). Poll
    `GET /reporting/pipeline-runs/latest?run_id=<run_id>` for completion.

    409 if a run for this exact week is already `running`
    (docs/PIPELINE_DESIGN.md section 8: two concurrent extractions for the
    same week could disagree on a late-arriving event; a different week
    running concurrently is fine and not rejected here).
    """
    week_start = reporting_service.resolve_week_start(payload.week_start if payload else None)

    if reporting_service.has_running_attempt_for_week(week_start):
        raise HTTPException(
            status_code=409,
            detail=(
                f"A run for week_start={week_start.isoformat()} is already in progress. "
                "Poll GET /reporting/pipeline-runs/latest?run_id=<run_id> for its status."
            ),
        )

    triggered_by = f"manual:{current_user['id']}"
    run_id = reporting_service.start_manual_run(week_start, triggered_by)
    background_tasks.add_task(reporting_service.run_pipeline_in_background, week_start, run_id, triggered_by)

    return TriggerPipelineRunResponse(run_id=str(run_id), status="running", week_start=week_start)


# ── GET /reporting/weekly-location-performance ─────────────────────────
@router.get("/weekly-location-performance", response_model=WeeklyLocationPerformanceResponse)
async def get_weekly_location_performance_route(
    week_start: date | None = Query(default=None, description="ISO date (Monday). Defaults to the most recent successful run's week."),
    location_id: str | None = Query(default=None, description="Filter to one location, e.g. CO-MEDELLIN."),
    country: str | None = Query(default=None, description="Filter to one country (CO or US)."),
    current_user: dict = Depends(require_staff),
) -> WeeklyLocationPerformanceResponse:
    """The KPI rows the Part 3 dashboard consumes — exact response shape
    of docs/company-briefing.md section 6. Never re-runs the ETL: reads
    only already-persisted rows from reporting.weekly_location_performance
    (docs/PIPELINE_DESIGN.md section 11's explicit requirement for this
    endpoint).

    404 if `week_start` is omitted and the pipeline has never run
    successfully, or if no row exists for the resolved week (optionally
    narrowed further by `location_id`/`country`).
    """
    resolved_week_start = week_start or reporting_service.get_default_kpi_week_start()
    if resolved_week_start is None:
        raise HTTPException(
            status_code=404,
            detail="The weekly-location-performance pipeline has never completed a successful run.",
        )

    rows = reporting_service.get_weekly_location_performance(resolved_week_start, location_id, country)
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No weekly-location-performance data found for week_start={resolved_week_start.isoformat()}.",
        )

    return WeeklyLocationPerformanceResponse(
        week_start=resolved_week_start,
        locations=[
            {
                "location_id": row["location_id"],
                "country": row["country"],
                "total_purchase_cost": float(row["total_purchase_cost"]),
                "total_waste_cost": float(row["total_waste_cost"]),
                "waste_ratio": float(row["waste_ratio"]),
                "stockout_events_count": row["stockout_events_count"],
                "price_alert_events_count": row["price_alert_events_count"],
                "currency": row["currency"],
            }
            for row in rows
        ],
    )
