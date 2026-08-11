"""Incident analysis endpoints — shared logic with scripts/analyze.py."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from shared.incident_analyzer import analysis_to_csv_rows, analyze_csv_bytes
from shared.incident_analyzer.analyze import IncidentCsvError
from shared.incident_analyzer.export_csv import rows_to_csv_text

from ..incidents_store import get_last_analysis, save_analysis

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("/analyze")
async def analyze_incidents(file: UploadFile = File(...)) -> dict:
    filename = file.filename or "upload.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Incorrect file format: only CSV files are accepted.",
        )

    data = await file.read()
    if not data or not data.strip():
        raise HTTPException(status_code=400, detail="The CSV file is empty.")

    try:
        result = analyze_csv_bytes(data, source_name=filename)
    except IncidentCsvError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    save_analysis(result)
    return result.to_dict()


@router.get("/results/export")
async def export_results() -> Response:
    result = get_last_analysis()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No analysis available. Upload a CSV to /api/incidents/analyze first.",
        )

    csv_text = rows_to_csv_text(analysis_to_csv_rows(result))
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="results.csv"',
        },
    )
