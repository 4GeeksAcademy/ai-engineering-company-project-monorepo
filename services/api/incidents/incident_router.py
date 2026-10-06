"""Routes of the incident manager, under ``/api/incidents`` next to the CSV
analysis routes in ``router.py`` (included first, so ``/analyze`` and
``/results/export`` are never read as an incident id).

Errors map to clear statuses: 404 unknown incident, 409 the incident's state
forbids the operation, 422 invalid or missing data (per field).
"""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import CurrentUser, get_current_user

from . import incident_service as service
from .incident_schemas import (
    IncidentCategory,
    IncidentCreate,
    IncidentFacets,
    IncidentOrigin,
    IncidentOut,
    IncidentPage,
    IncidentStatus,
    IncidentSummary,
    IncidentUpdate,
    StatusChange,
)

router = APIRouter(
    prefix="/api/incidents", tags=["incident manager"], dependencies=[Depends(get_current_user)]
)


def _field_error(field: str, message: str) -> HTTPException:
    detail = [{"loc": ["body", field], "msg": message, "type": "value_error"}]
    return HTTPException(422, detail=detail)


def get_filters(
    status_: Annotated[list[IncidentStatus] | None, Query(alias="status")] = None,
    category: Annotated[list[IncidentCategory] | None, Query()] = None,
    origin: Annotated[list[IncidentOrigin] | None, Query()] = None,
    branch: Annotated[str | None, Query(max_length=60)] = None,
    agent_id: Annotated[str | None, Query(max_length=20)] = None,
    client_company: Annotated[str | None, Query(max_length=120)] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> service.IncidentFilters:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            422,
            detail=[{"loc": ["query", "date_from"], "msg": "date_from cannot be after date_to", "type": "value_error"}],
        )
    return service.IncidentFilters(
        statuses=tuple(s.value for s in status_ or ()),
        categories=tuple(c.value for c in category or ()),
        origins=tuple(o.value for o in origin or ()),
        branch=(branch or "").strip() or None,
        agent_id=agent_id or None,
        client_company=(client_company or "").strip() or None,
        q=(q or "").strip() or None,
        date_from=date_from,
        date_to=date_to,
    )


Filters = Annotated[service.IncidentFilters, Depends(get_filters)]


@router.get("", response_model=IncidentPage)
async def list_incidents(
    filters: Filters,
    sort: Annotated[service.SortField, Query()] = "created_at",
    order: Annotated[service.SortOrder, Query()] = "desc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> IncidentPage:
    return service.list_incidents(filters, sort=sort, order=order, page=page, page_size=page_size)


@router.get("/summary", response_model=IncidentSummary)
async def incidents_summary(filters: Filters) -> IncidentSummary:
    return service.summarize(filters)


@router.get("/facets", response_model=IncidentFacets)
async def incidents_facets() -> IncidentFacets:
    return service.facets()


@router.post("", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
async def create_incident(payload: IncidentCreate, user: CurrentUser) -> IncidentOut:
    return service.create_incident(payload, actor=user.email)


@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(incident_id: str) -> IncidentOut:
    try:
        return service.get_incident(incident_id)
    except service.IncidentNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{incident_id}", response_model=IncidentOut)
async def update_incident(incident_id: str, payload: IncidentUpdate, user: CurrentUser) -> IncidentOut:
    try:
        return service.update_incident(incident_id, payload, actor=user.email)
    except service.IncidentNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except service.IncidentLockedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except service.InvalidIncidentUpdateError as exc:
        raise HTTPException(422, detail=exc.errors) from exc


@router.patch("/{incident_id}/status", response_model=IncidentOut)
async def change_incident_status(incident_id: str, payload: StatusChange, user: CurrentUser) -> IncidentOut:
    try:
        return service.change_status(incident_id, payload, actor=user.email)
    except service.IncidentNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except service.TransitionNotAllowedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except service.FieldProblemError as exc:
        raise _field_error(exc.field, str(exc)) from exc
