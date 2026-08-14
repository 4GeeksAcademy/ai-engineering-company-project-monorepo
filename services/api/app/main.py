from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.domains.analytics.incidents.router import router as analytics_incidents_router
from app.domains.incidents.router import router as incidents_router
from app.domains.incidents.errors import register_incident_error_handlers
from app.domains.auth.router import router as auth_router

app = FastAPI(
    title="Brasaland Incidents API",
    description="Internal API for validating and summarizing incident CSV files.",
    version="0.1.0",
)

# --- Error handlers ---
register_incident_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics_incidents_router)
app.include_router(incidents_router)
app.include_router(auth_router)


@app.get("/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}