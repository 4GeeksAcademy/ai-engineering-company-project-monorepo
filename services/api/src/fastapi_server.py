"""FastAPI entrypoint exposing auth, users, and profiles routes."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routes.auth_router import auth_router
from src.routes.incidents_fastapi_router import incidents_fastapi_router
from src.routes.profiles_router import profiles_router
from src.routes.suppliers_fastapi_router import suppliers_fastapi_router
from src.routes.users_router import users_router

app = FastAPI(title="TrackFlow Auth API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(suppliers_fastapi_router)
app.include_router(incidents_fastapi_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
