"""FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, health, incidents, profiles, suppliers, users


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── Middleware ──────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ────────────────────────────────────────────
    application.include_router(health.router)
    application.include_router(auth.router, prefix=settings.API_V1_PREFIX)
    application.include_router(incidents.router, prefix=settings.API_V1_PREFIX)
    application.include_router(suppliers.router, prefix=settings.API_V1_PREFIX)
    application.include_router(users.router, prefix=settings.API_V1_PREFIX)
    application.include_router(profiles.router, prefix=settings.API_V1_PREFIX)

    return application


app = create_app()
