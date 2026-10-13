"""SQL connection of the inventory domain (Supabase/PostgreSQL through SQLModel).

The app now holds two stores at once and each request must reach the right one:

* TinyDB (``users/``, ``profiles/``): accounts and sessions, untouched by this module.
* SQL (this module): assets and their inbound/outbound orders.

``init_db()`` brings both up at startup; ``get_db`` is the per-request SQL session dependency.
The engine is created lazily, so importing the app opens no connection, and tests can swap
``get_db`` for one bound to a throw-away database.
"""

from __future__ import annotations

from collections.abc import Iterator
from functools import lru_cache
from typing import TYPE_CHECKING

from sqlalchemy import event  # no SQLModel wrapper exists for connection events
from sqlmodel import Session, SQLModel, create_engine
from tinydb import TinyDB

from core.config import get_database_url
from users import service as users_service

from . import models  # noqa: F401  (registers the tables on SQLModel.metadata)

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine


def build_engine(url: str) -> Engine:
    """Engine for ``url``. SQLite is only the local fallback: it does not enforce foreign
    keys unless asked, so ask, to get the same integrity PostgreSQL gives."""
    if url.startswith("sqlite"):
        engine = create_engine(url, connect_args={"check_same_thread": False})

        @event.listens_for(engine, "connect")
        def _enforce_foreign_keys(dbapi_connection, _record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        return engine
    # pool_pre_ping: the Supabase pooler closes idle connections; check before reusing one.
    return create_engine(url, pool_pre_ping=True)


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    return build_engine(get_database_url())


def get_tinydb() -> TinyDB:
    """The existing TinyDB client (users and authentication). Not opened a second time:
    it is the one ``users/`` already uses."""
    return users_service.get_db()


def init_db() -> None:
    """Initialise both connections at startup: the TinyDB client, and the SQL engine with
    its schema (``create_all`` creates the missing tables, FKs and CHECKs included)."""
    get_tinydb()
    SQLModel.metadata.create_all(get_engine())


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one SQL session per request, closed when the response is sent.
    No module-level session is kept."""
    with Session(get_engine()) as session:
        yield session
