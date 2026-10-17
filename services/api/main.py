from __future__ import annotations

import time
import logging

import csv
from io import StringIO

import traceback

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic_settings import BaseSettings, SettingsConfigDict

from analyzer import analyze_incidents, build_export_rows, parse_csv_text
from routes.suppliers import router as suppliers_router
from routes.users import router as users_router
from routes.profiles import router as profiles_router
from routes.auth import router as auth_router
from routes.incidents import router as incidents_router
from routes.telemetry import router as telemetry_router
from routes.pipeline import router as pipeline_router
from routes.tasks import router as tasks_router

from services.tasks import analyze_incidents_task



class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "TrackFlow Incidents API"
    cors_origins: str = "http://localhost:3000"
    telemetry_endpoint: str = ""


settings = Settings()
app = FastAPI(title=settings.app_name)
logger = logging.getLogger("api.timing")

@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} | {duration:.1f}ms"
    )
    return response

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Manejador global de excepciones
# NUNCA se devuelven stack traces al cliente (Checklist #16)
# ─────────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Captura errores de validación Pydantic y devuelve un 400 identificando el campo problemático."""
    errors = []
    for err in exc.errors():
        field = " → ".join(str(loc) for loc in err.get("loc", []))
        msg = err.get("msg", "Error de validación")
        errors.append(f"{field}: {msg}" if field else msg)
    return JSONResponse(
        status_code=400,
        content={"detail": errors},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Re-lanza HTTPException tal cual (son intencionales)."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Captura cualquier excepción no controlada y devuelve 500 sin stack trace."""
    # Log interno para depuración (no se filtra al cliente)
    print(f"[ERROR] {request.method} {request.url.path}: {exc}")
    traceback.print_exc()  # Solo en consola, no en respuesta
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
    )

# Registrar el router de proveedores (Milestone 9)
# Todos sus endpoints quedan bajo /suppliers/
app.include_router(suppliers_router)

# Registrar routers de autenticación (Feature Auth)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(auth_router)

# Registrar router de incidencias (Centralized Incident Manager)
app.include_router(incidents_router)

# Registrar router de telemetría (Telemetry Capture — Phase 2)
# POST /telemetry/events — Stub endpoint para recepción de eventos
app.include_router(telemetry_router)

# Registrar router del pipeline ETL (Pipeline Dashboard)
# GET /pipeline/runs, /pipeline/latest-runs, /pipeline/kpis, /pipeline/stats
app.include_router(pipeline_router)

# Registrar router de tareas asíncronas (Message Queues)
# GET /tasks/{task_id}
app.include_router(tasks_router)


_last_analysis: dict | None = None


@app.get("/")
def root() -> dict:
    return {
        "app": settings.app_name,
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "suppliers": "/suppliers/",
            "incidents_analyze": "/api/incidents/analyze",
            "incidents_export": "/api/incidents/results/export",
            "telemetry_events": "/telemetry/events",
            "pipeline_runs": "/pipeline/runs",
            "pipeline_latest_runs": "/pipeline/latest-runs",
            "pipeline_kpis": "/pipeline/kpis",
            "pipeline_stats": "/pipeline/stats",
        },
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/incidents/analyze")
async def analyze_uploaded_incidents(file: UploadFile = File(...)) -> JSONResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded") from exc

    if not content.strip():
        raise HTTPException(status_code=400, detail="Uploaded file has no content")

    try:
        rows = parse_csv_text(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not rows:
        raise HTTPException(status_code=400, detail="CSV has no data rows")

    # Encolar la tarea en Celery para procesamiento asíncrono
    task = analyze_incidents_task.delay(csv_content=content, filename=file.filename)

    return JSONResponse(
        status_code=202,
        content={
            "task_id": task.id,
            "status": "PENDING",
            "message": "Analysis started. Use GET /tasks/{task_id} to check progress.",
        },
    )


@app.get("/api/incidents/results/export")
def export_last_results() -> PlainTextResponse:
    if _last_analysis is None:
        raise HTTPException(status_code=404, detail="No analysis found. Run /api/incidents/analyze first")

    output = StringIO()
    writer = csv.writer(output)
    writer.writerows(build_export_rows(_last_analysis))
    payload = output.getvalue()

    headers = {"Content-Disposition": 'attachment; filename="results.csv"'}
    return PlainTextResponse(content=payload, media_type="text/csv", headers=headers)
