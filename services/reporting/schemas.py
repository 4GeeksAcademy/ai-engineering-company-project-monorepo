"""HTTP response models for Brasaland reporting (CONTEXT-company.md contract).

Field names match ``reporting.weekly_location_performance`` /
``reporting.pipeline_runs``. Country and currency enums match
``services/api/locations.py`` (CONTEXT.md roster).
"""
from __future__ import annotations

from typing import Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

# CONTEXT.md / locations.py — pipeline stores country, not region.
BrasalandCountry = Literal["Colombia", "United States", "Unknown"]
BrasalandCurrency = Literal["COP", "USD"]
PipelineRunStatus = Literal["Running", "Success", "Failed"]


class WeeklyLocationPerformanceRow(BaseModel):
    """One location-week KPI row — columns of reporting.weekly_location_performance."""

    model_config = ConfigDict(extra="ignore")

    location_id: str = Field(
        ...,
        description="Roster Location.id (e.g. co-med-centro, us-mia-downtown)",
    )
    country: Union[BrasalandCountry, str]
    currency: Union[BrasalandCurrency, str]
    total_purchase_cost: float
    total_waste_cost: float
    waste_ratio: float
    stockout_events_count: int
    price_alert_events_count: int


class WeeklyLocationPerformanceResponse(BaseModel):
    """KPI query body from CONTEXT-company.md endpoint contract."""

    model_config = ConfigDict(extra="ignore")

    week_start: Optional[str] = None
    locations: list[WeeklyLocationPerformanceRow] = Field(default_factory=list)


class PipelineRunLatestResponse(BaseModel):
    """Status query — reporting.pipeline_runs columns (CONTEXT-company.md)."""

    model_config = ConfigDict(extra="ignore")

    run_id: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None
    records_processed: Optional[int] = None
    status: Optional[Union[PipelineRunStatus, str]] = None
    error_message: Optional[str] = None
    # Empty-store marker when no runs exist yet (not a pipeline_runs column)
    message: Optional[str] = None


class PipelineTriggerRequest(BaseModel):
    """Body for POST /reporting/pipeline-runs (CONTEXT-company.md)."""

    start_date: str = Field(..., description="Chain-week start (YYYY-MM-DD, inclusive)")
    end_date: str = Field(..., description="Chain-week end (YYYY-MM-DD, exclusive)")


class PipelineTriggerResponse(BaseModel):
    """202 body from CONTEXT-company.md — Celery task id only."""

    task_id: str


class TaskStatusResponse(BaseModel):
    """Companion poll body for GET /tasks/{task_id}."""

    model_config = ConfigDict(extra="ignore")

    task_id: str
    status: str
    result: object = None
