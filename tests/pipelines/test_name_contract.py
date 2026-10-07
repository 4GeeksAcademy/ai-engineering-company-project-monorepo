"""Assert Prefect / table / KPI names match PIPELINE_DESIGN.md + CONTEXT-company.md.

A generic retail model (business_metrics, miami-downtown, sku, etc.) must not appear.
"""
from __future__ import annotations

from data.process.location_kpis import KPI_EVENT_TYPES, REPORTING_COLUMNS
from data.pipelines import pipeline as mod


# CONTEXT-company.md / PIPELINE_DESIGN.md — destination + run log
EXPECTED_PERFORMANCE_TABLE = "weekly_location_performance"
EXPECTED_RUNS_TABLE = "pipeline_runs"
EXPECTED_SCHEMA = "reporting"
EXPECTED_UPSERT_CONFLICT = "location_id,week_start"

EXPECTED_KPI_EVENT_TYPES = (
    "inbound_order_created",
    "stock_waste_registered",
    "stock_threshold_triggered",
    "ingredient_price_variance_detected",
)

EXPECTED_REPORTING_COLUMNS = [
    "location_id",
    "week_start",
    "total_purchase_cost",
    "total_waste_cost",
    "waste_ratio",
    "stockout_events_count",
    "price_alert_events_count",
    "country",
    "currency",
]

# PIPELINE_DESIGN.md Phase 4 — Prefect name= contract (Phase one subflows + tasks)
EXPECTED_MAIN_FLOW = "brasaland_weekly_performance_pipeline"
EXPECTED_STAGE_SUBFLOWS = {
    "extract_brasaland_data_flow",
    "transform_brasaland_kpis_flow",
    "load_brasaland_reporting_flow",
}
EXPECTED_OPTIONAL_SUBFLOW = "eval_brasaland_snapshot_flow"
EXPECTED_TASKS = {
    "extract_telemetry_events",
    "extract_domain_data",
    "land_raw_extracts",
    "aggregate_location_kpis",
    "land_kpi_intermediate",
    "upsert_to_reporting_table",
    "write_eval_snapshot",
}

# CONTEXT.md roster samples (not fixture labels)
EXPECTED_ROSTER_SAMPLES = {"co-med-centro", "us-mia-downtown", "co-bog-norte", "us-orlando"}
FORBIDDEN_FIXTURE_LABELS = {"miami-downtown", "medellin-centro", "miami_downtown"}


def test_kpi_event_types_match_context_company():
    assert KPI_EVENT_TYPES == EXPECTED_KPI_EVENT_TYPES


def test_reporting_columns_match_context_destination_table():
    assert REPORTING_COLUMNS == EXPECTED_REPORTING_COLUMNS
    assert list(mod._KPI_LOAD_COLUMNS) == EXPECTED_REPORTING_COLUMNS


def test_table_and_schema_names_match_context_company():
    assert mod._REPORTING_SCHEMA == EXPECTED_SCHEMA
    assert mod._PERFORMANCE_TABLE == EXPECTED_PERFORMANCE_TABLE
    assert mod._RUNS_TABLE == EXPECTED_RUNS_TABLE
    assert mod._UPSERT_CONFLICT == EXPECTED_UPSERT_CONFLICT
    assert "business_metrics" not in mod._PERFORMANCE_TABLE
    assert "weekly_location_metrics" not in mod._PERFORMANCE_TABLE


def test_prefect_flow_and_task_names_match_pipeline_design():
    assert mod.run_pipeline.name == EXPECTED_MAIN_FLOW
    assert mod.extract_brasaland_data_flow.name in EXPECTED_STAGE_SUBFLOWS
    assert mod.transform_brasaland_kpis_flow.name in EXPECTED_STAGE_SUBFLOWS
    assert mod.load_brasaland_reporting_flow.name in EXPECTED_STAGE_SUBFLOWS
    assert mod.eval_brasaland_snapshot_flow.name == EXPECTED_OPTIONAL_SUBFLOW

    task_names = {
        mod.extract_telemetry_events.name,
        mod.extract_domain_data.name,
        mod.land_raw_extracts.name,
        mod.aggregate_location_kpis.name,
        mod.land_kpi_intermediate.name,
        mod.upsert_to_reporting_table.name,
        mod.write_eval_snapshot.name,
    }
    assert task_names == EXPECTED_TASKS


def test_eval_fixtures_use_brasaland_roster_ids_not_generic_labels():
    import json
    from pathlib import Path

    fixtures = json.loads(
        (
            Path(__file__).resolve().parents[2]
            / "data/eval/weekly_location_performance_fixtures.json"
        ).read_text(encoding="utf-8")
    )
    location_ids = {loc["location_id"] for loc in fixtures["locations"]}
    assert location_ids & EXPECTED_ROSTER_SAMPLES
    assert location_ids.isdisjoint(FORBIDDEN_FIXTURE_LABELS)
    for loc in fixtures["locations"]:
        assert loc["country"] in {"Colombia", "United States"}
        assert loc["currency"] in {"COP", "USD"}
        for event in loc["events"]:
            assert event["event_type"] in EXPECTED_KPI_EVENT_TYPES
            assert "location_id" in event["event_payload"]
            assert event["event_payload"]["location_id"] == loc["location_id"]


def test_no_forbidden_generic_table_aliases_in_pipeline_module():
    from pathlib import Path

    source = Path(mod.__file__).read_text(encoding="utf-8")
    assert "business_metrics" not in source
    assert "weekly_location_metrics" not in source
    assert "miami-downtown" not in source
    assert "medellin-centro" not in source


def test_stage_subflows_declare_explicit_return_annotations():
    """Phase one: subflows pass data via returns, not module globals."""
    import inspect

    extract_sig = inspect.signature(mod.extract_brasaland_data_flow.fn)
    transform_sig = inspect.signature(mod.transform_brasaland_kpis_flow.fn)
    load_sig = inspect.signature(mod.load_brasaland_reporting_flow.fn)
    eval_sig = inspect.signature(mod.eval_brasaland_snapshot_flow.fn)

    # Explicit parameters (no reliance on module-level frames between stages).
    assert list(extract_sig.parameters) == ["start_date", "end_date"]
    assert list(transform_sig.parameters) == [
        "telemetry_df",
        "locations_df",
        "week_start",
    ]
    assert list(load_sig.parameters) == ["kpis_df"]
    assert list(eval_sig.parameters) == ["kpis_df", "week_start"]

    # Explicit return annotations on every stage / optional subflow.
    assert extract_sig.return_annotation is not inspect.Signature.empty
    assert transform_sig.return_annotation is not inspect.Signature.empty
    assert load_sig.return_annotation is not inspect.Signature.empty
    assert eval_sig.return_annotation is not inspect.Signature.empty

    # Main flow wires stages by return values, not globals.
    source = inspect.getsource(mod.run_pipeline.fn)
    assert "extract_brasaland_data_flow(" in source
    assert "transform_brasaland_kpis_flow(telemetry_data, domain_data" in source
    assert "load_brasaland_reporting_flow(kpis)" in source
    assert "eval_brasaland_snapshot_flow(" in source
    assert "return_state=True" in source
    assert "global " not in source
