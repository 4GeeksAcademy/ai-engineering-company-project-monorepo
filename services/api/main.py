"""Nexova centralized backend API — single FastAPI app, one router per
domain (see docs/ARCHITECTURE_PROPOSAL.md for the reasoning).
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import service as auth_service
from auth.router import router as auth_router
from core.config import get_allowed_origins, get_jwt_secret
from incidents.router import router as incidents_router
from suppliers.router import router as suppliers_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_jwt_secret()  # fail at startup, not on the first login, if SECRET_KEY is invalid
    auth_service.bootstrap_admin()
    yield


app = FastAPI(title="Nexova API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public: login (which is how a session starts) and the liveness check below.
# Everything else is protected inside its own router.
app.include_router(auth_router, prefix="/auth")
app.include_router(auth_router, prefix="/api/auth", include_in_schema=False)
app.include_router(incidents_router)
app.include_router(suppliers_router, prefix="/suppliers")
app.include_router(suppliers_router, prefix="/api/suppliers", include_in_schema=False)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
