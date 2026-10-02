"""Nexova centralized backend API — single FastAPI app, one router per
domain (see docs/ARCHITECTURE_PROPOSAL.md for the reasoning).
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_allowed_origins
from incidents.router import router as incidents_router
from routes.suppliers import router as suppliers_router

app = FastAPI(title="Nexova API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents_router)
app.include_router(suppliers_router, prefix="/suppliers")
app.include_router(suppliers_router, prefix="/api/suppliers", include_in_schema=False)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
