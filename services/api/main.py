from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError

from error_handlers import (
    incidents_validation_exception_handler,
    unhandled_exception_handler,
)
from routers.auth import router as auth_router
from routers.incidents import router as incidents_router
from routers.profiles import router as profiles_router
from routers.suppliers import router as suppliers_router
from routers.users import router as users_router

# Load environment variables from .env before anything else
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

app = FastAPI(
    title="TrackFlow Supplier Directory API",
    version="0.1.0",
)

app.add_exception_handler(RequestValidationError, incidents_validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(auth_router)
app.include_router(suppliers_router)

# Canonical, documented route.
app.include_router(incidents_router, prefix="/api/incidents")
# Compatibility alias for the existing Vite dev proxy (/api/* -> /*).
# Same router/handlers, no duplicated logic — hidden from the OpenAPI
# schema to avoid showing every operation twice.
app.include_router(incidents_router, prefix="/incidents", include_in_schema=False)


@app.get("/")
def root():
    return {
        "message": "TrackFlow Supplier Directory API",
        "status": "ok",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
