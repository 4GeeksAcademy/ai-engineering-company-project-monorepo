"""FastAPI endpoints for the Nexova incident CSV analyzer."""

import csv
import io
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.CSV_analyzer.analyze import analyze_records, load_records, metric_rows


app = FastAPI(title="Nexova Incident Analyzer API")
allowed_origins = [origin.strip() for origin in os.getenv("ANALYZER_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
_last_metrics: dict[str, Any] | None = None


def _json_metrics(metrics: dict[str, Any]) -> dict[str, Any]:
    """Convert analyzer counters into JSON-compatible values."""
    return {
        "total": metrics["total"],
        "valid": metrics["valid"],
        "invalid": metrics["invalid"],
        "invalid_counts": dict(metrics["invalid_counts"]),
        "category_counts": dict(metrics["category_counts"]),
        "status_counts": dict(metrics["status_counts"]),
        "closed_count": metrics["closed_count"],
        "scored_count": metrics["scored_count"],
        "score_counts": {str(key): value for key, value in metrics["score_counts"].items()},
        "average_score": metrics["average_score"],
    }


def _records_from_upload(content: bytes) -> list[dict[str, str]]:
    """Reuse the script loader for uploaded CSV content."""
    decoded_content = content.decode("utf-8-sig")
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="", suffix=".csv", delete=False) as source:
        source.write(decoded_content)
        temporary_path = Path(source.name)
    try:
        return load_records(temporary_path)
    finally:
        temporary_path.unlink(missing_ok=True)


@app.post("/api/incidents/analyze")
async def analyze_incidents(file: UploadFile = File(...)) -> dict[str, Any]:
    """Validate and analyze an uploaded incident CSV file."""
    global _last_metrics

    if not file.filename:
        raise HTTPException(status_code=400, detail="A CSV file is required.")

    content = await file.read()
    if not content.strip():
        raise HTTPException(status_code=400, detail="The uploaded CSV file is empty.")

    try:
        records = _records_from_upload(content)
        _last_metrics = analyze_records(records)
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=400, detail="The file must be a UTF-8 CSV.") from error
    except (OSError, csv.Error, ValueError) as error:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {error}") from error

    return _json_metrics(_last_metrics)


@app.get("/api/incidents/results/export")
def export_last_analysis() -> StreamingResponse:
    """Download aggregate metrics from the most recent successful analysis."""
    if _last_metrics is None:
        raise HTTPException(status_code=404, detail="No incident analysis is available to export.")

    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(("metric", "value"))
    writer.writerows(metric_rows(_last_metrics))
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=results.csv"},
    )
