import os
from contextlib import asynccontextmanager
from pathlib import Path
from threading import RLock

from fastapi import FastAPI
from tinydb import TinyDB

from security import auth_settings


def database_path() -> Path:
    return Path(os.environ.get("SUPPLIERS_DB_PATH", Path(__file__).parent / "data" / "suppliers.json"))


def open_database(path: Path | None = None) -> TinyDB:
    location = path if path is not None else database_path()
    location.parent.mkdir(parents=True, exist_ok=True)
    return TinyDB(location)


def database_lifespan(path: Path | None = None):
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        auth_settings()
        application.state.db = open_database(path)
        application.state.lock = RLock()
        try:
            yield
        finally:
            application.state.db.close()

    return lifespan