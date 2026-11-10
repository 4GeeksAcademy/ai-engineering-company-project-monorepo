from __future__ import annotations

import csv
import logging
import os
from io import StringIO
from pathlib import Path
import sys
import time

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.concurrency import run_in_threadpool
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from shared.incidents_analysis import (  # noqa: E402
    AnalysisResult,
    analyze_incidents_text,
    build_export_rows,
)
from services.api.auth import get_current_user  # noqa: E402
from services.api.database import seed_suppliers, seed_users  # noqa: E402
from services.api.inventory_database import initialize_inventory_database  # noqa: E402
from services.api.models import User  # noqa: E402
from services.api.routes.auth import router as auth_router  # noqa: E402
from services.api.routes.profiles import router as profiles_router  # noqa: E402
from services.api.routes.suppliers import router as suppliers_router  # noqa: E402
from services.api.routes.users import router as users_router  # noqa: E402
from services.api.routes.incidents import router as incidents_router  # noqa: E402
from services.api.routes.inventory import router as inventory_router  # noqa: E402
from services.api import telemetry as telemetry_module  # noqa: E402
from services.api.telemetry import report_router as telemetry_report_router  # noqa: E402
from services.api.telemetry import router as telemetry_router  # noqa: E402

app = FastAPI(title="TrackFlow API", version="1.1.0")
timing_logger = logging.getLogger("api.timing")


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    started = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        route = request.scope.get("route")
        route_path = getattr(route, "path", "")
        duration_ms = max(0, (time.perf_counter() - started) * 1000)
        telemetry_route = telemetry_module.canonical_api_route(route_path)
        if telemetry_route and request.method in telemetry_module.API_METHODS:
            await run_in_threadpool(
                telemetry_module.record_server_event,
                "api_latency_recorded",
                {
                    "route": telemetry_route,
                    "method": request.method,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                },
            )
        timing_logger.info(
            "%s %s status=%s duration_ms=%.3f",
            request.method,
            route_path or "<unmatched>",
            status_code,
            duration_ms,
        )

# ------------------------------------------------------------------
# CORS origins
#
# Development defaults: both Next.js apps on localhost.
# Override via CORS_ORIGINS env var in production — comma-separated
# list of origins (e.g. "https://admin.trackflow.com,https://trackflow.com").
# The Docker service name "api" does NOT need to be listed here
# because inter-container calls do not go through the browser CORS
# policy.
# ------------------------------------------------------------------
_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
_cors_str = os.environ.get("CORS_ORIGINS", "")
_cors_origins = (
    [origin.strip() for origin in _cors_str.split(",") if origin.strip()]
    if _cors_str
    else _default_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_LAST_ANALYSIS: dict | None = None


@app.on_event("startup")
def ensure_seed_data() -> None:
    app.state.storage_ready = True
    for seed in (seed_suppliers, seed_users):
        try:
            seed()
        except (OSError, ValueError, TypeError, KeyError):
            app.state.storage_ready = False
            logging.getLogger(__name__).error("Startup data is unavailable. Check storage access and data integrity.")
    initialize_inventory_database()


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(suppliers_router)
app.include_router(inventory_router)
app.include_router(telemetry_router)
app.include_router(telemetry_report_router)


@app.get("/health")
def health() -> dict[str, str]:
    if not getattr(app.state, "storage_ready", True):
        raise HTTPException(503, "Service storage is unavailable.")
    return {"status": "ok"}


@app.post("/api/incidents/analyze")
async def analyze_incidents(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
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
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not read the upload. Please try again.") from exc

    try:
        result = analyze_incidents_text(csv_text)
    except (ValueError, csv.Error) as exc:
        raise HTTPException(
            status_code=400,
            detail="The CSV structure is invalid. Check the required columns and try again.",
        ) from exc

    payload = result.to_dict()
    payload["source_file"] = file.filename or "uploaded.csv"
    _LAST_ANALYSIS = payload
    return payload


@app.get("/api/incidents/results/export")
def export_last_results(current_user: User = Depends(get_current_user)) -> StreamingResponse:
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


app.include_router(incidents_router)


def is_manager_request(request):
    path = request.url.path
    return path.startswith("/api/incidents") and path not in (
        "/api/incidents/analyze", "/api/incidents/results/export",
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = {}
    for error in exc.errors():
        field = str(error["loc"][-1])
        if error["type"] == "value_error.missing":
            message = "This field is required."
        elif error["type"] == "value_error.const":
            message = "Please choose an available option."
        elif "min_length" in error["type"]:
            message = "Please enter a value."
        elif "max_length" in error["type"]:
            message = "Please use 120 characters or fewer."
        else:
            message = "Please enter a valid value."
        errors[field] = message
    message = "Please check the highlighted fields."
    return JSONResponse({"message": message, "detail": message, "errors": errors}, status_code=400 if is_manager_request(request) else 422)


@app.exception_handler(Exception)
async def unexpected_exception_handler(request, exc):
    logging.getLogger(__name__).error("API request failed (%s)", type(exc).__name__)
    return JSONResponse({"message": "Something went wrong. Please try again."}, status_code=500)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    if exc.status_code >= 500:
        message = "Something went wrong. Please try again."
    elif isinstance(exc.detail, dict):
        message = "Please check the highlighted fields."
    else:
        message = str(exc.detail)
    body = {"message": message, "detail": message}
    if isinstance(exc.detail, dict) and exc.status_code < 500:
        body["errors"] = exc.detail
    return JSONResponse(body, status_code=exc.status_code, headers=exc.headers)
