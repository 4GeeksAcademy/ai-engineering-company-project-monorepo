"""FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.database import init_db
from app.routers import auth, health, incidents, inventory, profiles, records, reporting, suppliers, telemetry, users

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Creates any missing SQLModel tables in Supabase on startup; existing
    # tables and data are left untouched.
    init_db()
    yield


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── Middleware ──────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ──────────────────────────────────
    # Last line of defense: any exception a route/service didn't already
    # turn into a clean HTTPException ends up here. We log the full
    # traceback server-side and return a fixed, generic body — never the
    # raw exception message, a stack trace, or anything that could embed
    # internal paths, connection strings, or secrets.
    @application.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "An unexpected error occurred. Please try again later."},
        )

    # Starlette's default HTTPException handler already returns a clean
    # {"detail": ...} body; re-declaring it here just guarantees that shape
    # stays stable even if the default ever changes.
    @application.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Pydantic's error list is already safe to return (field locations
        # and messages only) — just keep the envelope consistent.
        return JSONResponse(status_code=422, content={"detail": exc.errors()})

    # ── Routers ────────────────────────────────────────────
    application.include_router(health.router)
    application.include_router(auth.router, prefix=settings.API_V1_PREFIX)
    application.include_router(incidents.router, prefix=settings.API_V1_PREFIX)
    application.include_router(inventory.router, prefix=settings.API_V1_PREFIX)
    application.include_router(records.router, prefix=settings.API_V1_PREFIX)
    application.include_router(suppliers.router, prefix=settings.API_V1_PREFIX)
    application.include_router(users.router, prefix=settings.API_V1_PREFIX)
    application.include_router(profiles.router, prefix=settings.API_V1_PREFIX)
    application.include_router(telemetry.router, prefix=settings.API_V1_PREFIX)
    application.include_router(reporting.router, prefix=settings.API_V1_PREFIX)

    return application


app = create_app()
