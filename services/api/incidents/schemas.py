"""Pydantic contracts for the incidents domain. No business logic here —
these mirror the dataclasses in the shared ``incidents_analyzer`` package
for the HTTP boundary only.
"""

from __future__ import annotations

from pydantic import BaseModel


class InvalidBreakdownOut(BaseModel):
    missing_client_company: int
    invalid_or_missing_category: int
    invalid_description: int
    invalid_or_missing_agent_id: int
    invalid_or_missing_email: int
    closed_without_score: int
    score_out_of_range: int


class SatisfactionOut(BaseModel):
    scored: int
    closed: int
    average: float | None
    distribution: dict[str, int]


class AnalyzeResponse(BaseModel):
    source_name: str
    total_records: int
    valid_records: int
    invalid_records: int
    invalid_breakdown: InvalidBreakdownOut
    category_counts: dict[str, int]
    category_percentages: dict[str, float]
    status_counts: dict[str, int]
    status_percentages: dict[str, float]
    satisfaction: SatisfactionOut


class ErrorResponse(BaseModel):
    detail: str
