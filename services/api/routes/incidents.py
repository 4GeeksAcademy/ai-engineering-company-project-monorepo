
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute

from services.api import incident_database as db
from services.api.incident_models import (
    Incident,
    IncidentCreate,
    IncidentStatus,
    IncidentOrigin,
    IncidentBranch,
    IncidentCategory,
    IncidentStatusUpdate,
)


class IncidentValidationRoute(APIRoute):
    def get_route_handler(self):
        original_handler = super().get_route_handler()

        async def handler(request: Request):
            try:
                return await original_handler(request)
            except RequestValidationError as exc:
                error = exc.errors()[0]
                field = str(error["loc"][-1])
                return JSONResponse(
                    status_code=400,
                    content={
                        "detail": {
                            "field": field,
                            "message": (
                                f"El campo '{field}' es obligatorio "
                                "o contiene un valor no permitido."
                            ),
                        }
                    },
                )

        return handler


router = APIRouter(
    tags=["incidents"],
    route_class=IncidentValidationRoute,
)

VALID_TRANSITIONS = {
    "open": {"in_progress", "discarded"},
    "in_progress": {"resolved", "discarded"},
    "resolved": set(),
    "discarded": set(),
}


@router.post("", response_model=Incident, status_code=201)
def create_incident(payload: IncidentCreate):
    return db.create_incident(
        payload.model_dump(mode="json")
    )


@router.get("", response_model=list[Incident])
def list_incidents(
    status_filter: Optional[IncidentStatus] = Query(
        default=None, alias="status"
    ),
    origin: Optional[IncidentOrigin] = None,
    branch: Optional[IncidentBranch] = None,
    category: Optional[IncidentCategory] = None,
):
    incidents = db.list_incidents()

    if status_filter:
        incidents = [
            i for i in incidents
            if i["status"] == status_filter
        ]

    if origin:
        incidents = [
            i for i in incidents
            if i["origin"] == origin
        ]

    if branch:
        incidents = [
            i for i in incidents
            if i["branch"] == branch
        ]

    if category:
        incidents = [
            i for i in incidents
            if i["category"] == category
        ]

    return incidents


@router.get("/summary")
def incidents_summary():
    return db.get_incidents_summary()


@router.get("/{incident_id}", response_model=Incident)
def get_incident(incident_id: int):
    incident = db.get_incident(incident_id)

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incidencia no encontrada.",
        )

    return incident


@router.patch(
    "/{incident_id}/status",
    response_model=Incident,
)
def update_incident_status(
    incident_id: int,
    payload: IncidentStatusUpdate,
):
    incident = db.get_incident(incident_id)

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incidencia no encontrada.",
        )

    current_status = incident["status"]
    new_status = payload.status

    if new_status not in VALID_TRANSITIONS[current_status]:
        raise HTTPException(
            status_code=400,
            detail={
                "field": "status",
                "message": (
                    f"No se puede cambiar de "
                    f"'{current_status}' a '{new_status}'."
                ),
            },
        )

    return db.update_incident_status(
        incident_id,
        new_status,
    )
