"""Core SQLAlchemy Table objects for the `reporting` schema.

Mirrors the approach already used in
services/api/app/models/telemetry_storage.py (`telemetry_events_table`):
plain SQLAlchemy Core `Table` objects on their own unbound `MetaData`,
never registered on `SQLModel.metadata` — these tables are owned by
supabase/migrations/20261109150000_create_reporting_schema.sql, and keeping
them off `SQLModel.metadata` guarantees
`app.core.database.init_db()`'s `create_all()`/lightweight-migrations
step can never attempt to touch them.
"""

from __future__ import annotations

from sqlalchemy import Column, Date, DateTime, Integer, MetaData, Numeric, String, Table, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID

_metadata = MetaData(schema="reporting")

weekly_location_performance_table = Table(
    "weekly_location_performance",
    _metadata,
    Column("id", PGUUID(as_uuid=True), primary_key=True),
    Column("location_id", String, nullable=False),
    Column("country", String, nullable=False),
    Column("week_start", Date, nullable=False),
    Column("total_purchase_cost", Numeric, nullable=False),
    Column("total_waste_cost", Numeric, nullable=False),
    Column("waste_ratio", Numeric, nullable=False),
    Column("stockout_events_count", Integer, nullable=False),
    Column("price_alert_events_count", Integer, nullable=False),
    Column("currency", String, nullable=False),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

pipeline_runs_table = Table(
    "pipeline_runs",
    _metadata,
    Column("id", PGUUID(as_uuid=True), primary_key=True),
    Column("prefect_flow_run_id", PGUUID(as_uuid=True), nullable=True),
    Column("pipeline_name", String, nullable=False),
    Column("pipeline_version", String, nullable=False),
    Column("requested_week_start", Date, nullable=False),
    Column("scope", JSONB, nullable=False),
    Column("status", String, nullable=False),
    Column("started_at", DateTime(timezone=True), nullable=False),
    Column("finished_at", DateTime(timezone=True), nullable=True),
    Column("records_read", Integer, nullable=True),
    Column("records_rejected", Integer, nullable=True),
    Column("records_transformed", Integer, nullable=True),
    Column("records_loaded", Integer, nullable=True),
    Column("failed_stage", String, nullable=True),
    Column("error_summary", Text, nullable=True),
    Column("optional_step_error", Text, nullable=True),
    Column("triggered_by", String, nullable=False),
)
