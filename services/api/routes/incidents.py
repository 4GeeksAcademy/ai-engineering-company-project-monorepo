"""Incident analysis endpoints.

Validation and metrics come from scripts/incident_analysis.py, the same module
the CLI (scripts/analyze.py) uses, so both always produce identical results.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from incident_analysis import (  # noqa: E402
    PROBLEM_LABELS,
    RULE_LABELS,
    SCORE_LABELS,
    AnalysisResult,
    CsvFormatError,
    EmptyCsvError,
    analyze_csv_text,
    write_results_csv,
)

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
CSV_CONTENT_TYPES = {"text/csv", "application/csv", "application/vnd.ms-excel", "text/plain", "application/octet-stream"}

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

_last_result: AnalysisResult | None = None


def _response(result: AnalysisResult) -> dict:
    return {
        **result.to_dict(),
        "labels": {"rules": RULE_LABELS, "problems": PROBLEM_LABELS, "scores": SCORE_LABELS},
    }


@router.post("/analyze")
async def analyze_incidents(file: UploadFile = File(...)) -> dict:
    global _last_result
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Only .csv files are accepted")
    if file.content_type and file.content_type not in CSV_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported content type: {file.content_type}")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="The CSV file exceeds the 5 MB limit")
    try:
        result = analyze_csv_text(content.decode("utf-8-sig"))
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=400, detail="The CSV must be UTF-8 encoded") from error
    except EmptyCsvError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except CsvFormatError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    _last_result = result
    return _response(result)


@router.get("/results/export")
def export_results() -> StreamingResponse:
    if _last_result is None:
        raise HTTPException(status_code=404, detail="No analysis has been run yet; upload a CSV first")
    output = io.StringIO(newline="")
    write_results_csv(_last_result, output)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="results.csv"'},
    )
