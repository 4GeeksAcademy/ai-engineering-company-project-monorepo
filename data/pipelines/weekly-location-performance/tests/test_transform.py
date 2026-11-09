"""Unit tests for the pure transformation logic (no DB, no Prefect
orchestration — calls `.fn`, the undecorated function, directly).

Covers: extraction -> transform -> load is only meaningfully testable
end-to-end (see test_flow.py), but the aggregation formula itself —
per-location sums, waste_ratio, currency split, missing-cost handling — is
pure Pandas and should be verified without any I/O.
"""

from __future__ import annotations

from datetime import date

import pandas as pd
import conftest  # noqa: F401  (sys.path setup)
from transform import transform_weekly_location_performance

_transform = transform_weekly_location_performance.fn


def _event(event_type: str, location_id: str, country: str, **tags) -> dict:
    return {
        "event_id": f"{event_type}-{location_id}-{tags}",
        "timestamp": pd.Timestamp("2026-07-13T10:00:00Z"),
        "session_id": None,
        "user_id": None,
        "event_type": event_type,
        "schema_version": "1.0.0",
        "request_id": None,
        "tags": {"location_id": location_id, "country": country, **tags},
    }


WEEK_START = date(2026, 7, 13)


def test_purchase_and_waste_cost_with_unit_cost_present():
    """When `unit_cost` IS present in tags (the normal case now that the
    instrumentation gap from company-briefing.md section 3 is closed —
    both event schemas require it going forward), costs are summed
    correctly and nothing is rejected.
    """
    raw = pd.DataFrame(
        [
            _event("inbound_order_created", "CO-MEDELLIN", "CO", quantity=10, unit_cost=2.5),
            _event("inbound_order_created", "CO-MEDELLIN", "CO", quantity=4, unit_cost=1.0),
            _event("stock_waste_registered", "CO-MEDELLIN", "CO", quantity=2, unit_cost=2.5),
        ]
    )
    result = _transform(raw, WEEK_START)

    assert result.records_rejected == 0
    row = result.aggregated.loc[result.aggregated["location_id"] == "CO-MEDELLIN"].iloc[0]
    assert row["total_purchase_cost"] == 29.0  # 10*2.5 + 4*1.0
    assert row["total_waste_cost"] == 5.0  # 2*2.5
    assert row["waste_ratio"] == 5.0 / 29.0
    assert row["currency"] == "COP"
    assert row["week_start"] == WEEK_START


def test_missing_cost_is_excluded_not_fabricated_as_zero_purchase():
    """A row without `unit_cost` in tags (e.g. an event captured before the
    unit_cost instrumentation change, or a malformed/incomplete payload)
    must show up as `records_rejected`, and the location must still appear
    (with stockout/price-alert counts intact), not be dropped entirely.
    """
    raw = pd.DataFrame(
        [
            _event("inbound_order_created", "US-AUSTIN", "US", quantity=5),
            _event("stock_threshold_triggered", "US-AUSTIN", "US"),
        ]
    )
    result = _transform(raw, WEEK_START)

    assert result.records_rejected == 1
    row = result.aggregated.loc[result.aggregated["location_id"] == "US-AUSTIN"].iloc[0]
    assert row["total_purchase_cost"] == 0.0
    assert row["stockout_events_count"] == 1
    assert row["currency"] == "USD"


def test_waste_ratio_zero_when_no_purchases():
    raw = pd.DataFrame(
        [
            _event("stock_waste_registered", "CO-CALI", "CO", quantity=3, unit_cost=1.0),
        ]
    )
    result = _transform(raw, WEEK_START)
    row = result.aggregated.loc[result.aggregated["location_id"] == "CO-CALI"].iloc[0]
    assert row["total_purchase_cost"] == 0.0
    assert row["waste_ratio"] == 0.0


def test_currencies_never_mixed_across_countries():
    """Two different locations in two different countries must each get
    their own row with their own currency — never summed together.
    """
    raw = pd.DataFrame(
        [
            _event("inbound_order_created", "CO-BOGOTA", "CO", quantity=1, unit_cost=100.0),
            _event("inbound_order_created", "US-MIAMI", "US", quantity=1, unit_cost=50.0),
        ]
    )
    result = _transform(raw, WEEK_START)
    assert len(result.aggregated) == 2
    by_location = result.aggregated.set_index("location_id")
    assert by_location.loc["CO-BOGOTA", "currency"] == "COP"
    assert by_location.loc["US-MIAMI", "currency"] == "USD"
    assert by_location.loc["CO-BOGOTA", "total_purchase_cost"] == 100.0
    assert by_location.loc["US-MIAMI", "total_purchase_cost"] == 50.0


def test_empty_input_produces_empty_output_no_error():
    raw = pd.DataFrame(columns=["event_id", "timestamp", "event_type", "tags"])
    result = _transform(raw, WEEK_START)
    assert result.records_transformed == 0
    assert result.records_rejected == 0
    assert result.aggregated.empty
