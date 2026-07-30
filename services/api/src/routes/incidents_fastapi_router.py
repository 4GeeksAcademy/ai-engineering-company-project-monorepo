"""FastAPI incidents routes protected with JWT authentication."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from src.models.user import User
from src.services.auth_service import get_current_user
from src.services.incidents_analysis_service import analyze_incidents_csv

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
