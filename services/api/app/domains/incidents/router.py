"""
router.py — Brasaland · Incident CRUD endpoints

POST   /api/incidents              Create incident        (PROTECTED)
GET    /api/incidents              List incidents         (PROTECTED)
GET    /api/incidents/summary      Summary aggregates     (PROTECTED)
GET    /api/incidents/{id}         Get single incident    (PROTECTED)
PATCH  /api/incidents/{id}/status  Update status          (PROTECTED)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.domains.auth.dependencies import get_current_user

from .constants import BRANCH_LABELS, CATEGORY_LABELS, ORIGIN_LABELS, STATUS_LABELS
from .errors import (
    IncidentBaseException,
    IncidentDuplicateError,
    IncidentInvalidTransitionError,
    IncidentNotFoundError,
    IncidentValidationError,
    register_incident_error_handlers,
)
from .schemas import (
    IncidentCreateRequest,
    IncidentResponse,
    IncidentStatusUpdateRequest,
    IncidentSummaryByBranch,
    IncidentSummaryByCategory,
    IncidentSummaryByOrigin,
    IncidentSummaryByStatus,
    IncidentSummaryResponse,
)
from .service import IncidentService

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

# Service singleton (per-process)
_service: IncidentService | None = None


def _get_service() -> IncidentService:
    global _service
    if _service is None:
        _service = IncidentService()
    return _service


# ---------------------------------------------------------------------------
# POST /api/incidents — Create
# ---------------------------------------------------------------------------

@router.post("", response_model=IncidentResponse, status_code=201)
async def create_incident(
    body: IncidentCreateRequest,
    current_user: dict = Depends(get_current_user),
    service: IncidentService = Depends(_get_service),
) -> IncidentResponse:
    """Create a new incident. Status is always 'open' initially."""
    incident = service.create_incident(
        title=body.title,
        description=body.description,
        category=body.category,
        branch=body.branch,
        origin="api",
    )
    return IncidentResponse(**incident.to_response_dict())


# ---------------------------------------------------------------------------
# GET /api/incidents/summary — Summary (must be registered BEFORE /{id})
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=IncidentSummaryResponse)
async def get_incidents_summary(
    current_user: dict = Depends(get_current_user),
    service: IncidentService = Depends(_get_service),
) -> IncidentSummaryResponse:
    """Return aggregate counts by status, category, branch, origin."""
    raw = service.get_summary()

    by_status = [
        IncidentSummaryByStatus(
            status=s,
            label=STATUS_LABELS.get(s, s),
            count=c,
        )
        for s, c in raw.get("by_status", {}).items()
    ]
    by_category = [
        IncidentSummaryByCategory(
            category=c,
            label=CATEGORY_LABELS.get(c, c),
            count=n,
        )
        for c, n in raw.get("by_category", {}).items()
    ]
    by_branch = [
        IncidentSummaryByBranch(
            branch=b,
            label=BRANCH_LABELS.get(b, b),
            count=n,
        )
        for b, n in raw.get("by_branch", {}).items()
    ]
    by_origin = [
        IncidentSummaryByOrigin(
            origin=o,
            label=ORIGIN_LABELS.get(o, o),
            count=n,
        )
        for o, n in raw.get("by_origin", {}).items()
    ]

    return IncidentSummaryResponse(
        total=raw["total"],
        by_status=by_status,
        by_category=by_category,
        by_branch=by_branch,
        by_origin=by_origin,
    )


# ---------------------------------------------------------------------------
# GET /api/incidents — List
# ---------------------------------------------------------------------------

@router.get("", response_model=list[IncidentResponse])
async def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    branch: Optional[str] = Query(None, description="Filter by branch"),
    current_user: dict = Depends(get_current_user),
    service: IncidentService = Depends(_get_service),
) -> list[IncidentResponse]:
    """List all incidents with optional filters."""
    incidents = service.list_incidents(
        status=status,
        category=category,
        branch=branch,
    )
    return [IncidentResponse(**i.to_response_dict()) for i in incidents]


# ---------------------------------------------------------------------------
# GET /api/incidents/{id} — Get single
# ---------------------------------------------------------------------------

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    current_user: dict = Depends(get_current_user),
    service: IncidentService = Depends(_get_service),
) -> IncidentResponse:
    """Get a single incident by ID."""
    incident = service.get_incident(incident_id)
    return IncidentResponse(**incident.to_response_dict())


# ---------------------------------------------------------------------------
# PATCH /api/incidents/{id}/status — Update status
# ---------------------------------------------------------------------------

@router.patch("/{incident_id}/status", response_model=IncidentResponse)
async def update_incident_status(
    incident_id: str,
    body: IncidentStatusUpdateRequest,
    current_user: dict = Depends(get_current_user),
    service: IncidentService = Depends(_get_service),
) -> IncidentResponse:
    """Transition an incident to a new status."""
    incident = service.update_status(incident_id, body.status)
    return IncidentResponse(**incident.to_response_dict())
