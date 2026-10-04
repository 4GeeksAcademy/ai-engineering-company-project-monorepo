from __future__ import annotations

import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from packages.shared.incident_validation import (
    CATEGORIES,
    BRANCHES,
    ORIGINS,
    STATUSES,
    ValidationError,
    validate_incident,
    validate_status_transition,
)
from .database import connect, init_db

UI_DIRECTORY = Path(__file__).resolve().parents[2] / "uis" / "incident-manager"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def serialize(row: sqlite3.Row) -> dict[str, Any]:
    return {key: row[key] for key in row.keys() if key != "source_id"}


class IncidentPayload(BaseModel):
    title: str
    description: str
    category: str
    status: str = "open"
    origin: str
    branch: str


class StatusPayload(BaseModel):
    status: str


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Brasaland Incident Manager", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/app",
    StaticFiles(directory=UI_DIRECTORY, html=True),
    name="incident-manager-ui",
)


@app.get("/")
def api_home():
    return {
        "service": "Brasaland Incident Manager API",
        "status": "ok",
        "docs": "/docs",
        "incidents": "/api/incidents",
        "summary": "/api/incidents/summary",
    }


@app.exception_handler(ValidationError)
async def validation_error_handler(_: Request, error: ValidationError):
    return JSONResponse(status_code=400, content={"message": "Revisa los datos enviados.", "errors": error.errors})


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(_: Request, error: RequestValidationError):
    errors = {".".join(str(part) for part in item["loc"] if part != "body"): item["msg"] for item in error.errors()}
    return JSONResponse(status_code=400, content={"message": "Revisa los datos enviados.", "errors": errors})


@app.exception_handler(Exception)
async def unexpected_error_handler(_: Request, error: Exception):
    print(f"Unexpected API error: {error}")
    return JSONResponse(status_code=500, content={"message": "No pudimos completar la operación. Inténtalo de nuevo."})


@app.post("/api/incidents", status_code=201)
def create_incident(payload: IncidentPayload):
    data = validate_incident(payload.model_dump())
    timestamp = now()
    with connect() as connection:
        cursor = connection.execute(
            "INSERT INTO incidents (title, description, category, status, origin, branch, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (*[data[field] for field in ("title", "description", "category", "status", "origin", "branch")], timestamp, timestamp),
        )
        row = connection.execute("SELECT * FROM incidents WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return serialize(row)


@app.get("/api/incidents")
def list_incidents(
    status: str | None = Query(default=None),
    origin: str | None = Query(default=None),
    branch: str | None = Query(default=None),
    category: str | None = Query(default=None),
):
    filters = {"status": status, "origin": origin, "branch": branch, "category": category}
    allowed = {"status": STATUSES, "origin": ORIGINS, "category": CATEGORIES, "branch": BRANCHES}
    for field, value in filters.items():
        if value is not None and field in allowed and value not in allowed[field]:
            raise ValidationError({field: "El filtro indicado no es válido."})
    clauses = [f"{field} = ?" for field, value in filters.items() if value is not None]
    values = [value for value in filters.values() if value is not None]
    query = "SELECT * FROM incidents" + (" WHERE " + " AND ".join(clauses) if clauses else "") + " ORDER BY created_at DESC"
    with connect() as connection:
        rows = connection.execute(query, values).fetchall()
    return [serialize(row) for row in rows]


@app.get("/api/incidents/summary")
def summary():
    result: dict[str, dict[str, int]] = {"by_status": {}, "by_category": {}, "by_origin": {}, "by_branch": {}}
    with connect() as connection:
        for output, field in (("by_status", "status"), ("by_category", "category"), ("by_origin", "origin"), ("by_branch", "branch")):
            rows = connection.execute(f"SELECT {field}, COUNT(*) AS total FROM incidents GROUP BY {field}").fetchall()
            result[output] = {row[field]: row["total"] for row in rows}
    result["total"] = sum(result["by_status"].values())
    return result


@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: int):
    with connect() as connection:
        row = connection.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    if row is None:
        return JSONResponse(status_code=404, content={"message": "La incidencia no existe."})
    return serialize(row)


@app.patch("/api/incidents/{incident_id}/status")
def update_status(incident_id: int, payload: StatusPayload):
    with connect() as connection:
        row = connection.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
        if row is None:
            return JSONResponse(status_code=404, content={"message": "La incidencia no existe."})
        validate_status_transition(row["status"], payload.status)
        connection.execute("UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?", (payload.status, now(), incident_id))
        updated = connection.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    return serialize(updated)
