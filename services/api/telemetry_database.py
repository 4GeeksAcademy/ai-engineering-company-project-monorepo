"""Dedicated PostgreSQL connection for telemetry storage and reporting."""

from __future__ import annotations

import os
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url


@lru_cache(maxsize=1)
def _engine_for_url(database_url: str) -> Engine:
    url = make_url(database_url)
    if url.drivername == "postgres":
        url = url.set(drivername="postgresql")
    if url.drivername not in {"postgresql", "postgresql+psycopg2"}:
        raise RuntimeError("TELEMETRY_DATABASE_URL must use PostgreSQL.")

    query = dict(url.query)
    if query.get("sslmode") not in {"require", "verify-ca", "verify-full"}:
        query["sslmode"] = "require"
    url = url.set(query=query)
    return create_engine(
        url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 10},
    )


def get_telemetry_engine() -> Engine:
    database_url = os.getenv("TELEMETRY_DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("TELEMETRY_DATABASE_URL is not configured.")
    return _engine_for_url(database_url)