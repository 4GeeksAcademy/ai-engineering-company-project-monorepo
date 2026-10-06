"""Side-effect-free weekly location KPI transform for Brasaland.

Implements the transform stage of ``data/pipelines/PIPELINE_DESIGN.md``:
dedupe ``telemetry_events`` on ``id``, then one row per ``location_id`` for
purchase cost, waste cost, waste ratio, stockout frequency, and price-alert
frequency. No Supabase or Prefect I/O here.
"""
from __future__ import annotations

import pandas as pd

KPI_EVENT_TYPES = (
    "inbound_order_created",
    "stock_waste_registered",
    "stock_threshold_triggered",
    "ingredient_price_variance_detected",
)

REPORTING_COLUMNS = [
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


def _location_id(payload: object) -> object:
    if isinstance(payload, dict):
        return payload.get("location_id")
    return None


def _cost(payload: object) -> float:
    if not isinstance(payload, dict):
        return 0.0
    try:
        return float(payload.get("cost", 0) or 0)
    except (TypeError, ValueError):
        return 0.0


def aggregate_location_kpis(
    telemetry_df: pd.DataFrame,
    locations_df: pd.DataFrame,
    week_start: str,
) -> pd.DataFrame:
    """Compute one location-week KPI row per location with events.

    Drops duplicate ``telemetry_events.id`` values before summing so an
    updated receipt (same id, new cost) is not double-counted.
    """
    if telemetry_df is None or telemetry_df.empty:
        return pd.DataFrame(columns=REPORTING_COLUMNS)

    frame = telemetry_df.copy()
    if "id" in frame.columns:
        frame = frame.drop_duplicates(subset=["id"], keep="last")

    if "event_payload" not in frame.columns or "event_type" not in frame.columns:
        return pd.DataFrame(columns=REPORTING_COLUMNS)

    frame["location_id"] = frame["event_payload"].apply(_location_id)
    frame["cost"] = frame["event_payload"].apply(_cost)
    frame = frame[frame["location_id"].notna()]
    if frame.empty:
        return pd.DataFrame(columns=REPORTING_COLUMNS)

    rows = []
    for location_id, group in frame.groupby("location_id", dropna=True):
        purchases = group[group["event_type"] == "inbound_order_created"]
        wastes = group[group["event_type"] == "stock_waste_registered"]
        stockouts = group[group["event_type"] == "stock_threshold_triggered"]
        price_alerts = group[group["event_type"] == "ingredient_price_variance_detected"]

        purchase_cost = float(purchases["cost"].sum())
        waste_cost = float(wastes["cost"].sum())
        waste_ratio = (waste_cost / purchase_cost) if purchase_cost > 0 else 0.0

        rows.append(
            {
                "location_id": location_id,
                "week_start": week_start,
                "total_purchase_cost": purchase_cost,
                "total_waste_cost": waste_cost,
                "waste_ratio": round(waste_ratio, 4),
                "stockout_events_count": int(len(stockouts)),
                "price_alert_events_count": int(len(price_alerts)),
            }
        )

    kpis_df = pd.DataFrame(rows)
    if locations_df is not None and not locations_df.empty and not kpis_df.empty:
        kpis_df = kpis_df.merge(
            locations_df[["id", "country", "currency"]],
            left_on="location_id",
            right_on="id",
            how="left",
        )
        kpis_df["country"] = kpis_df["country"].fillna("Unknown")
        kpis_df["currency"] = kpis_df["currency"].fillna("USD")
        if "id" in kpis_df.columns:
            kpis_df = kpis_df.drop(columns=["id"])
    else:
        kpis_df["country"] = "Unknown"
        kpis_df["currency"] = "USD"

    return kpis_df[REPORTING_COLUMNS]
