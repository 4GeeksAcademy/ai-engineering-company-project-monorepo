import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import database_lifespan
from routes.auth import router as auth_router
from routes.profiles import router as profiles_router
from routes.suppliers import router
from routes.users import router as users_router


def create_app(path: Path | None = None) -> FastAPI:
    application = FastAPI(title="TrackFlow Supplier Directory", lifespan=database_lifespan(path))
    origins = os.environ.get("CORS_ORIGINS", "http://localhost:5174,http://127.0.0.1:5174")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins.split(","),
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["content-type", "authorization"],
    )
    application.include_router(router)
    application.include_router(users_router)
    application.include_router(profiles_router)
    application.include_router(auth_router)
    return application


app = create_app()


def main():
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("SUPPLIERS_PORT", "8081")))