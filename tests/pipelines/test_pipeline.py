"""Unit tests for Brasaland weekly location KPI transform (Phase two).

Isolated transform coverage for CONTEXT-company.md "KPIs to Measure":
total_purchase_cost, total_waste_cost, waste_ratio, stockout_events_count,
price_alert_events_count. No database or external APIs — in-memory DataFrames
only (pure ``data.process.location_kpis`` and Prefect task ``.fn``).

Fixtures also follow data/pipelines/PIPELINE_DESIGN.md and
data/eval/weekly_location_performance_fixtures.json.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

from data.pipelines.pipeline import (
    _supabase_client,
    aggregate_location_kpis as aggregate_location_kpis_task,
    write_validation_output,
)
from data.process.location_kpis import aggregate_location_kpis

_EVAL = Path(__file__).resolve().parents[2] / "data" / "eval" / "weekly_location_performance_fixtures.json"
_EVAL_OUTPUT = Path(__file__).resolve().parents[2] / "data" / "eval" / "last_validation.json"
_RAW = Path(__file__).resolve().parents[2] / "data" / "raw"
_WEEK = "2026-09-21"

_LOCATIONS = pd.DataFrame(
    [
        {"id": "us-mia-downtown", "country": "United States", "currency": "USD"},
        {"id": "co-med-centro", "country": "Colombia", "currency": "COP"},
        {"id": "co-bog-norte", "country": "Colombia", "currency": "COP"},
    ]
)


def _load_eval() -> dict:
    with open(_EVAL, encoding="utf-8") as handle:
        return json.load(handle)


def _telemetry(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Phase two — isolated KPI transform tasks (CONTEXT-company.md formulas)
# ---------------------------------------------------------------------------


def test_total_purchase_cost_sums_inbound_order_created():
    """total_purchase_cost = sum(event_payload.cost) for inbound_order_created."""
    telemetry_df = _telemetry(
        [
            {
                "id": "p1",
                "event_type": "inbound_order_created",
                "event_payload": {"location_id": "us-mia-downtown", "cost": 400.0},
            },
            {
                "id": "p2",
                "event_type": "inbound_order_created",
                "event_payload": {"location_id": "us-mia-downtown", "cost": 600.0},
            },
            {
                "id": "w1",
                "event_type": "stock_waste_registered",
                "event_payload": {"location_id": "us-mia-downtown", "cost": 50.0},
            },
        ]
    )
    result_df = aggregate_location_kpis(telemetry_df, _LOCATIONS, _WEEK)
    row = result_df[result_df["location_id"] == "us-mia-downtown"].iloc[0]
    assert row["total_purchase_cost"] == 1000.0
    assert row["currency"] == "USD"


def test_total_waste_cost_sums_stock_waste_registered():
    """total_waste_cost = sum(event_payload.cost) for stock_waste_registered."""
    telemetry_df = _telemetry(
        [
            {
                "id": "w1",
                "event_type": "stock_waste_registered",
                "event_payload": {"location_id": "co-med-centro", "cost": 500000.0},
            },
            {
                "id": "w2",
                "event_type": "stock_waste_registered",
                "event_payload": {"location_id": "co-med-centro", "cost": 420000.0},
            },
            {
                "id": "p1",
                "event_type": "inbound_order_created",
                "event_payload": {"location_id": "co-med-centro", "cost": 18500000.0},
            },
        ]
    )
    result_df = aggregate_location_kpis(telemetry_df, _LOCATIONS, _WEEK)
    row = result_df[result_df["location_id"] == "co-med-centro"].iloc[0]
    assert row["total_waste_cost"] == 920000.0
    assert row["currency"] == "COP"


def test_waste_ratio_hand_calculated_four_decimals():
    """Hand-calculated waste_ratio per CONTEXT-company.md (4 decimal places).

    Purchase 18500000 COP + waste 920000 COP → 920000/18500000 = 0.049729… → 0.0497.
    Purchase 1000 USD + waste 150 USD → 0.15.
    Zero purchase → waste_ratio 0 (not division by zero / NaN).
    """
    telemetry_df = _telemetry(
        [
            {
                "id": "co-p",
                "event_type": "inbound_order_created",
                "event_payload": {"location_id": "co-med-centro", "cost": 18500000},
            },
            {
                "id": "co-w",
                "event_type": "stock_waste_registered",
                "event_payload": {"location_id": "co-med-centro", "cost": 920000},
            },
            {
                "id": "us-p",
                "event_type": "inbound_order_created",
                "event_payload": {"location_id": "us-mia-downtown", "cost": 1000},
            },
            {
                "id": "us-w",
                "event_type": "stock_waste_registered",
                "event_payload": {"location_id": "us-mia-downtown", "cost": 150},
            },
            {
                "id": "bog-w",
                "event_type": "stock_waste_registered",
                "event_payload": {"location_id": "co-bog-norte", "cost": 25000},
            },
        ]
    )
    result_df = aggregate_location_kpis(telemetry_df, _LOCATIONS, _WEEK)

    co = result_df[result_df["location_id"] == "co-med-centro"].iloc[0]
    assert co["total_purchase_cost"] == 18500000.0
    assert co["total_waste_cost"] == 920000.0
    assert round(920000 / 18500000, 4) == 0.0497
    assert co["waste_ratio"] == 0.0497

    us = result_df[result_df["location_id"] == "us-mia-downtown"].iloc[0]
    assert us["waste_ratio"] == 0.15

    bog = result_df[result_df["location_id"] == "co-bog-norte"].iloc[0]
    assert bog["total_purchase_cost"] == 0.0
    assert bog["total_waste_cost"] == 25000.0
    assert bog["waste_ratio"] == 0.0


def test_stockout_and_price_alert_event_counts():
    """stockout_events_count / price_alert_events_count are row counts by event_type."""
    telemetry_df = _telemetry(
        [
            {
                "id": "s1",
                "event_type": "stock_threshold_triggered",
                "event_payload": {"location_id": "co-med-centro", "product_id": 2},
            },
            {
                "id": "s2",
                "event_type": "stock_threshold_triggered",
                "event_payload": {"location_id": "co-med-centro", "product_id": 3},
            },
            {
                "id": "a1",
                "event_type": "ingredient_price_variance_detected",
                "event_payload": {"location_id": "co-med-centro", "product_id": 1},
            },
            {
                "id": "s3",
                "event_type": "stock_threshold_triggered",
                "event_payload": {"location_id": "us-mia-downtown", "product_id": 1},
            },
        ]
    )
    result_df = aggregate_location_kpis(telemetry_df, _LOCATIONS, _WEEK)

    co = result_df[result_df["location_id"] == "co-med-centro"].iloc[0]
    assert co["stockout_events_count"] == 2
    assert co["price_alert_events_count"] == 1
    assert co["total_purchase_cost"] == 0.0
    assert co["waste_ratio"] == 0.0

    us = result_df[result_df["location_id"] == "us-mia-downtown"].iloc[0]
    assert us["stockout_events_count"] == 1
    assert us["price_alert_events_count"] == 0


def test_aggregate_location_kpis_task_fn_matches_pure_transform():
    """Prefect task ``aggregate_location_kpis.fn`` delegates to the pure transform."""
    telemetry_df = _telemetry(
        [
            {
                "id": "t1",
                "event_type": "inbound_order_created",
                "event_payload": {"location_id": "us-mia-downtown", "cost": 250},
            },
            {
                "id": "t2",
                "event_type": "stock_waste_registered",
                "event_payload": {"location_id": "us-mia-downtown", "cost": 25},
            },
        ]
    )
    via_pure = aggregate_location_kpis(telemetry_df, _LOCATIONS, _WEEK)
    via_task = aggregate_location_kpis_task.fn(telemetry_df, _LOCATIONS, _WEEK)
    pd.testing.assert_frame_equal(via_pure.reset_index(drop=True), via_task.reset_index(drop=True))
    assert via_task.iloc[0]["waste_ratio"] == 0.1


def test_aggregate_location_kpis_from_eval_fixtures():
    """Hand-calculated KPIs for us-mia-downtown and co-med-centro."""
    fixture = _load_eval()
    events = []
    locations = []
    for loc in fixture["locations"]:
        events.extend(loc["events"])
        locations.append(
            {
                "id": loc["location_id"],
                "country": loc["country"],
                "currency": loc["currency"],
            }
        )

    result_df = aggregate_location_kpis(
        pd.DataFrame(events),
        pd.DataFrame(locations),
        fixture["week_start"],
    )
    assert len(result_df) == 2

    for loc in fixture["locations"]:
        row = result_df[result_df["location_id"] == loc["location_id"]].iloc[0]
        expected = loc["expected"]
        assert row["total_purchase_cost"] == expected["total_purchase_cost"]
        assert row["total_waste_cost"] == expected["total_waste_cost"]
        assert row["waste_ratio"] == expected["waste_ratio"]
        assert row["stockout_events_count"] == expected["stockout_events_count"]
        assert row["price_alert_events_count"] == expected["price_alert_events_count"]
        assert row["country"] == loc["country"]
        assert row["currency"] == loc["currency"]
        assert row["week_start"] == fixture["week_start"]


def test_aggregate_location_kpis_dedupes_event_id():
    """Corrected inbound cost on the same telemetry_events.id replaces, not stacks."""
    fixture = _load_eval()
    case = fixture["dedupe_case"]
    locations_df = pd.DataFrame(
        [{"id": "us-mia-downtown", "country": "United States", "currency": "USD"}]
    )
    result_df = aggregate_location_kpis(
        pd.DataFrame(case["events"]),
        locations_df,
        fixture["week_start"],
    )
    assert result_df.iloc[0]["total_purchase_cost"] == case["expected_purchase_cost"]


def test_aggregate_location_kpis_empty_input():
    result_df = aggregate_location_kpis(pd.DataFrame(), pd.DataFrame(), "2026-09-21")
    assert result_df.empty


def test_aggregate_location_kpis_non_dict_payload():
    """Defensive: non-dict event_payload yields no location_id → empty KPI frame."""
    telemetry_df = pd.DataFrame(
        {
            "id": ["x1"],
            "event_type": ["inbound_order_created"],
            "event_payload": ["not-a-dict"],
        }
    )
    locations_df = pd.DataFrame(
        [{"id": "co-med-centro", "country": "Colombia", "currency": "COP"}]
    )
    result_df = aggregate_location_kpis(telemetry_df, locations_df, "2026-09-21")
    assert result_df.empty


def test_aggregate_location_kpis_malformed_payload():
    """Defensive: missing cost → 0; null location_id / bad cost types are skipped or zeroed."""
    telemetry_df = pd.DataFrame(
        {
            "id": ["a", "b", "c", "d", "e"],
            "event_type": [
                "inbound_order_created",
                "stock_waste_registered",
                "inbound_order_created",
                "inbound_order_created",
                "stock_waste_registered",
            ],
            "event_payload": [
                {"location_id": "co-bog-norte"},
                {"location_id": "co-bog-norte"},
                {"location_id": None, "cost": 999},
                {"location_id": "co-bog-norte", "cost": "not-a-number"},
                {"location_id": "co-bog-norte", "cost": None},
            ],
        }
    )
    locations_df = pd.DataFrame(
        [{"id": "co-bog-norte", "country": "Colombia", "currency": "COP"}]
    )
    result_df = aggregate_location_kpis(telemetry_df, locations_df, "2026-09-21")
    assert len(result_df) == 1
    row = result_df.iloc[0]
    assert row["location_id"] == "co-bog-norte"
    assert row["total_purchase_cost"] == 0.0
    assert row["total_waste_cost"] == 0.0
    assert row["waste_ratio"] == 0.0
    assert row["country"] == "Colombia"
    assert row["currency"] == "COP"


def test_aggregate_location_kpis_null_payload_and_missing_columns():
    """Defensive: None payload and missing required columns do not raise."""
    with_null = _telemetry(
        [
            {
                "id": "n1",
                "event_type": "inbound_order_created",
                "event_payload": None,
            }
        ]
    )
    assert aggregate_location_kpis(with_null, _LOCATIONS, _WEEK).empty

    missing_cols = pd.DataFrame({"id": ["z1"], "created_at": ["2026-09-21T00:00:00Z"]})
    assert aggregate_location_kpis(missing_cols, _LOCATIONS, _WEEK).empty


def test_missing_supabase_credentials_fail_clearly(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)
    with pytest.raises(RuntimeError, match="SUPABASE_URL"):
        _supabase_client()


def test_write_validation_output_lands_in_data_eval():
    fixture = _load_eval()
    events = []
    locations = []
    for loc in fixture["locations"]:
        events.extend(loc["events"])
        locations.append(
            {
                "id": loc["location_id"],
                "country": loc["country"],
                "currency": loc["currency"],
            }
        )
    kpis = aggregate_location_kpis(
        pd.DataFrame(events),
        pd.DataFrame(locations),
        fixture["week_start"],
    )
    report = write_validation_output(kpis, fixture["week_start"])
    assert report["passed"] is True
    assert _EVAL_OUTPUT.exists()
    saved = json.loads(_EVAL_OUTPUT.read_text(encoding="utf-8"))
    assert saved["passed"] is True
    assert saved["row_count"] == 2


def test_land_raw_extracts_writes_data_raw(tmp_path, monkeypatch):
    from data.pipelines import pipeline as pipeline_mod

    monkeypatch.setattr(pipeline_mod, "_RAW_DIR", tmp_path)
    telemetry = pd.DataFrame(
        [
            {
                "id": "1",
                "event_type": "inbound_order_created",
                "created_at": "2026-09-21T12:00:00Z",
                "event_payload": {"location_id": "us-mia-downtown", "cost": 10},
            }
        ]
    )
    locations = pd.DataFrame(
        [{"id": "us-mia-downtown", "country": "United States", "currency": "USD"}]
    )
    paths = pipeline_mod._land_raw_extracts(
        telemetry, locations, "2026-09-21", "2026-09-28"
    )
    assert Path(paths["telemetry_events"]).exists()
    assert Path(paths["locations"]).exists()
    assert (tmp_path / "telemetry_events_2026-09-21_2026-09-28.json").exists()
