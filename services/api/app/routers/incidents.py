"""Incidents router — CSV upload analysis and export endpoints."""

from __future__ import annotations

import io
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.core.deps import require_any_user
from app.services.incidents import (
    analyze,
    read_csv_from_bytes,
    results_to_csv_bytes,
    results_to_summary_json,
)

router = APIRouter(prefix="/incidents", tags=["incidents"])

# In-memory cache for the last analysis (per session / global for simplicity)
_last_analysis: Optional[dict] = None


@router.post("/analyze")
async def analyze_incidents(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_any_user),
):
    """
    Accept a CSV file via multipart/form-data, run the same validation
    analysis as ``analyze.py``, and return a JSON summary (authenticated).
    """
    global _last_analysis

    # ── Validate content-type hint ──────────────────────────
    if file.content_type and "csv" not in file.content_type and "octet-stream" not in file.content_type:
        # Some clients send text/plain for CSV — allow it.
        # Only reject clearly wrong types like image/*.
        if file.content_type.startswith("image/") or file.content_type.startswith("video/"):
            raise HTTPException(
                status_code=422,
                detail="Invalid file type. Expected a CSV file.",
            )

    # ── Read content ────────────────────────────────────────
    content = await file.read()

    if not content or len(content.strip()) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty. Please provide a valid CSV file.",
        )

    # ── Parse CSV ───────────────────────────────────────────
    try:
        rows = read_csv_from_bytes(content)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"CSV format error: {exc}",
        )
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=422,
            detail="File encoding error. Please upload a UTF-8 encoded CSV file.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not read the CSV file: {exc}",
        )

    # ── Analyse ─────────────────────────────────────────────
    try:
        results = analyze(rows)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {exc}",
        )

    # Cache results for the export endpoint
    _last_analysis = results

    summary = results_to_summary_json(results)
    return {"status": "ok", "data": summary}


@router.get("/result/export")
async def export_results(current_user: dict = Depends(require_any_user)):
    """
    Return the last analysis results as a downloadable CSV file (authenticated).
    If no analysis has been performed yet, return 404.
    """
    if _last_analysis is None:
        raise HTTPException(
            status_code=404,
            detail="No analysis results available. POST a CSV to /api/incidents/analyze first.",
        )

    csv_bytes = results_to_csv_bytes(_last_analysis)
    buffer = io.BytesIO(csv_bytes)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="incident_analysis_results.csv"',
        },
    )
