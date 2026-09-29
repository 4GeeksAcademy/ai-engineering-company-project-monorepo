import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tinydb import TinyDB

from ai_engineering_company_project_monorepo.api.auth import router as auth_router
from ai_engineering_company_project_monorepo.api.incidents import router as incidents_router
from ai_engineering_company_project_monorepo.api.profiles import router as profiles_router
from ai_engineering_company_project_monorepo.api.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    database_path = Path(os.getenv("TINYDB_PATH", "data/auth.json"))
    database_path.parent.mkdir(parents=True, exist_ok=True)
    app.state.database = TinyDB(database_path)
    try:
        yield
    finally:
        app.state.database.close()


app = FastAPI(title="Auth API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "null",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(incidents_router)
app.include_router(users_router)
app.include_router(profiles_router)