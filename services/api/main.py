"""Nexova centralized API: supplier directory, incident analysis and management, user accounts and inventory.

Run with `uv run uvicorn main:app --reload` from services/api.
"""

from __future__ import annotations

import logging
import os
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import (
    IncidentRepository,
    SupplierRepository,
    UserRepository,
    create_db_and_tables,
    db_path_from_env,
    incidents_db_path_from_env,
    users_db_path_from_env,
)
from errors import register_error_handlers
from routes import auth, incident_manager, incidents, inventory, profiles, suppliers, users
from seed import seed

# Application loggers (errors, incident_errors, email_service...) propagate to the root
# logger, which uvicorn leaves unconfigured. Tracebacks of unexpected errors go here.
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").strip().upper()
logging.basicConfig(
    level=LOG_LEVEL if LOG_LEVEL in logging.getLevelNamesMapping() else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

timing_logger = logging.getLogger("api.timing")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Open TinyDB once per process; seed it so the directory never starts empty.
    repository = SupplierRepository(db_path_from_env())
    if repository.count() == 0:
        seed(repository)
    app.state.supplier_repository = repository
    app.state.user_repository = UserRepository(users_db_path_from_env())
    # Incidents start empty; historical ones are loaded with scripts/seed_incidents.py.
    app.state.incident_repository = IncidentRepository(incidents_db_path_from_env())
    # Inventory tables (Supabase); the SQL engine is built lazily and pooled per process.
    create_db_and_tables()
    try:
        yield
    finally:
        repository.close()
        app.state.user_repository.close()
        app.state.incident_repository.close()


app = FastAPI(title="Nexova API", lifespan=lifespan)
register_error_handlers(app)
app.include_router(suppliers.router)
app.include_router(incidents.router)
app.include_router(incident_manager.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(profiles.router)
app.include_router(inventory.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """One log line per request ("GET /x -> 200 | 12.3ms"): the evidence behind CACHING_REPORT.md."""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    # Path only, never the query string: filters can carry names or emails.
    timing_logger.info("%s %s -> %s | %.1fms", request.method, request.url.path, response.status_code, duration_ms)
    return response


class Health(BaseModel):
    status: Literal["ok"]


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(status="ok")
