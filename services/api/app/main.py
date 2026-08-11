"""HealthCore FastAPI application entrypoint."""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.routers import incidents  # noqa: E402

app = FastAPI(
    title="HealthCore API",
    description="Centralized HealthCore Digital API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "null",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
