from __future__ import annotations

import csv
from io import StringIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic_settings import BaseSettings, SettingsConfigDict

from analyzer import analyze_incidents, build_export_rows, parse_csv_text
from routes.suppliers import router as suppliers_router
from routes.users import router as users_router
from routes.profiles import router as profiles_router
from routes.auth import router as auth_router



class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "TrackFlow Incidents API"
    cors_origins: str = "http://localhost:3000"


settings = Settings()
app = FastAPI(title=settings.app_name)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar el router de proveedores (Milestone 9)
# Todos sus endpoints quedan bajo /suppliers/
app.include_router(suppliers_router)

# Registrar routers de autenticación (Feature Auth)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(auth_router)


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
        },
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/incidents/analyze")
async def analyze_uploaded_incidents(file: UploadFile = File(...)) -> dict:
    global _last_analysis

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

    _last_analysis = analyze_incidents(rows)
    return _last_analysis


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
