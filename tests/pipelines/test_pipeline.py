import pandas as pd
import pytest
from data.pipelines.pipeline import aggregate_location_kpis

def test_aggregate_location_kpis_computation():
    """Validates computed KPI values match hand-calculated inputs."""
    # Setup test data based on CONTEXT-company.md events
    telemetry_data = {
        "event_type": [
            "inbound_order_created",
            "stock_waste_registered",
            "stock_threshold_triggered",
            "ingredient_price_variance_detected"
        ],
        "event_payload": [
            {"location_id": "miami-downtown", "cost": 1000},  # Purchase
            {"location_id": "miami-downtown", "cost": 150},   # Waste
            {"location_id": "miami-downtown"},               # Stockout
            {"location_id": "miami-downtown"}                # Price Alert
        ]
    }
    telemetry_df = pd.DataFrame(telemetry_data)
    
    locations_data = {
        "id": ["miami-downtown"],
        "country": ["US"],
        "currency": ["USD"]
    }
    locations_df = pd.DataFrame(locations_data)
    
    # Run transformation task using .fn to bypass Prefect's engine for unit testing
    result_df = aggregate_location_kpis.fn(telemetry_df, locations_df, "2026-07-08")
    
    # Assertions
    assert not result_df.empty
    row = result_df.iloc[0]
    
    # Verify exact hand-calculated KPIs
    assert row["total_purchase_cost"] == 1000.0
    assert row["total_waste_cost"] == 150.0
    assert row["waste_ratio"] == 0.15          # 150 / 1000
    assert row["stockout_events_count"] == 1
    assert row["price_alert_events_count"] == 1
    assert row["country"] == "US"
    assert row["currency"] == "USD"

def test_aggregate_location_kpis_empty_input():
    """Defensive behaviour: Handles empty input gracefully."""
    telemetry_df = pd.DataFrame()
    locations_df = pd.DataFrame()
    
    result_df = aggregate_location_kpis.fn(telemetry_df, locations_df, "2026-07-08")
    
    # Should return an empty DataFrame instead of crashing
    assert result_df.empty

def test_aggregate_location_kpis_malformed_payload():
    """Defensive behaviour: Handles payloads missing the 'cost' key."""
    telemetry_data = {
        "event_type": ["inbound_order_created", "stock_waste_registered"],
        "event_payload": [
            {"location_id": "bogota-norte"}, # Missing cost
            {"location_id": "bogota-norte"}  # Missing cost
        ]
    }
    telemetry_df = pd.DataFrame(telemetry_data)
    locations_df = pd.DataFrame([{"id": "bogota-norte", "country": "CO", "currency": "COP"}])
    
    result_df = aggregate_location_kpis.fn(telemetry_df, locations_df, "2026-07-08")
    
    # Missing costs should default to 0 and not throw a KeyError
    row = result_df.iloc[0]
    assert row["total_purchase_cost"] == 0.0
    assert row["total_waste_cost"] == 0.0
    assert row["waste_ratio"] == 0.0
