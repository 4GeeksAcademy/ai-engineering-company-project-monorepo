"""Centralized incident manager endpoints (/api/incidents).

Shares the /api/incidents prefix with the CSV analysis routes (routes/incidents.py)
without overlapping them. Every route requires a bearer token. Errors follow
incident_errors.IncidentRoute: 400 with per-field messages, generic 500.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from database import IncidentRepository, InvalidStatusTransition
from dependencies import get_current_user
from incident_errors import IncidentRoute
from incident_models import (
    Incident,
    IncidentCreate,
    IncidentDetail,
    IncidentListItem,
    IncidentRecord,
    IncidentSummary,
    StatusUpdate,
)
from nexova_shared.incidents import STATUS_TRANSITIONS, Branch, IncidentCategory, IncidentOrigin, IncidentStatus

router = APIRouter(
    prefix="/api/incidents",
    tags=["incident manager"],
    route_class=IncidentRoute,
    dependencies=[Depends(get_current_user)],
    responses={
        400: {"description": "Datos no válidos: {detail, errors: [{field, message}]}"},
        401: {"description": "Missing, malformed or expired token"},
        500: {"description": "Ha ocurrido un error inesperado"},
    },
)


def get_incident_repository(request: Request) -> IncidentRepository:
    return request.app.state.incident_repository


Repository = Annotated[IncidentRepository, Depends(get_incident_repository)]


def _not_found(incident_id: int) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No existe ninguna incidencia con id {incident_id}")


def _transition_message(error: InvalidStatusTransition) -> str:
    current, new = error.current.value, error.new.value
    allowed = STATUS_TRANSITIONS[error.current]
    if not allowed:
        return f"No se puede pasar de «{current}» a «{new}»: «{current}» es un estado final"
    options = " o ".join(f"«{value.value}»" for value in allowed)
    return f"No se puede pasar de «{current}» a «{new}»: desde «{current}» solo se puede pasar a {options}"


@router.post("", response_model=IncidentDetail, status_code=status.HTTP_201_CREATED)
def create_incident(data: IncidentCreate, repository: Repository) -> Incident:
    now = datetime.now(UTC)
    return repository.create(IncidentRecord(**data.model_dump(), created_at=now, updated_at=now))


@router.get("", response_model=list[IncidentListItem])
def list_incidents(
    repository: Repository,
    status: IncidentStatus | None = None,
    origin: IncidentOrigin | None = None,
    branch: Branch | None = None,
    category: IncidentCategory | None = None,
) -> list[Incident]:
    """Newest first. Every filter is optional; an empty database gives []."""
    return repository.list(status=status, origin=origin, branch=branch, category=category)


# Declared before /{incident_id} so "summary" is never read as an id.
@router.get("/summary", response_model=IncidentSummary)
def incidents_summary(repository: Repository) -> IncidentSummary:
    """Totals by status, category, origin and branch; every allowed value is present, even at 0."""
    return repository.summary()


@router.get("/{incident_id}", response_model=IncidentDetail)
def get_incident(incident_id: int, repository: Repository) -> Incident:
    incident = repository.get(incident_id)
    if incident is None:
        raise _not_found(incident_id)
    return incident


@router.patch("/{incident_id}/status", response_model=IncidentDetail)
def update_incident_status(incident_id: int, data: StatusUpdate, repository: Repository) -> Incident:
    """Change only the status (and updated_at), following the lifecycle in nexova_shared.incidents."""
    try:
        incident = repository.update_status(incident_id, data.status)
    except InvalidStatusTransition as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_transition_message(error)) from error
    if incident is None:
        raise _not_found(incident_id)
    return incident
