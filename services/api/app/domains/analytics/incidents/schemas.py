from __future__ import annotations

from pydantic import BaseModel, Field


class BreakdownItem(BaseModel):
    code: str = Field(..., description="Stable code for this metric bucket.")
    label: str = Field(..., description="Human-readable label.")
    count: int = Field(..., ge=0)
    percentage: float | None = Field(default=None, ge=0)


class SatisfactionSummary(BaseModel):
    scored_closed_cases: int = Field(..., ge=0)
    total_closed_cases: int = Field(..., ge=0)
    average_score: float = Field(..., ge=0, le=5)
    score_breakdown: list[BreakdownItem]


class IncidentAnalysisResponse(BaseModel):
    source_file: str
    total_records: int = Field(..., ge=0)
    valid_records: int = Field(..., ge=0)
    invalid_records: int = Field(..., ge=0)
    invalid_breakdown: list[BreakdownItem]
    category_breakdown: list[BreakdownItem]
    status_breakdown: list[BreakdownItem]
    satisfaction: SatisfactionSummary