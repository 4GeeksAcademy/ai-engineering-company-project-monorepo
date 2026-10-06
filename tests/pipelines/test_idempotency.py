"""Phase 3 idempotency: upsert key + identical re-run payloads + run metadata."""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from data.pipelines.pipeline import (
    _UPSERT_CONFLICT,
    normalize_kpi_records,
    upsert_to_reporting_table,
)
from data.process.location_kpis import aggregate_location_kpis


def _sample_kpis() -> pd.DataFrame:
    telemetry = pd.DataFrame(
        [
            {
                "id": "1",
                "event_type": "inbound_order_created",
                "event_payload": {"location_id": "us-mia-downtown", "cost": 1000},
            },
            {
                "id": "2",
                "event_type": "stock_waste_registered",
                "event_payload": {"location_id": "us-mia-downtown", "cost": 150},
            },
            {
                "id": "3",
                "event_type": "inbound_order_created",
                "event_payload": {"location_id": "co-med-centro", "cost": 18500000},
            },
            {
                "id": "4",
                "event_type": "stock_waste_registered",
                "event_payload": {"location_id": "co-med-centro", "cost": 920000},
            },
        ]
    )
    locations = pd.DataFrame(
        [
            {"id": "us-mia-downtown", "country": "United States", "currency": "USD"},
            {"id": "co-med-centro", "country": "Colombia", "currency": "COP"},
        ]
    )
    return aggregate_location_kpis(telemetry, locations, "2026-09-21")


def test_upsert_conflict_matches_context_unique_key():
    assert _UPSERT_CONFLICT == "location_id,week_start"


def test_normalize_kpi_records_identical_across_two_runs():
    """Same window + same data → identical upsert payloads (no stacking)."""
    kpis = _sample_kpis()
    first = normalize_kpi_records(kpis)
    second = normalize_kpi_records(kpis.copy())
    assert first == second
    assert len(first) == 2
    keys = {(row["location_id"], row["week_start"]) for row in first}
    assert keys == {("us-mia-downtown", "2026-09-21"), ("co-med-centro", "2026-09-21")}
    miami = next(row for row in first if row["location_id"] == "us-mia-downtown")
    assert miami["total_purchase_cost"] == 1000.0
    assert miami["total_waste_cost"] == 150.0
    assert miami["waste_ratio"] == 0.15


def test_upsert_to_reporting_table_calls_on_conflict_unique_key():
    kpis = _sample_kpis()
    captured = {}

    class _FakeTable:
        def upsert(self, records, on_conflict=None):
            captured["records"] = records
            captured["on_conflict"] = on_conflict

            class _Exec:
                def execute(self_inner):
                    return MagicMock(data=records)

            return _Exec()

    class _FakeReporting:
        def table(self, name):
            assert name == "weekly_location_performance"
            return _FakeTable()

    with patch("data.pipelines.pipeline._supabase_client", return_value=object()):
        with patch("data.pipelines.pipeline._reporting", return_value=_FakeReporting()):
            with patch("data.pipelines.pipeline.call_external", side_effect=lambda _s, op: op()):
                count = upsert_to_reporting_table.fn(kpis)

    assert count == 2
    assert captured["on_conflict"] == "location_id,week_start"
    assert captured["records"] == normalize_kpi_records(kpis)


def test_execution_metadata_written_to_last_run_and_jsonl(tmp_path, monkeypatch):
    from data.pipelines import pipeline as mod

    last_run = tmp_path / "last_run.json"
    run_log = tmp_path / "pipeline_run_log.jsonl"
    monkeypatch.setattr(mod, "_LAST_RUN_PATH", last_run)
    monkeypatch.setattr(mod, "_RUN_LOG_PATH", run_log)
    monkeypatch.setattr(
        mod,
        "call_external",
        MagicMock(side_effect=mod.ExternalServiceError("reporting store")),
    )

    row = mod._insert_run_start("run-abc", "2026-09-21", "2026-09-28")
    finished = mod._finish_run(
        row,
        status="Success",
        records_processed=4,
        error_message=None,
    )

    assert finished["started_at"]
    assert finished["finished_at"]
    assert finished["records_processed"] == 4
    assert finished["status"] == "Success"
    assert finished["error_message"] is None

    latest = json.loads(last_run.read_text(encoding="utf-8"))
    assert latest["started_at"] == finished["started_at"]
    assert latest["finished_at"] == finished["finished_at"]
    assert latest["records_processed"] == 4
    assert latest["status"] == "Success"

    lines = [json.loads(line) for line in run_log.read_text(encoding="utf-8").splitlines()]
    assert len(lines) == 2  # Running + Success
    assert lines[0]["status"] == "Running"
    assert lines[1]["status"] == "Success"
    assert "error_message" in lines[1]


def test_failed_run_records_error_message(tmp_path, monkeypatch):
    from data.pipelines import pipeline as mod

    last_run = tmp_path / "last_run.json"
    run_log = tmp_path / "pipeline_run_log.jsonl"
    monkeypatch.setattr(mod, "_LAST_RUN_PATH", last_run)
    monkeypatch.setattr(mod, "_RUN_LOG_PATH", run_log)
    monkeypatch.setattr(
        mod,
        "call_external",
        MagicMock(side_effect=mod.ExternalServiceError("reporting store")),
    )

    row = mod._insert_run_start("run-fail", "2026-09-21", "2026-09-28")
    finished = mod._finish_run(
        row,
        status="Failed",
        records_processed=0,
        error_message="reporting store is unavailable",
    )
    latest = json.loads(last_run.read_text(encoding="utf-8"))
    assert latest["status"] == "Failed"
    assert latest["error_message"] == "reporting store is unavailable"
    assert finished["error_message"] == "reporting store is unavailable"
