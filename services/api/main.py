"""Nexova centralized API: supplier directory and incident analysis.

Run with `uv run uvicorn main:app --reload` from services/api.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import SupplierRepository, db_path_from_env
from routes import incidents, suppliers
from seed import seed

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
    try:
        yield
    finally:
        repository.close()


app = FastAPI(title="Nexova API", lifespan=lifespan)
app.include_router(suppliers.router)
app.include_router(incidents.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
