"""FastAPI incidents routes protected with JWT authentication."""

from __future__ import annotations

from pydantic import BaseModel, Field, ValidationError

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from src.models.incident import (
    Incident,
    IncidentBranch,
    IncidentCategory,
    IncidentOrigin,
    IncidentStatus,
)
from src.models.user import User
from src.services.auth_service import get_current_user
from src.services.incidents_analysis_service import analyze_incidents_csv
from src.services.incidents_service import (
    can_transition_status,
    create_incident,
    get_incident_by_id,
    incidents_summary,
    list_incidents,
    update_incident_status,
)

incidents_fastapi_router = APIRouter(tags=["incidents-legacy"])

ACCEPTED_MIME_TYPES = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
}


def _is_csv_upload(uploaded_file: UploadFile) -> bool:
    filename = (uploaded_file.filename or "").lower()
    has_csv_extension = filename.endswith(".csv")
    has_csv_mime_type = (uploaded_file.content_type or "") in ACCEPTED_MIME_TYPES
    return has_csv_extension and has_csv_mime_type


class IncidentCreateRequest(BaseModel):
    """Payload used to create incidents."""

    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1)
    category: IncidentCategory
    status: IncidentStatus
    origin: IncidentOrigin
    branch: IncidentBranch


class IncidentStatusPatchRequest(BaseModel):
    """Payload used to update incident status."""

    status: IncidentStatus


def _structured_validation_error(error: ValidationError) -> list[dict[str, str]]:
    details: list[dict[str, str]] = []

    for issue in error.errors():
        field_name = str(issue.get("loc", ["field"])[-1])
        issue_type = str(issue.get("type", ""))
        issue_value = issue.get("input")

        if issue_type == "missing":
            message = f"El campo '{field_name}' es obligatorio."
        elif issue_type.startswith("string_too_short"):
            message = f"El campo '{field_name}' no puede estar vacio."
        elif issue_type.startswith("enum"):
            message = (
                f"El campo '{field_name}' tiene un valor invalido: "
                f"'{issue_value}'."
            )
        else:
            message = f"El campo '{field_name}' no es valido."

        details.append(
            {
                "field": field_name,
                "message": message,
            }
        )

    return details


def _raise_bad_request_with_details(details: list[dict[str, str]]) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "error": "Error de validacion en la solicitud.",
            "details": details,
        },
    )


@incidents_fastapi_router.post("/api/incidents", response_model=Incident, status_code=status.HTTP_201_CREATED)
def create_incident_route(
    payload: dict,
    _current_user: User = Depends(get_current_user),
) -> Incident:
    try:
        request_body = IncidentCreateRequest.model_validate(payload)
    except ValidationError as error:
        _raise_bad_request_with_details(_structured_validation_error(error))

    incident = create_incident(request_body.model_dump(mode="python"))
    return incident


@incidents_fastapi_router.get("/api/incidents", response_model=list[Incident])
def list_incidents_route(
    status: IncidentStatus | None = None,
    origin: IncidentOrigin | None = None,
    branch: IncidentBranch | None = None,
    category: IncidentCategory | None = None,
    _current_user: User = Depends(get_current_user),
) -> list[Incident]:
    return list_incidents(status=status, origin=origin, branch=branch, category=category)


@incidents_fastapi_router.get("/api/incidents/summary")
def incidents_summary_route(
    _current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return incidents_summary()


@incidents_fastapi_router.get("/api/incidents/{incident_id}", response_model=Incident)
def get_incident_by_id_route(
    incident_id: str,
    _current_user: User = Depends(get_current_user),
) -> Incident:
    incident = get_incident_by_id(incident_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidencia no encontrada.")

    return incident


@incidents_fastapi_router.patch("/api/incidents/{incident_id}/status", response_model=Incident)
def patch_incident_status_route(
    incident_id: str,
    payload: dict,
    _current_user: User = Depends(get_current_user),
) -> Incident:
    incident = get_incident_by_id(incident_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidencia no encontrada.")

    try:
        request_body = IncidentStatusPatchRequest.model_validate(payload)
    except ValidationError as error:
        _raise_bad_request_with_details(_structured_validation_error(error))

    if not can_transition_status(incident.status, request_body.status):
        _raise_bad_request_with_details(
            [
                {
                    "field": "status",
                    "message": (
                        f"Transicion de estado no permitida: '{incident.status.value}' "
                        f"-> '{request_body.status.value}'."
                    ),
                }
            ]
        )

    updated = update_incident_status(incident_id, request_body.status)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidencia no encontrada.")

    return updated


@incidents_fastapi_router.post("/api/incidents/analyze")
async def analyze_incidents_route(
    file: UploadFile = File(...),
    _current_user: User = Depends(get_current_user),
) -> dict:
    if not _is_csv_upload(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato invalido: el archivo debe ser un CSV valido (.csv).",
        )

    csv_bytes = await file.read()
    if not csv_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo CSV esta vacio.")

    try:
        summary = analyze_incidents_csv(csv_bytes)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo procesar el CSV: {error}",
        ) from error

    return {"summary": summary}
