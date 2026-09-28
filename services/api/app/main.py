"""FastAPI application entry point."""

from fastapi import FastAPI

from app.routers import incidents_router

app = FastAPI(title="HealthCore Digital API")
app.include_router(incidents_router)
