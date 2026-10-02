"""Incident analysis endpoints; results contain aggregates only, never source rows."""

from __future__ import annotations

import io
import logging
import sys
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from auth.dependencies import get_current_user

REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_PACKAGE = REPO_ROOT / "packages" / "incidents-analysis"
if str(ANALYSIS_PACKAGE) not in sys.path:
    sys.path.insert(0, str(ANALYSIS_PACKAGE))

from incidents_analysis import (  # noqa: E402
    EmptyFileError,
    InvalidFormatError,
    analyze_bytes,
)
from incidents_analysis.report import results_csv  # noqa: E402

router = APIRouter(prefix="/api/incidents", tags=["incidents"], dependencies=[Depends(get_current_user)])
logger = logging.getLogger(__name__)
_last_result = None
_result_lock = Lock()


@router.post("/analyze")
@router.post("/anaylze", include_in_schema=False)
async def analyze_incidents(file: UploadFile = File(...)) -> dict:
    """Analyze an uploaded incident CSV and return PHI-free aggregate metrics."""
    filename = Path(file.filename or "incidents.csv").name
    if Path(filename).suffix.lower() != ".csv":
        raise HTTPException(status_code=415, detail="Upload a .csv file.")

    try:
        raw = await file.read()
    except OSError as exc:
        logger.warning("Incident upload could not be read")
        raise HTTPException(status_code=400, detail="The uploaded file could not be read. Please try again.") from exc
    try:
        # Client-controlled filenames can contain sensitive data; never echo them.
        result = analyze_bytes(raw, source_name="CSV input")
    except EmptyFileError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except InvalidFormatError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    global _last_result
    with _result_lock:
        _last_result = result
    return result.to_dict()


@router.get("/results/export")
def export_last_results() -> StreamingResponse:
    """Download the aggregate CSV for the latest successful analysis."""
    with _result_lock:
        result = _last_result
    if result is None:
        raise HTTPException(status_code=404, detail="No successful incident analysis is available to export.")

    try:
        payload = results_csv(result)
    except (OSError, UnicodeError, ValueError) as exc:
        logger.error("Incident results could not be prepared for export")
        raise HTTPException(status_code=500, detail="The analysis results could not be exported. Please try again.") from exc
    return StreamingResponse(
        io.StringIO(payload),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="incident-analysis-results.csv"'},
    )
