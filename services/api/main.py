from __future__ import annotations

import csv
import io
import os
import shutil
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.analyze import (
    Analysis,
    CATEGORIES,
    COUNTRIES,
    INVALID_REASONS,
    STATUSES,
    analyze_csv,
)  # noqa: E402

app = FastAPI(title="TrackFlow Incident Analysis API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("BACKOFFICE_ORIGIN", "http://localhost:3000")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

latest_analysis: Analysis | None = None


def serialize_analysis(analysis: Analysis) -> dict[str, object]:
    return {
        "metrics": {
            "total": analysis.total,
            "valid": analysis.valid,
            "invalid": analysis.invalid,
            "scoredClosed": analysis.closed_scored,
            "closed": analysis.statuses["CLOSED"],
            "averageSatisfaction": analysis.average_satisfaction,
        },
        "errors": {
            key: {"label": label, "count": analysis.errors[key]}
            for key, label in INVALID_REASONS.items()
        },
        "categories": {name: analysis.categories[name] for name in CATEGORIES},
        "statuses": {name: analysis.statuses[name] for name in STATUSES},
        "countries": {name: analysis.countries[name] for name in COUNTRIES},
        "satisfactionScores": {
            str(score): analysis.satisfaction_scores[score] for score in range(1, 6)
        },
    }


@app.post("/api/incidents/analyze")
def analyze_upload(file: UploadFile = File(...)) -> dict[str, object]:
    global latest_analysis

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a file with a .csv extension.")

    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as temporary_file:
            temporary_path = Path(temporary_file.name)
            shutil.copyfileobj(file.file, temporary_file)
            temporary_file.flush()
            if temporary_file.tell() == 0:
                raise HTTPException(status_code=400, detail="The CSV file is empty.")

        analysis = analyze_csv(temporary_path)
    except HTTPException:
        raise
    except (OSError, UnicodeError, csv.Error, ValueError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        file.file.close()

    latest_analysis = analysis
    return serialize_analysis(analysis)


@app.get("/api/incidents/results/export")
def export_latest_results() -> StreamingResponse:
    if latest_analysis is None:
        raise HTTPException(status_code=404, detail="No analysis is available yet.")

    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(("metrica", "valor"))
    writer.writerows(latest_analysis.export_rows())
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="results.csv"'},
    )