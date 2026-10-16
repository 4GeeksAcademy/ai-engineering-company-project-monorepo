from __future__ import annotations

import csv
from io import StringIO
from pathlib import Path
import sys

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from shared.incidents_analysis import (  # noqa: E402
    AnalysisResult,
    analyze_incidents_text,
    build_export_rows,
)
from services.api.database import seed_suppliers  # noqa: E402
from services.api.routes.suppliers import router as suppliers_router  # noqa: E402

app = FastAPI(title="TrackFlow API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_LAST_ANALYSIS: dict | None = None


@app.on_event("startup")
def ensure_seed_data() -> None:
    seed_suppliers()


app.include_router(suppliers_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/incidents/analyze")
async def analyze_incidents(file: UploadFile = File(...)) -> dict:
    global _LAST_ANALYSIS

    filename = (file.filename or "").lower()
    if not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        raw_bytes = await file.read()
        csv_text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid encoding. CSV must be UTF-8.",
        ) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=400, detail=f"Could not read file: {exc}") from exc

    try:
        result = analyze_incidents_text(csv_text)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid CSV structure or values: {exc}",
        ) from exc

    payload = result.to_dict()
    payload["source_file"] = file.filename or "uploaded.csv"
    _LAST_ANALYSIS = payload
    return payload


@app.get("/api/incidents/results/export")
def export_last_results() -> StreamingResponse:
    if _LAST_ANALYSIS is None:
        raise HTTPException(status_code=404, detail="No analysis available. Upload a CSV first.")

    result_dict = dict(_LAST_ANALYSIS)
    result_obj = AnalysisResult(
        total_records=result_dict["total_records"],
        valid_records=result_dict["valid_records"],
        invalid_records=result_dict["invalid_records"],
        invalid_breakdown=result_dict["invalid_breakdown"],
        category_breakdown=result_dict["category_breakdown"],
        status_breakdown=result_dict["status_breakdown"],
        country_breakdown=result_dict["country_breakdown"],
        satisfaction_breakdown={
            int(k): v for k, v in result_dict["satisfaction_breakdown"].items()
        },
        satisfaction_average=result_dict["satisfaction_average"],
        scored_closed_incidents=result_dict["scored_closed_incidents"],
        closed_incidents=result_dict["closed_incidents"],
    )
    export_rows = build_export_rows(result_obj)

    output = StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["section", "metric", "value", "percentage"],
    )
    writer.writeheader()
    writer.writerows(export_rows)

    csv_body = output.getvalue()
    return StreamingResponse(
        iter([csv_body]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=results.csv"},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException) -> PlainTextResponse:
    return PlainTextResponse(str(exc.detail), status_code=exc.status_code)
