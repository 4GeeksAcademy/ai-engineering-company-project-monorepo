"""weekly_location_performance_flow — docs/PIPELINE_DESIGN.md section 10.

Orchestrates extract -> transform -> load for one ISO week and writes one
row to `reporting.pipeline_runs` tracking the whole attempt (sections 9-10).
The three mandatory stages run in sequence, each invoked with
`return_state=True` so a failure can be logged (stage + error) *before*
re-raising — keeping the execution log and Prefect's own flow-run state
consistent with each other, never hiding a mandatory failure.

A fourth, explicitly optional and non-critical step (a JSON evaluation
snapshot — see notify.py) runs after load succeeds, also via
`return_state=True`, but its failure is only ever recorded
(`optional_step_error`) — never allowed to fail the flow or overwrite the
main pipeline's `succeeded` result.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from prefect import flow
from prefect.runtime import flow_run

import _pathsetup  # noqa: F401

import extract
import load
import notify
import run_log
import transform

PIPELINE_NAME = "weekly_location_performance"
# Kept equal to transform.TRANSFORM_VERSION and persisted per run, so a
# historical reporting.pipeline_runs row can always be traced back to the
# aggregation logic version that produced it (docs/PIPELINE_DESIGN.md
# section 9's `pipeline_version` field).
PIPELINE_VERSION = transform.TRANSFORM_VERSION


def most_recently_closed_iso_week(today: date) -> date:
    """Monday of the most recently fully-closed ISO week (UTC) —
    docs/PIPELINE_DESIGN.md section 10's default-period convention, same
    pattern as GET /telemetry/report's default window resolution.
    """
    this_week_monday = today - timedelta(days=today.weekday())
    return this_week_monday - timedelta(days=7)


@flow(name="weekly_location_performance_flow")
def weekly_location_performance_flow(
    week_start: date | None = None,
    triggered_by: str = "manual",
    run_id: str | UUID | None = None,
) -> dict:
    """Run the full ETL for one ISO week; return the run's outcome.

    `week_start` defaults to the most recently closed ISO week (UTC) when
    omitted. A mandatory-stage failure (extract/transform/load exhausting
    its retries) logs the failure to `reporting.pipeline_runs` and then
    re-raises, so this flow's own Prefect run also ends up `Failed` — never
    swallowed. An optional-step failure never does either of those things.

    `run_id`: pass an existing `reporting.pipeline_runs` id (already
    created `running`) when a caller needs that id *before* this flow
    finishes — e.g. `POST /reporting/pipeline-runs` (services/api/app/routers/
    reporting.py) creates the row synchronously so it can return the id
    immediately, then hands it to this flow instead of letting the flow
    create its own. Omit it (the CLI/scheduled-cron path, `pipeline.py`/
    `serve.py`) to let the flow create its own row, as before.
    """
    resolved_week_start = week_start or most_recently_closed_iso_week(datetime.now(timezone.utc).date())

    if isinstance(run_id, str):
        run_id = UUID(run_id)
    if run_id is None:
        run_id = run_log.start_pipeline_run(
            pipeline_name=PIPELINE_NAME,
            pipeline_version=PIPELINE_VERSION,
            requested_week_start=resolved_week_start,
            triggered_by=triggered_by,
            prefect_flow_run_id=flow_run.id,
        )
    else:
        # A pre-existing run_id (the POST /reporting/pipeline-runs path)
        # already has its row — still record *this* Prefect flow run's id
        # on it, so reporting.pipeline_runs.prefect_flow_run_id keeps
        # working as a cross-reference into the Prefect UI/logs (section
        # 9) regardless of which path created the row.
        run_log.set_prefect_flow_run_id(run_id, flow_run.id)

    extract_state = extract.extract_weekly_telemetry_events(resolved_week_start, return_state=True)
    if extract_state.is_failed():
        exc = extract_state.result(raise_on_failure=False)
        run_log.finish_pipeline_run(
            run_id,
            status="failed",
            failed_stage="extract",
            error_summary=f"extract_weekly_telemetry_events failed after retries: {exc}",
        )
        raise RuntimeError(f"extract_weekly_telemetry_events failed: {exc}") from exc
    extract_result = extract_state.result()

    transform_state = transform.transform_weekly_location_performance(
        extract_result.raw_events, resolved_week_start, return_state=True
    )
    if transform_state.is_failed():
        exc = transform_state.result(raise_on_failure=False)
        run_log.finish_pipeline_run(
            run_id,
            status="failed",
            failed_stage="transform",
            error_summary=f"transform_weekly_location_performance failed after retries: {exc}",
            records_read=extract_result.records_read,
        )
        raise RuntimeError(f"transform_weekly_location_performance failed: {exc}") from exc
    transform_result = transform_state.result()

    load_state = load.load_weekly_location_performance(transform_result.aggregated, return_state=True)
    if load_state.is_failed():
        exc = load_state.result(raise_on_failure=False)
        run_log.finish_pipeline_run(
            run_id,
            status="failed",
            failed_stage="load",
            error_summary=f"load_weekly_location_performance failed after retries: {exc}",
            records_read=extract_result.records_read,
            records_rejected=transform_result.records_rejected,
            records_transformed=transform_result.records_transformed,
        )
        raise RuntimeError(f"load_weekly_location_performance failed: {exc}") from exc
    load_result = load_state.result()

    # ── Optional, non-critical step ──────────────────────────────────────
    # Explicitly outside extract -> transform -> load. return_state=True
    # here is what makes its failure inspectable without ever propagating:
    # there is no `if snapshot_state.is_failed(): raise ...` branch, unlike
    # every mandatory stage above.
    optional_step_error: str | None = None
    snapshot_state = notify.write_weekly_evaluation_snapshot(
        transform_result.aggregated, resolved_week_start, return_state=True
    )
    if snapshot_state.is_failed():
        exc = snapshot_state.result(raise_on_failure=False)
        optional_step_error = f"write_weekly_evaluation_snapshot failed: {exc}"

    run_log.finish_pipeline_run(
        run_id,
        status="succeeded",
        records_read=extract_result.records_read,
        records_rejected=transform_result.records_rejected,
        records_transformed=transform_result.records_transformed,
        records_loaded=load_result.records_loaded,
        optional_step_error=optional_step_error,
    )

    return {
        "run_id": str(run_id),
        "status": "succeeded",
        "week_start": resolved_week_start.isoformat(),
        "records_read": extract_result.records_read,
        "records_rejected": transform_result.records_rejected,
        "records_transformed": transform_result.records_transformed,
        "records_loaded": load_result.records_loaded,
        "optional_step_error": optional_step_error,
    }


if __name__ == "__main__":
    import sys

    cli_week_start = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else None
    result = weekly_location_performance_flow(week_start=cli_week_start, triggered_by="manual:cli")
    print(result)
