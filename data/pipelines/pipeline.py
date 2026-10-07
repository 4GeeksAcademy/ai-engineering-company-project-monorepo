"""Brasaland weekly location cost & waste pipeline (Part 2).

Main entry: ``data/pipelines/pipeline.py`` (this file).
Contracts: root ``CONTEXT-company.md`` (KPIs / schema / endpoints) and
``data/pipelines/PIPELINE_DESIGN.md``.

Prefect ``name=`` contract (PIPELINE_DESIGN.md Phase 4 / Phase one subflows):
- Flow: ``brasaland_weekly_performance_pipeline``
- Stage subflows (explicit I/O, no shared globals):
  ``extract_brasaland_data_flow``, ``transform_brasaland_kpis_flow``,
  ``load_brasaland_reporting_flow``
- Optional subflow: ``eval_brasaland_snapshot_flow`` (``return_state=True``)
- Tasks: ``extract_telemetry_events``, ``extract_domain_data``,
  ``aggregate_location_kpis``, ``upsert_to_reporting_table`` (+ landing / eval)

Destination: ``reporting.weekly_location_performance`` on
``(location_id, week_start)``. Run log: ``reporting.pipeline_runs``.
KPI event types: ``inbound_order_created``, ``stock_waste_registered``,
``stock_threshold_triggered``, ``ingredient_price_variance_detected``.

Placement:
- ``data/raw/`` — extract snapshots and intermediate KPI frames
- ``data/process/location_kpis.py`` — reusable transform
- ``data/eval/`` — fixtures and validation outputs

Does not write ``telemetry_events`` and does not touch engineering telemetry analysis.
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional, Tuple

# Allow ``python data/pipelines/pipeline.py`` from the monorepo root without
# requiring the caller to set PYTHONPATH.
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import pandas as pd
from dotenv import load_dotenv
from prefect import flow, task
from prefect.states import State
from prefect.tasks import task_input_hash
from supabase import Client, create_client

from data.process.location_kpis import KPI_EVENT_TYPES, aggregate_location_kpis as _aggregate_kpis
from services.safe_errors import ExternalServiceError, call_external, public_error_text

env_path = _REPO_ROOT / ".env"
load_dotenv(dotenv_path=env_path)

_LAST_RUN_PATH = Path(__file__).resolve().parent / "last_run.json"
_RUN_LOG_PATH = Path(__file__).resolve().parent / "pipeline_run_log.jsonl"
_RAW_DIR = _REPO_ROOT / "data" / "raw"
_EVAL_DIR = _REPO_ROOT / "data" / "eval"
_EVAL_FIXTURES = _EVAL_DIR / "weekly_location_performance_fixtures.json"
_EVAL_OUTPUT = _EVAL_DIR / "last_validation.json"

_REPORTING_SCHEMA = "reporting"
_PERFORMANCE_TABLE = "weekly_location_performance"
_RUNS_TABLE = "pipeline_runs"

# CONTEXT-company.md unique constraint / upsert conflict target.
_UPSERT_CONFLICT = "location_id,week_start"
_KPI_LOAD_COLUMNS = (
    "location_id",
    "week_start",
    "total_purchase_cost",
    "total_waste_cost",
    "waste_ratio",
    "stockout_events_count",
    "price_alert_events_count",
    "country",
    "currency",
)


def _supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Missing SUPABASE_URL or SUPABASE_KEY. Set them in .env before running the weekly pipeline."
        )
    try:
        return create_client(url, key)
    except ExternalServiceError:
        raise
    except Exception as error:
        raise ExternalServiceError("reporting store") from error


def _supabase_configured() -> bool:
    return bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_KEY"))


def _reporting(client: Client):
    return client.schema(_REPORTING_SCHEMA)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_window_token(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in value)[:64]


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, default=str)


def _dataframe_records(df: pd.DataFrame) -> list:
    if df is None or df.empty:
        return []
    return json.loads(df.to_json(orient="records", date_format="iso"))


def _write_last_run(metadata: dict) -> None:
    with open(_LAST_RUN_PATH, "w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2, default=str)


def _append_run_log(metadata: dict) -> None:
    """Append-only local control log (one JSON object per line).

    Always written even when ``reporting.pipeline_runs`` is unreachable so every
    attempt still records start/end, records_processed, status, and errors.
    """
    _RUN_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_RUN_LOG_PATH, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(metadata, default=str) + "\n")


def _execution_metadata(row: dict) -> dict:
    """Minimum execution metadata required by Phase 3 (CONTEXT + design)."""
    return {
        "run_id": row.get("run_id"),
        "started_at": row.get("started_at"),  # start time
        "finished_at": row.get("finished_at"),  # end time
        "window_start": row.get("window_start"),
        "window_end": row.get("window_end"),
        "records_processed": row.get("records_processed"),
        "status": row.get("status"),  # final status (or Running mid-flight)
        "error_message": row.get("error_message"),  # captured errors
        # Compat aliases for older status consumers
        "start_date": row.get("window_start"),
        "end_date": row.get("window_end"),
    }


def _mirror_run(row: dict) -> None:
    """Mirror the latest pipeline_runs row for GET /reporting/pipeline-runs/latest."""
    payload = _execution_metadata(row)
    if payload.get("error_message"):
        payload["error"] = payload["error_message"]
    _write_last_run(payload)
    _append_run_log(payload)


def normalize_kpi_records(kpis_df: pd.DataFrame) -> list[dict]:
    """Project the KPI frame onto the CONTEXT destination columns only.

    Used by the idempotent load so a second run sends the same key + values
    (never a delta) for ``ON CONFLICT (location_id, week_start) DO UPDATE``.
    """
    if kpis_df is None or getattr(kpis_df, "empty", True):
        return []
    frame = kpis_df.copy()
    for column in _KPI_LOAD_COLUMNS:
        if column not in frame.columns:
            if column in ("total_purchase_cost", "total_waste_cost", "waste_ratio"):
                frame[column] = 0.0
            elif column in ("stockout_events_count", "price_alert_events_count"):
                frame[column] = 0
            elif column == "country":
                frame[column] = "Unknown"
            elif column == "currency":
                frame[column] = "USD"
            else:
                frame[column] = None
    records = frame.loc[:, list(_KPI_LOAD_COLUMNS)].to_dict(orient="records")
    # Stable order by PK so two identical runs produce byte-stable payloads.
    records.sort(key=lambda row: (str(row.get("location_id")), str(row.get("week_start"))))
    return records


def _insert_run_start(run_id: str, window_start: str, window_end: str) -> dict:
    started_at = _utc_now_iso()
    row = {
        "run_id": run_id,
        "started_at": started_at,
        "finished_at": None,
        "window_start": window_start,
        "window_end": window_end,
        "records_processed": 0,
        "status": "Running",
        "error_message": None,
    }
    if _supabase_configured():
        try:
            call_external(
                "reporting store",
                lambda: _reporting(_supabase_client())
                .table(_RUNS_TABLE)
                .insert(row)
                .execute(),
            )
        except ExternalServiceError:
            pass
    _mirror_run(row)
    return row


def _finish_run(row: dict, *, status: str, records_processed: int, error_message: Optional[str]) -> dict:
    finished = {
        **row,
        "finished_at": _utc_now_iso(),
        "status": status,
        "records_processed": records_processed,
        "error_message": error_message,
    }
    if _supabase_configured():
        try:
            call_external(
                "reporting store",
                lambda: _reporting(_supabase_client())
                .table(_RUNS_TABLE)
                .update(
                    {
                        "finished_at": finished["finished_at"],
                        "status": status,
                        "records_processed": records_processed,
                        "error_message": error_message,
                    }
                )
                .eq("run_id", row["run_id"])
                .execute(),
            )
        except ExternalServiceError:
            pass
    _mirror_run(finished)
    return finished


def _land_raw_extracts(
    telemetry_df: pd.DataFrame,
    locations_df: pd.DataFrame,
    start_date: str,
    end_date: str,
) -> dict[str, str]:
    """Persist extract snapshots under data/raw/ for audit / reprocessing."""
    token = f"{_safe_window_token(start_date)}_{_safe_window_token(end_date)}"
    telemetry_path = _RAW_DIR / f"telemetry_events_{token}.json"
    locations_path = _RAW_DIR / f"locations_{token}.json"
    _write_json(
        telemetry_path,
        {
            "window_start": start_date,
            "window_end": end_date,
            "event_types": list(KPI_EVENT_TYPES),
            "rows": _dataframe_records(telemetry_df),
        },
    )
    _write_json(
        locations_path,
        {"rows": _dataframe_records(locations_df)},
    )
    return {
        "telemetry_events": str(telemetry_path),
        "locations": str(locations_path),
    }


def _land_kpi_intermediate(kpis_df: pd.DataFrame, week_start: str) -> str:
    path = _RAW_DIR / f"weekly_location_performance_{_safe_window_token(week_start)}.json"
    _write_json(
        path,
        {
            "week_start": week_start,
            "destination_table": f"{_REPORTING_SCHEMA}.{_PERFORMANCE_TABLE}",
            "rows": _dataframe_records(kpis_df),
        },
    )
    return str(path)


def write_validation_output(kpis_df: pd.DataFrame, week_start: str) -> dict[str, Any]:
    """Compare a KPI frame to data/eval fixtures when week_start matches; always land output."""
    checks: list[dict[str, Any]] = []
    passed = True
    if _EVAL_FIXTURES.exists():
        fixtures = json.loads(_EVAL_FIXTURES.read_text(encoding="utf-8"))
        if fixtures.get("week_start") == week_start and kpis_df is not None and not kpis_df.empty:
            for loc in fixtures.get("locations", []):
                location_id = loc["location_id"]
                expected = loc["expected"]
                match = kpis_df[kpis_df["location_id"] == location_id]
                if match.empty:
                    checks.append(
                        {
                            "location_id": location_id,
                            "ok": False,
                            "reason": "missing_location_row",
                        }
                    )
                    passed = False
                    continue
                row = match.iloc[0]
                location_ok = True
                diffs = {}
                for key, want in expected.items():
                    got = row.get(key)
                    if got != want:
                        location_ok = False
                        diffs[key] = {"expected": want, "actual": got}
                checks.append(
                    {
                        "location_id": location_id,
                        "ok": location_ok,
                        "diffs": diffs,
                    }
                )
                passed = passed and location_ok
        else:
            checks.append(
                {
                    "ok": True,
                    "note": "fixture week_start does not match this run; skipped fixture asserts",
                }
            )
    else:
        checks.append({"ok": True, "note": "no fixtures file present"})

    report = {
        "validated_at": _utc_now_iso(),
        "week_start": week_start,
        "passed": passed,
        "row_count": 0 if kpis_df is None or kpis_df.empty else int(len(kpis_df)),
        "checks": checks,
        "kpis": _dataframe_records(kpis_df) if kpis_df is not None else [],
    }
    _write_json(_EVAL_OUTPUT, report)
    return report


# ---------------------------------------------------------------------------
# Store backends (swappable for offline CLI — Phase 4)
# ---------------------------------------------------------------------------
#
# Tasks call these module-level functions. The Monday 07:00 live job keeps the
# Supabase implementations below. ``_install_offline_backends`` rebinds them to
# eval-fixture / local-store callables so ``python data/pipelines/pipeline.py``
# can run the full Prefect flow without SUPABASE_* credentials.


def fetch_telemetry_events(start_date: str, end_date: str) -> pd.DataFrame:
    """Read-only extract of KPI telemetry_events for [start_date, end_date)."""
    response = call_external(
        "reporting store",
        lambda: _supabase_client()
        .table("telemetry_events")
        .select("id,event_type,created_at,event_payload")
        .in_("event_type", list(KPI_EVENT_TYPES))
        .gte("created_at", start_date)
        .lt("created_at", end_date)
        .execute(),
    )
    return pd.DataFrame(response.data or [])


def fetch_domain_locations() -> pd.DataFrame:
    """Read-only extract of the locations dimension (id, country, currency)."""
    response = call_external(
        "reporting store",
        lambda: _supabase_client()
        .table("locations")
        .select("id, country, currency")
        .execute(),
    )
    return pd.DataFrame(response.data or [])


def persist_kpi_records(records: list[dict]) -> int:
    """Idempotent upsert into reporting.weekly_location_performance."""
    if not records:
        return 0
    call_external(
        "reporting store",
        lambda: _reporting(_supabase_client())
        .table(_PERFORMANCE_TABLE)
        .upsert(records, on_conflict=_UPSERT_CONFLICT)
        .execute(),
    )
    return len(records)


# ---------------------------------------------------------------------------
# Stage 1 — Extraction tasks (explicit I/O) + subflow
# ---------------------------------------------------------------------------


# Retries=3, delay=5s: covers transient Supabase/PostgREST blips (timeouts, 502/503)
# without stretching the Monday 07:00 window. Three attempts ≈ 15s of backoff headroom
# before the stage fails; more retries mostly delay a true outage signal.
@task(retries=3, retry_delay_seconds=5, name="extract_telemetry_events")
def extract_telemetry_events(start_date: str, end_date: str):
    """Input: chain-week bounds. Output: telemetry_events rows (four KPI types)."""
    return fetch_telemetry_events(start_date, end_date)


# Retries=3, delay=5s: same store as telemetry; locations is 14 small rows, so three
# short retries are enough for a dropped connection without masking a missing table.
@task(retries=3, retry_delay_seconds=5, name="extract_domain_data")
def extract_domain_data():
    """Input: none. Output: locations dimension (id, country, currency)."""
    return fetch_domain_locations()


@task(name="land_raw_extracts")
def land_raw_extracts(telemetry_df, locations_df, start_date: str, end_date: str):
    """Input: extract frames + window. Output: paths under data/raw/ (local FS only)."""
    paths = _land_raw_extracts(telemetry_df, locations_df, start_date, end_date)
    print(f"Landed extract snapshots: {paths}")
    return paths


@flow(name="extract_brasaland_data_flow", log_prints=True)
def extract_brasaland_data_flow(
    start_date: str, end_date: str
) -> Tuple[Any, Any]:
    """Extraction stage: read-only snapshots for the chain week.

    Inputs: chain-week bounds (``start_date``, ``end_date``).
    Outputs: ``(telemetry_df, locations_df)`` passed explicitly to transform —
    no module-level / global state between subflows.
    """
    # Telemetry is required — let failures propagate after task retries.
    telemetry_df = extract_telemetry_events(start_date, end_date)

    # Domain dimension is useful but not fatal: handle failure explicitly with
    # return_state=True so a locations outage does not abort the week extract.
    # Transform falls back to country=Unknown / currency=USD for unmatched ids.
    locations_state = extract_domain_data(return_state=True)
    if locations_state.is_failed():
        print(
            "extract_domain_data failed after retries; "
            "continuing with an empty locations frame (dimension fallbacks apply)."
        )
        locations_df = pd.DataFrame(columns=["id", "country", "currency"])
    else:
        locations_df = locations_state.result()

    land_raw_extracts(telemetry_df, locations_df, start_date, end_date)
    return telemetry_df, locations_df


# ---------------------------------------------------------------------------
# Stage 2 — Transformation tasks + subflow
# ---------------------------------------------------------------------------


@task(
    # Cache key: task_input_hash over (telemetry_df, locations_df, week_start) —
    # same week + same extract inputs reuse the KPI frame without re-aggregating.
    # Expiration: 1 day — covers re-runs / audits on Monday after the 07:00 job
    # without serving stale KPIs into the next chain week.
    cache_key_fn=task_input_hash,
    cache_expiration=timedelta(days=1),
    name="aggregate_location_kpis",
)
def aggregate_location_kpis(telemetry_df, locations_df, week_start: str):
    """Input: extract frames + week_start. Output: one KPI row per location.

    Expensive relative to I/O-light landings: pandas groupby + join over the
    full week snapshot. Cached so a same-day rerun with identical inputs skips work.
    """
    return _aggregate_kpis(telemetry_df, locations_df, week_start)


@task(name="land_kpi_intermediate")
def land_kpi_intermediate(kpis_df, week_start: str) -> str:
    """Input: KPI frame. Output: intermediate JSON path under data/raw/ (local FS)."""
    path = _land_kpi_intermediate(kpis_df, week_start)
    print(f"Landed KPI intermediate: {path}")
    return path


@flow(name="transform_brasaland_kpis_flow", log_prints=True)
def transform_brasaland_kpis_flow(telemetry_df, locations_df, week_start: str) -> Any:
    """Transformation stage: pure KPI rollup (no destination write).

    Inputs: extract frames + ``week_start``. Output: KPI frame for load.
    """
    kpis_df = aggregate_location_kpis(telemetry_df, locations_df, week_start)
    land_kpi_intermediate(kpis_df, week_start)
    return kpis_df


# ---------------------------------------------------------------------------
# Stage 3 — Load tasks + subflow
# ---------------------------------------------------------------------------


# Retries=3, delay=5s: upsert must survive a brief Supabase blip; the load is
# idempotent on (location_id, week_start), so repeating the same payload is safe.
# Three tries match extract — enough for transient API errors, not an indefinite loop.
@task(retries=3, retry_delay_seconds=5, name="upsert_to_reporting_table")
def upsert_to_reporting_table(kpis_df) -> int:
    """Idempotent load into reporting.weekly_location_performance (Phase 3).

    Strategy (CONTEXT-company.md + PIPELINE_DESIGN.md):
    - Recompute the full location-week frame upstream (no deltas).
    - Upsert on the unique constraint ``(location_id, week_start)``.
    - Conflict clause assigns EXCLUDED KPI totals (replace, never add).

    Two runs over the same window therefore leave identical destination rows.
    """
    records = normalize_kpi_records(kpis_df)
    if not records:
        print("No data to upsert.")
        return 0
    count = persist_kpi_records(records)
    print(
        f"Idempotent upsert of {count} rows "
        f"on_conflict={_UPSERT_CONFLICT} into "
        f"{_REPORTING_SCHEMA}.{_PERFORMANCE_TABLE}"
    )
    return count


@flow(name="load_brasaland_reporting_flow", log_prints=True)
def load_brasaland_reporting_flow(kpis_df) -> int:
    """Load stage: idempotent upsert into reporting.weekly_location_performance.

    Input: KPI frame from transform. Output: rows upserted.
    Upsert failures are inspected via ``return_state=True`` (not left to bubble
    as an unhandled task exception) so the flow can log a clear load failure.
    """
    load_state = upsert_to_reporting_table(kpis_df, return_state=True)
    if load_state.is_failed():
        print(
            "upsert_to_reporting_table failed after retries; "
            "handling explicitly in load_brasaland_reporting_flow."
        )
        raise RuntimeError("reporting store upsert failed after retries")
    return load_state.result()


# ---------------------------------------------------------------------------
# Optional non-critical subflow (eval snapshot) — never blocks ETL
# ---------------------------------------------------------------------------


@task(name="write_eval_snapshot", retries=0)
def write_eval_snapshot(kpis_df, week_start: str):
    """Optional secondary report task: fixture validation under data/eval/.

    Local FS only — no external-service retries. Called only from
    ``eval_brasaland_snapshot_flow`` so the main flow can treat eval as a
    subflow invoked with ``return_state=True``.
    """
    return write_validation_output(kpis_df, week_start)


@flow(name="eval_brasaland_snapshot_flow", log_prints=True)
def eval_brasaland_snapshot_flow(kpis_df, week_start: str) -> Any:
    """Optional validation subflow (Phase one): secondary report under data/eval/.

    Inputs: KPI frame + ``week_start``. Output: validation payload dict.
    The main flow must call this with ``return_state=True`` so a fixture miss
    never marks the Monday ETL Failed.
    """
    return write_eval_snapshot(kpis_df, week_start)


# ---------------------------------------------------------------------------
# HTTP helpers (used by services/reporting/ — no ETL in routes)
# ---------------------------------------------------------------------------


def _format_kpi_locations(rows: list[dict], week_start: Optional[str]) -> dict[str, Any]:
    """Project destination rows into the KPI query response shape."""
    if not rows:
        return {"week_start": week_start, "locations": []}
    actual_week_start = week_start or rows[0].get("week_start")
    locations = [row for row in rows if row.get("week_start") == actual_week_start]
    formatted = [
        {
            "location_id": loc.get("location_id"),
            "country": loc.get("country"),
            "currency": loc.get("currency"),
            "total_purchase_cost": loc.get("total_purchase_cost"),
            "total_waste_cost": loc.get("total_waste_cost"),
            "waste_ratio": loc.get("waste_ratio"),
            "stockout_events_count": loc.get("stockout_events_count"),
            "price_alert_events_count": loc.get("price_alert_events_count"),
        }
        for loc in locations
    ]
    return {"week_start": actual_week_start, "locations": formatted}


def _read_local_kpi_store(week_start: Optional[str] = None) -> dict[str, Any]:
    """Read offline upsert store under data/raw/ (same PK as CONTEXT destination)."""
    store_path = _RAW_DIR / "weekly_location_performance_store.json"
    rows: list[dict] = []
    if store_path.exists():
        try:
            payload = json.loads(store_path.read_text(encoding="utf-8"))
            rows = list(payload.get("rows") or [])
        except (OSError, json.JSONDecodeError, TypeError):
            rows = []
    if week_start:
        rows = [row for row in rows if str(row.get("week_start")) == week_start]
    else:
        # Newest week_start first when no filter is given.
        weeks = sorted(
            {str(row.get("week_start")) for row in rows if row.get("week_start")},
            reverse=True,
        )
        if weeks:
            rows = [row for row in rows if str(row.get("week_start")) == weeks[0]]
    return _format_kpi_locations(rows, week_start)


def get_weekly_location_performance(week_start: Optional[str] = None) -> dict[str, Any]:
    """Read reporting.weekly_location_performance for the KPI query endpoint.

    Live path: Supabase ``reporting.weekly_location_performance``.
    Offline path (no SUPABASE_* or store unreachable): local upsert store from
    ``data/raw/weekly_location_performance_store.json`` so the Phase four
    backoffice dashboard can still consume CLI / fixture runs.
    """
    if _supabase_configured():
        try:
            client = _supabase_client()
            query = _reporting(client).table(_PERFORMANCE_TABLE).select("*")
            if week_start:
                query = query.eq("week_start", week_start)
            response = call_external(
                "reporting store",
                lambda: query.order("week_start", desc=True).execute(),
            )
            return _format_kpi_locations(response.data or [], week_start)
        except (RuntimeError, ExternalServiceError):
            pass
    return _read_local_kpi_store(week_start)


def get_latest_pipeline_run() -> dict[str, Any]:
    """Newest reporting.pipeline_runs row, falling back to last_run.json."""
    try:
        response = call_external(
            "reporting store",
            lambda: _reporting(_supabase_client())
            .table(_RUNS_TABLE)
            .select("*")
            .order("started_at", desc=True)
            .limit(1)
            .execute(),
        )
        rows = response.data or []
        if rows:
            row = rows[0]
            _mirror_run(row)
            return {
                "run_id": row.get("run_id"),
                "started_at": row.get("started_at"),
                "finished_at": row.get("finished_at"),
                "window_start": row.get("window_start"),
                "window_end": row.get("window_end"),
                "records_processed": row.get("records_processed"),
                "status": row.get("status"),
                "error_message": row.get("error_message"),
            }
    except (RuntimeError, ExternalServiceError):
        pass

    if not _LAST_RUN_PATH.exists():
        return {"message": "No pipeline runs recorded yet."}
    try:
        with open(_LAST_RUN_PATH, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {"message": "No pipeline runs recorded yet."}
    if isinstance(payload, dict) and payload.get("error_message"):
        payload["error_message"] = public_error_text(
            payload.get("error_message"), "Pipeline failed."
        )
    if isinstance(payload, dict) and payload.get("error"):
        payload["error"] = public_error_text(payload.get("error"), "Pipeline failed.")
    return payload


# ---------------------------------------------------------------------------
# Main orchestrator flow
# ---------------------------------------------------------------------------


@flow(name="brasaland_weekly_performance_pipeline", log_prints=True)
def run_pipeline(start_date: str, end_date: str) -> dict[str, Any]:
    """Monday chain-week ETL: extract → transform → load (+ optional eval).

    Phase one (subflows): stage work is three Prefect ``@flow`` subflows with
    explicit inputs/outputs. Optional eval is its own subflow invoked with
    ``return_state=True``.

    Resilience (Phase 2):
    - External Supabase tasks use retries=3 / retry_delay_seconds=5.
    - ``extract_domain_data`` and ``upsert_to_reporting_table`` failures are
      handled in-flow with ``return_state=True`` (fallback or explicit raise).
    - ``eval_brasaland_snapshot_flow`` is optional and uses ``return_state=True``.
    - ``aggregate_location_kpis`` is cached (task_input_hash, 1 day).

    Idempotency (Phase 3):
    - Load upserts on CONTEXT unique key ``(location_id, week_start)``.
    - Each attempt logs start/end, records_processed, status, and errors to
      ``reporting.pipeline_runs``, ``last_run.json``, and ``pipeline_run_log.jsonl``.
    """
    run_id = str(uuid.uuid4())
    run_row = _insert_run_start(run_id, start_date, end_date)
    records_processed = 0
    try:
        telemetry_data, domain_data = extract_brasaland_data_flow(start_date, end_date)
        if "id" in telemetry_data.columns:
            records_processed = int(telemetry_data["id"].nunique())
        else:
            records_processed = int(len(telemetry_data))

        kpis = transform_brasaland_kpis_flow(telemetry_data, domain_data, start_date)
        load_brasaland_reporting_flow(kpis)

        # Optional / non-critical subflow: secondary eval under data/eval/.
        eval_state: State = eval_brasaland_snapshot_flow(
            kpis, start_date, return_state=True
        )
        if eval_state.is_failed():
            print(
                "Eval snapshot failed (non-critical); "
                "extract/transform/load already completed successfully."
            )
        else:
            print(f"Eval snapshot state: {eval_state.type}")
    except Exception as error:
        safe = public_error_text(str(error), "reporting store is unavailable")
        _finish_run(
            run_row,
            status="Failed",
            records_processed=records_processed,
            error_message=safe,
        )
        raise

    finished = _finish_run(
        run_row,
        status="Success",
        records_processed=records_processed,
        error_message=None,
    )
    return finished


# ---------------------------------------------------------------------------
# CLI — script-based execution (Phase 4)
# ---------------------------------------------------------------------------
#
# Intended schedule (Brasaland reporting cycle):
#   Every Monday at 07:00 America/Bogota — previous chain week
#   [Monday 00:00, next Monday 00:00) America/Bogota.
#
# Run from the monorepo root:
#   python data/pipelines/pipeline.py
#   # or with an explicit window:
#   python data/pipelines/pipeline.py --start-date 2026-09-21 --end-date 2026-09-28
#


def previous_chain_week_bounds(now: Optional[datetime] = None) -> tuple[str, str]:
    """Return (window_start, window_end) for the closed chain week in America/Bogota.

    Chain week = [Monday 00:00, next Monday 00:00). The Monday 07:00 job reports
    the week that just closed (same rule as PIPELINE_DESIGN.md).
    """
    try:
        from zoneinfo import ZoneInfo
    except ImportError:  # pragma: no cover — py<3.9 fallback not expected here
        from backports.zoneinfo import ZoneInfo  # type: ignore

    bogota = ZoneInfo("America/Bogota")
    current = now.astimezone(bogota) if now is not None else datetime.now(bogota)
    # Monday=0 … Sunday=6
    days_since_monday = current.weekday()
    this_monday = (current - timedelta(days=days_since_monday)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    # At or after Monday 07:00, report the week that ended this Monday;
    # before 07:00 Monday, still report the prior closed week (same bounds).
    window_end = this_monday
    window_start = this_monday - timedelta(days=7)
    return window_start.date().isoformat(), window_end.date().isoformat()


def _fixture_frames_for_window(week_start: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Build telemetry + locations frames from data/eval fixtures (offline CLI)."""
    if not _EVAL_FIXTURES.exists():
        raise FileNotFoundError(
            f"Offline CLI needs {_EVAL_FIXTURES} when SUPABASE credentials are unset."
        )
    fixtures = json.loads(_EVAL_FIXTURES.read_text(encoding="utf-8"))
    events: list[dict] = []
    locations: list[dict] = []
    for loc in fixtures.get("locations", []):
        for event in loc.get("events", []):
            row = dict(event)
            row.setdefault("created_at", f"{week_start}T12:00:00+00:00")
            events.append(row)
        locations.append(
            {
                "id": loc["location_id"],
                "country": loc["country"],
                "currency": loc["currency"],
            }
        )
    return pd.DataFrame(events), pd.DataFrame(locations)


def _offline_upsert(records: list[dict]) -> int:
    """Local idempotent upsert into data/raw (same PK as CONTEXT destination)."""
    store_path = _RAW_DIR / "weekly_location_performance_store.json"
    existing: dict[tuple[str, str], dict] = {}
    if store_path.exists():
        try:
            prior = json.loads(store_path.read_text(encoding="utf-8"))
            for row in prior.get("rows", []):
                existing[(str(row["location_id"]), str(row["week_start"]))] = row
        except (OSError, json.JSONDecodeError, KeyError, TypeError):
            existing = {}
    for row in records:
        existing[(str(row["location_id"]), str(row["week_start"]))] = row
    rows = sorted(existing.values(), key=lambda r: (r["location_id"], r["week_start"]))
    _write_json(
        store_path,
        {
            "destination_table": f"{_REPORTING_SCHEMA}.{_PERFORMANCE_TABLE}",
            "on_conflict": _UPSERT_CONFLICT,
            "rows": rows,
        },
    )
    return len(records)


def _install_offline_backends(week_start: str) -> None:
    """Rebind store backends so the Prefect flow runs without Supabase.

    Tasks keep calling ``fetch_telemetry_events`` / ``fetch_domain_locations`` /
    ``persist_kpi_records`` by name; rebinding those module attributes is enough
    for both Prefect task execution and direct ``.fn`` unit tests.
    """
    telemetry_df, locations_df = _fixture_frames_for_window(week_start)
    this_module = sys.modules[__name__]

    def _fetch_telemetry(start_date: str, end_date: str) -> pd.DataFrame:
        print(
            f"[offline] fetch_telemetry_events using eval fixtures "
            f"for window [{start_date}, {end_date})"
        )
        return telemetry_df.copy()

    def _fetch_locations() -> pd.DataFrame:
        print("[offline] fetch_domain_locations using eval fixture locations")
        return locations_df.copy()

    def _persist(records: list[dict]) -> int:
        if not records:
            print("[offline] No data to upsert.")
            return 0
        count = _offline_upsert(records)
        print(
            f"[offline] Idempotent upsert of {count} rows "
            f"on_conflict={_UPSERT_CONFLICT} into local data/raw store"
        )
        return count

    this_module.fetch_telemetry_events = _fetch_telemetry
    this_module.fetch_domain_locations = _fetch_locations
    this_module.persist_kpi_records = _persist


def main(argv: Optional[list[str]] = None) -> int:
    """CLI entry for ``python data/pipelines/pipeline.py``."""
    import argparse

    parser = argparse.ArgumentParser(
        description=(
            "Brasaland weekly location cost & waste pipeline. "
            "Scheduled Monday 07:00 America/Bogota for the previous chain week."
        )
    )
    parser.add_argument(
        "--start-date",
        help="Chain-week start (YYYY-MM-DD). Defaults to previous Monday in America/Bogota.",
    )
    parser.add_argument(
        "--end-date",
        help="Chain-week end exclusive (YYYY-MM-DD). Defaults to this Monday in America/Bogota.",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Force fixture-backed offline run (also used automatically without Supabase env).",
    )
    args = parser.parse_args(argv)

    if args.start_date and args.end_date:
        start_date, end_date = args.start_date, args.end_date
    else:
        start_date, end_date = previous_chain_week_bounds()

    offline = args.offline or not _supabase_configured()
    mode = "offline (eval fixtures)" if offline else "live (Supabase)"
    print(
        f"Executing brasaland_weekly_performance_pipeline [{start_date}, {end_date}) "
        f"mode={mode}"
    )
    print(
        "Schedule: Monday 07:00 America/Bogota — previous chain week "
        "(see data/pipelines/PIPELINE_DESIGN.md)."
    )

    if offline:
        # Align fixture week_start with the CLI window so eval snapshot can assert.
        _install_offline_backends(start_date)

    result = run_pipeline(start_date, end_date)
    print(
        "Pipeline execution completed successfully: "
        f"status={result.get('status')} records_processed={result.get('records_processed')}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
