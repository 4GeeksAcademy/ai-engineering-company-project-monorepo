"""FastAPI application. Run with ``uvicorn api.app:app`` or ``uvicorn main:app`` from ``services/api``.

Inventory is stored in products.csv. This module also hosts company services
including the Brasaland supplier directory.
"""

from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from typing import Literal
 

from analyzer import IncidentAnalyzer
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from inventory import register_error_handlers, router as inventory_router
from routers.auth import router as auth_router
from routers.knowledge import router as knowledge_router
from routers.reporting import router as reporting_router
from routers.telemetry import router as telemetry_router
from routers.tickets import router as tickets_router
from database import seed_suppliers_file
from routes.suppliers import router as suppliers_router
from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parents[2]
WEBSITE_UI_ROOT = REPO_ROOT / "uis" / "website"
INCIDENTS_UI_ROOT = REPO_ROOT / "uis" / "web"
BACKOFFICE_UI_ROOT = REPO_ROOT / "uis" / "backoffice"
APPLICATION_UI_ROOT = REPO_ROOT / "uis" / "application"
KNOWLEDGE_UI_ROOT = REPO_ROOT / "uis" / "knowledge"
UPLOAD_DIR = REPO_ROOT / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
Engine = Literal["native", "pandas"]

class AnalyzeRequest(BaseModel):
    input_file: str = Field(default="scripts/incidents-COMPANY.csv")
    output_file: str = Field(default="results.csv")
    engine: Engine = "native"

def _resolve_repo_path(path_value: str) -> Path:
    candidate = Path(path_value)
    resolved = candidate.resolve() if candidate.is_absolute() else (REPO_ROOT / candidate).resolve()
    if not str(resolved).startswith(str(REPO_ROOT.resolve())):
        raise HTTPException(status_code=400, detail="Path must stay inside the repository")
    return resolved

def _run_analysis(input_path: Path, output_path: Path, engine: Engine) -> dict:
    if not input_path.exists():
        raise HTTPException(status_code=404, detail=f"Input file not found: {input_path}")
    try:
        analyzer = IncidentAnalyzer.from_file(input_path, engine=engine)
        analyzer.export_summary_to_csv(output_path)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    summary = analyzer.build_summary()
    try:
        summary["output_file"] = str(output_path.relative_to(REPO_ROOT))
    except ValueError:
        summary["output_file"] = str(output_path)
    return summary

def _register_analyze_routes(app: FastAPI, route_prefix: str) -> None:
    @app.post(f"/api/incidents/{route_prefix}")
    def analyze(request: AnalyzeRequest):
        out = _resolve_repo_path(request.output_file)
        _run_analysis(_resolve_repo_path(request.input_file), out, request.engine)
        return FileResponse(path=out, filename=out.name, media_type="text/csv")

    @app.post(f"/api/incidents/{route_prefix}/summary")
    def analyze_summary(request: AnalyzeRequest):
        return _run_analysis(_resolve_repo_path(request.input_file), _resolve_repo_path(request.output_file), request.engine)

    @app.post(f"/api/incidents/{route_prefix}/upload")
    async def analyze_upload(file: UploadFile = File(...), output_file: str = Form(default="results.csv"), engine: Engine = Form(default="native")):
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV uploads are supported")
        temp_dir = Path(tempfile.mkdtemp(prefix="incident-upload-", dir=UPLOAD_DIR))
        input_path = temp_dir / file.filename
        output_path = _resolve_repo_path(output_file)
        try:
            with input_path.open("wb") as handle:
                shutil.copyfileobj(file.file, handle)
            _run_analysis(input_path, output_path, engine)
        finally:
            await file.close()
        return FileResponse(path=output_path, filename=output_path.name, media_type="text/csv")

    @app.post(f"/api/incidents/{route_prefix}/upload/summary")
    async def analyze_upload_summary(file: UploadFile = File(...), output_file: str = Form(default="results.csv"), engine: Engine = Form(default="native")):
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV uploads are supported")
        temp_dir = Path(tempfile.mkdtemp(prefix="incident-upload-", dir=UPLOAD_DIR))
        input_path = temp_dir / file.filename
        output_path = _resolve_repo_path(output_file)
        try:
            with input_path.open("wb") as handle:
                shutil.copyfileobj(file.file, handle)
            summary = _run_analysis(input_path, output_path, engine)
        finally:
            await file.close()
        return summary

app = FastAPI(
    title="Coffee Shop Inventory API",
    description="Inventory persists in products.csv. Also hosts company services.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:8002",
        "http://127.0.0.1:8003",
        "https://rickycastro1940.github.io",
    ],
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Last-Event-ID"],
)
app.include_router(inventory_router)
register_error_handlers(app)
seed_suppliers_file()
app.include_router(suppliers_router)
app.include_router(knowledge_router)
app.include_router(auth_router)
app.include_router(tickets_router)
app.include_router(reporting_router)
app.include_router(telemetry_router)
_register_analyze_routes(app, "anylayze")
_register_analyze_routes(app, "analyze")

@app.get("/api/incidents/results/export")
def export_results(output_file: str = "results.csv"):
    output_path = _resolve_repo_path(output_file)
    if not output_path.exists():
        raise HTTPException(status_code=404, detail=f"Results file not found: {output_file}")
    return FileResponse(path=output_path, filename=output_path.name, media_type="text/csv")

if APPLICATION_UI_ROOT.exists():
    app.mount("/application", StaticFiles(directory=APPLICATION_UI_ROOT, html=True), name="application-ui")

if BACKOFFICE_UI_ROOT.exists():
    app.mount("/backoffice", StaticFiles(directory=BACKOFFICE_UI_ROOT, html=True), name="backoffice-ui")

if KNOWLEDGE_UI_ROOT.exists():
    app.mount("/knowledge", StaticFiles(directory=KNOWLEDGE_UI_ROOT, html=True), name="knowledge-ui")

if INCIDENTS_UI_ROOT.exists():
    app.mount("/incidents", StaticFiles(directory=INCIDENTS_UI_ROOT, html=True), name="incidents-ui")

if WEBSITE_UI_ROOT.exists():
    app.mount("/", StaticFiles(directory=WEBSITE_UI_ROOT, html=True), name="website-ui")
