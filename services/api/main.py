from __future__ import annotations

import os
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.api.database import close_database
from services.api.routes.suppliers import router as suppliers_router


def build_allowed_origins() -> list[str]:
    origins = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    }

    explicit_origin = os.getenv("FRONTEND_ORIGIN")
    if explicit_origin:
        origins.add(explicit_origin)

    return sorted(origins)


def build_allowed_origin_regex() -> str | None:
    codespace_name = os.getenv("CODESPACE_NAME")
    forwarding_domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN")
    if not codespace_name or not forwarding_domain:
        return None
    return rf"https://{re.escape(codespace_name)}-\d+\.{re.escape(forwarding_domain)}"


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    close_database()


app = FastAPI(title="TrackFlow Supplier Directory", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=build_allowed_origins(),
    allow_origin_regex=build_allowed_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(suppliers_router)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
