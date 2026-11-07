"""Incident analysis endpoints.

Validation and metrics come from nexova_shared.csv_validation (packages/shared),
the same module the CLI (scripts/analyze.py) uses, so both always produce identical results.
"""

from __future__ import annotations

import csv
import io
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from dependencies import get_current_user
from nexova_shared.csv_validation import (
    PROBLEM_LABELS,
    RULE_LABELS,
    SCORE_LABELS,
    AnalysisResult,
    CsvFormatError,
    EmptyCsvError,
    analyze_csv_text,
    write_results_csv,
)

logger = logging.getLogger(__name__)


class AnalysisLabels(BaseModel):
    rules: dict[str, str]
    problems: dict[str, str]
    scores: dict[int, str]


class AnalysisResponse(BaseModel):
    """Metrics of an uploaded CSV, as the dashboard reads them. Row contents are never echoed."""

    total_records: int
    valid_records: int
    invalid_records: int
    invalid_breakdown: dict[str, int]
    invalid_by_field: dict[str, dict[str, int]]
    by_category: dict[str, int]
    by_status: dict[str, int]
    scored_tickets: int
    closed_tickets: int
    average_score: float | None
    score_breakdown: dict[int, int]
    labels: AnalysisLabels

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
CSV_CONTENT_TYPES = {"text/csv", "application/csv", "application/vnd.ms-excel", "text/plain", "application/octet-stream"}

# Uploaded CSVs contain customer data, so both endpoints require a bearer token.
router = APIRouter(
    prefix="/api/incidents",
    tags=["incidents"],
    dependencies=[Depends(get_current_user)],
    responses={401: {"description": "Missing, malformed or expired token"}},
)

_last_result: AnalysisResult | None = None


def _response(result: AnalysisResult) -> dict:
    return {
        **result.to_dict(),
        "labels": {"rules": RULE_LABELS, "problems": PROBLEM_LABELS, "scores": SCORE_LABELS},
    }


@router.post("/analyze", response_model=AnalysisResponse)
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
        if isinstance(error.__cause__, csv.Error):
            # The parser's own message is internal detail; it only goes to the log.
            logger.warning("Uploaded CSV could not be parsed: %s", error.__cause__)
            raise HTTPException(status_code=422, detail="The file is not a valid CSV") from error
        raise HTTPException(status_code=422, detail=str(error)) from error
    _last_result = result
    return _response(result)


@router.get(
    "/results/export",
    response_class=StreamingResponse,
    responses={200: {"content": {"text/csv": {}}, "description": "results.csv attachment (a file, not JSON)"}},
)
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
