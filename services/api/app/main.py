"""Nexova incident analysis API."""

from __future__ import annotations

import io
import sys
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from incident_analysis import analyze_csv_text, write_results_csv  # noqa: E402

app = FastAPI(title="Nexova Incident Analyzer")
_last_result = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/incidents/analyze")
async def analyze_incidents(file: UploadFile = File(...)) -> dict:
    global _last_result
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="A CSV file is required")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The CSV file is empty")
    try:
        result = analyze_csv_text(content.decode("utf-8-sig"))
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=400, detail="The CSV must use UTF-8 encoding") from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    _last_result = result
    return result.to_dict()


@app.get("/api/incidents/results/export")
def export_results() -> StreamingResponse:
    if _last_result is None:
        raise HTTPException(status_code=404, detail="No analysis has been generated yet")
    output = io.StringIO(newline="")
    write_results_csv(_last_result, output)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=results.csv"},
    )
