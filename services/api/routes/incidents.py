from collections import Counter
from typing import get_args
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from tinydb import Query

from models import Incident, IncidentBranch, IncidentCategory, IncidentCreate, IncidentOrigin, IncidentStatus, IncidentStatusUpdate
from security import get_current_user


router = APIRouter(prefix="/api/incidents", tags=["incidents"], dependencies=[Depends(get_current_user)])
TRANSITIONS = {
    IncidentStatus.open: {IncidentStatus.in_progress, IncidentStatus.discarded},
    IncidentStatus.in_progress: {IncidentStatus.resolved, IncidentStatus.discarded},
    IncidentStatus.resolved: set(),
    IncidentStatus.discarded: set(),
}


def find_incident(request: Request, incident_id: UUID):
    document = request.app.state.db.table("incidents").get(Query().id == str(incident_id))
    if document is None:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada.")
    return document


@router.post("", response_model=Incident, status_code=201)
def create_incident(payload: IncidentCreate, request: Request):
    incident = Incident(**payload.model_dump())
    with request.app.state.lock:
        request.app.state.db.table("incidents").insert(incident.model_dump(mode="json"))
    return incident


@router.get("", response_model=list[Incident])
def list_incidents(
    request: Request,
    status: IncidentStatus | None = None,
    origin: IncidentOrigin | None = None,
    branch: IncidentBranch | None = None,
    category: IncidentCategory | None = None,
):
    filters = {"status": status, "origin": origin, "branch": branch, "category": category}
    with request.app.state.lock:
        return [
            Incident.model_validate(document)
            for document in request.app.state.db.table("incidents").all()
            if all(value is None or document.get(field) == value for field, value in filters.items())
        ]


@router.get("/summary")
def incident_summary(request: Request):
    with request.app.state.lock:
        incidents = [Incident.model_validate(document) for document in request.app.state.db.table("incidents").all()]
    summary = {"total": len(incidents)}
    for field, values in (
        ("status", [status.value for status in IncidentStatus]),
        ("category", get_args(IncidentCategory)),
        ("origin", get_args(IncidentOrigin)),
        ("branch", get_args(IncidentBranch)),
    ):
        counts = Counter(getattr(incident, field) for incident in incidents)
        summary[f"by_{field}"] = {value: counts[value] for value in values}
    return summary


@router.get("/{incident_id}", response_model=Incident)
def get_incident(incident_id: UUID, request: Request):
    with request.app.state.lock:
        return Incident.model_validate(find_incident(request, incident_id))


@router.patch("/{incident_id}/status", response_model=Incident)
def update_incident_status(incident_id: UUID, payload: IncidentStatusUpdate, request: Request):
    with request.app.state.lock:
        document = find_incident(request, incident_id)
        incident = Incident.model_validate(document)
        if payload.status not in TRANSITIONS[incident.status]:
            raise HTTPException(status_code=400, detail={
                "field": "status",
                "message": f"No se permite pasar de {incident.status.value} a {payload.status.value}. Los estados resolved y discarded son finales.",
            })
        incident.status = payload.status
        request.app.state.db.table("incidents").update(
            incident.model_dump(mode="json", include={"status", "updated_at"}), doc_ids=[document.doc_id],
        )
    return incident