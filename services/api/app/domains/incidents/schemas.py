"""
schemas.py — Brasaland · Incident API request/response schemas (Pydantic v2)
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class IncidentCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)
    category: str = Field(..., description="One of: CUSTOMER_COMPLAINT, EQUIPMENT, SUPPLY, FOOD_QUALITY, STAFF")
    branch: str = Field(..., description="One of: COL-01..COL-10, FLA-01..FLA-04, HQ-MDE")


class IncidentStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target status: in_progress, resolved, discarded")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    status: str
    branch: str
    reported_at: str
    updated_at: str
    origin: str
    external_ref: str | None = None


class IncidentSummaryByCategory(BaseModel):
    category: str
    label: str
    count: int


class IncidentSummaryByStatus(BaseModel):
    status: str
    label: str
    count: int


class IncidentSummaryByBranch(BaseModel):
    branch: str
    label: str
    count: int


class IncidentSummaryByOrigin(BaseModel):
    origin: str
    label: str
    count: int


class IncidentSummaryResponse(BaseModel):
    total: int
    by_status: list[IncidentSummaryByStatus]
    by_category: list[IncidentSummaryByCategory]
    by_branch: list[IncidentSummaryByBranch]
    by_origin: list[IncidentSummaryByOrigin]


# ---------------------------------------------------------------------------
# Error response schema
# ---------------------------------------------------------------------------

class IncidentErrorResponse(BaseModel):
    code: int
    message: str
    field: str | None = None
    request_id: str
