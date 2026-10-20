"""Nexova centralized backend API — single FastAPI app, one router per
domain (see docs/ARCHITECTURE_PROPOSAL.md for the reasoning).
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from auth.router import router as auth_router
from core.config import get_allowed_origins, get_jwt_secret
from core.errors import validation_error_handler
from incidents.incident_router import router as incident_manager_router
from incidents.router import router as incidents_router
from inventory.database import init_db as init_inventory_db
from inventory.seeding import seed_local_if_empty
from profiles import service as profiles_service
from profiles.router import router as profiles_router
from routers.inventory import router as inventory_router
from suppliers.router import router as suppliers_router
from users import service as users_service
from users.router import public_router as users_public_router
from users.router import router as users_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_jwt_secret()  # fail at startup, not on the first login, if SECRET_KEY is invalid
    users_service.bootstrap_first_user()
    users_service.migrate_legacy_users()
    profiles_service.migrate_legacy_profiles()
    users_service.sync_profiles()
    init_inventory_db()  # SQL tables (Supabase, or the local SQLite fallback); TinyDB is untouched
    seed_local_if_empty()
    yield


app = FastAPI(title="Nexova API", lifespan=lifespan)

# One line per request ("GET /api/incidents/summary → 200 | 41.2ms"): the evidence the caching decisions in
# CACHING_REPORT.md are based on. uvicorn only configures its own loggers, so this one gets its own handler.
timing_logger = logging.getLogger("api.timing")
timing_logger.setLevel(logging.INFO)
if not timing_logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
    timing_logger.addHandler(_handler)
    timing_logger.propagate = False


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000  # ms
    query = f"?{request.url.query}" if request.url.query else ""
    cache = response.headers.get("X-Cache")  # set by core.cache.cached_json on the cached reads
    timing_logger.info(
        "%s %s%s → %s | %.1fms%s",
        request.method,
        request.url.path,
        query,
        response.status_code,
        duration,
        f" | cache {cache}" if cache else "",
    )
    return response

app.add_exception_handler(RequestValidationError, validation_error_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=False,  # auth is a Bearer JWT in the Authorization header: no cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public: login (which is how a session starts), sign-up (POST /users) and the
# liveness check below.
# Everything else is protected inside its own router.
app.include_router(auth_router, prefix="/auth")
app.include_router(users_router, prefix="/users")
app.include_router(users_public_router, prefix="/users")
app.include_router(profiles_router, prefix="/profiles")
app.include_router(incidents_router)  # CSV analysis; first, so its fixed paths win over /{ticket_id}
app.include_router(incident_manager_router)
app.include_router(suppliers_router, prefix="/suppliers")
app.include_router(suppliers_router, prefix="/api/suppliers", include_in_schema=False)
app.include_router(inventory_router)  # prefix="/inventory" is set on the router itself


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
