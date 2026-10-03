"""Routes of the incident manager, under ``/api/incidents`` next to the CSV
analysis routes in ``router.py`` (included first, so ``/analyze`` and
``/results/export`` are never read as an incident id).

Errors map to clear statuses: 404 unknown incident, 409 the incident's state
forbids the operation, 400 invalid or missing data (naming each field).
"""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from auth.dependencies import CurrentUser, get_current_user
from core.errors import InvalidRequest

from . import incident_service as service
from .incident_schemas import (
    IncidentCategory,
    IncidentCreate,
    IncidentFacets,
    IncidentOrigin,
    IncidentOut,
    IncidentPage,
    IncidentStatus,
    ErrorDetail,
    IncidentSummary,
    IncidentUpdate,
    InvalidRequestResponse,
    StatusChange,
)

router = APIRouter(
    prefix="/api/incidents", tags=["incident manager"], dependencies=[Depends(get_current_user)]
)


def get_filters(
    status_: Annotated[
        list[IncidentStatus] | None,
        Query(alias="status", description="Only these statuses. Repeat the parameter for several: `?status=open&status=in_progress`."),
    ] = None,
    category: Annotated[list[IncidentCategory] | None, Query(description="Only these categories (repeatable).")] = None,
    origin: Annotated[list[IncidentOrigin] | None, Query(description="Only these origins (repeatable).")] = None,
    branch: Annotated[str | None, Query(max_length=60, description="Only this branch (case-insensitive, exact), e.g. `central`.")] = None,
    agent_id: Annotated[str | None, Query(max_length=20)] = None,
    client_company: Annotated[str | None, Query(max_length=120)] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> service.IncidentFilters:
    if date_from and date_to and date_from > date_to:
        raise InvalidRequest.on("date_from", "date_from cannot be after date_to", where="query")
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


@router.post(
    "",
    response_model=IncidentOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {
            "model": InvalidRequestResponse,
            "description": "Missing or invalid fields: `message` says what to fix, `detail` names each problematic field.",
        }
    },
)
async def create_incident(payload: IncidentCreate, user: CurrentUser, response: Response) -> IncidentOut:
    """Create an incident (always `open`; `id`, `created_at` and `updated_at` are set by the server)."""
    created = service.create_incident(payload, actor=user.email)
    response.headers["Location"] = f"{router.prefix}/{created.id}"
    return created


@router.get(
    "/{incident_id}",
    response_model=IncidentOut,
    responses={404: {"model": ErrorDetail, "description": "No incident with that id."}},
)
async def get_incident(incident_id: str) -> IncidentOut:
    """The full incident: content, status, `allowed_transitions`, `editable` and its `history`."""
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
        raise InvalidRequest.from_validation(exc.errors) from exc


@router.patch(
    "/{incident_id}/status",
    response_model=IncidentOut,
    responses={
        404: {"model": ErrorDetail, "description": "No incident with that id."},
        409: {"model": ErrorDetail, "description": "The move is not allowed from the current status."},
    },
)
async def change_incident_status(incident_id: str, payload: StatusChange, user: CurrentUser) -> IncidentOut:
    """Change only the status. Valid moves: `open` → `in_progress` | `discarded`;
    `in_progress` → `resolved` | `discarded`. `resolved` and `discarded` are final.
    Optionally `satisfaction_score` (1-5, when resolving) or `discard_reason` (when discarding)."""
    try:
        return service.change_status(incident_id, payload, actor=user.email)
    except service.IncidentNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except service.TransitionNotAllowedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except service.FieldProblemError as exc:
        raise InvalidRequest.on(exc.field, str(exc)) from exc
