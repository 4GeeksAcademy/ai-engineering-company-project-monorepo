from __future__ import annotations

import csv
import io
import os
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from scripts.analyze import AnalysisResult, CsvValidationError, build_results_rows, run_analysis

app = FastAPI(title="TrackFlow Incidents API", version="0.1.0")

_default_origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]
_extra_origins = [x.strip() for x in os.getenv("FRONTEND_ALLOWED_ORIGINS", "").split(",") if x.strip()]
_allow_origins = _default_origins + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_origin_regex=r"^https://[a-z0-9][a-z0-9-]*-5500\.app\.github\.dev$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_last_result: AnalysisResult | None = None


def _result_to_payload(result: AnalysisResult) -> dict[str, Any]:
    return {
        "total_records": result.total_records,
        "valid_records": result.valid_records,
        "invalid_records": result.invalid_records,
        "invalid_breakdown": dict(result.invalid_breakdown),
        "breakdown_by_category": dict(result.category_counts),
        "breakdown_by_status": dict(result.status_counts),
        "breakdown_by_country": dict(result.country_counts),
        "satisfaction_index": {
            "scored_incidents": result.closed_scored_total,
            "closed_valid_total": result.closed_valid_total,
            "average_score": round(result.satisfaction_average, 2),
            "distribution": dict(result.satisfaction_counts),
        },
        "source_file": result.source_file,
    }


def _analyze_upload(upload: UploadFile) -> AnalysisResult:
    filename = upload.filename or "uploaded.csv"
    suffix = Path(filename).suffix.lower()
    if suffix != ".csv":
        raise HTTPException(status_code=415, detail="File must be a CSV.")

    try:
        content = upload.file.read()
    except OSError as exc:
        raise HTTPException(status_code=400, detail="Could not read uploaded file.") from exc

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        result = run_analysis(tmp_path)
    except CsvValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="CSV file must be valid UTF-8.") from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail="Unexpected analysis error.") from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    result.source_file = filename
    return result


def _build_export_csv(result: AnalysisResult) -> str:
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["section", "metric", "value", "percentage"])
    writer.writeheader()
    writer.writerows(build_results_rows(result))
    return output.getvalue()


@app.post("/api/incidents/analyze")
async def analyze_incidents(file: UploadFile | None = File(default=None)) -> dict[str, Any]:
    if file is None:
        raise HTTPException(status_code=400, detail="CSV file is required in form field 'file'.")

    result = _analyze_upload(file)

    global _last_result
    _last_result = result
    return _result_to_payload(result)


@app.get("/api/incidents/results/export")
async def export_last_results() -> Response:
    if _last_result is None:
        raise HTTPException(status_code=404, detail="No analysis available yet.")

    csv_content = _build_export_csv(_last_result)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=results.csv"},
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
