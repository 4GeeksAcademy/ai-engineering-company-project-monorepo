"""Conexión de los jobs programados con la base de datos.

El script nocturno es un proceso aparte de la API: no importa `services.database` (que abre
TinyDB al importarse y exige la configuración JWT de la API) ni nada de FastAPI. Solo necesita
la cadena de conexión.

Orden para resolver la URL:

1. `JOB_RUNS_DATABASE_URL` (para apuntar el job a otra base, p. ej. un SQLite en las pruebas).
2. `DATABASE_URL`, la misma base de Supabase que usa la API (donde vive `telemetry_events`).

Las dos se leen del entorno o, si no están, del `.env` de la raíz del repo.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import Engine
from sqlmodel import create_engine

REPO_ROOT = Path(__file__).resolve().parents[2]
URL_ENVS = ("JOB_RUNS_DATABASE_URL", "DATABASE_URL")


class DatabaseNotConfigured(RuntimeError):
    """No hay ninguna cadena de conexión en el entorno ni en el .env."""


def database_url() -> str:
    load_dotenv(REPO_ROOT / ".env", override=False)  # el entorno tiene prioridad
    for name in URL_ENVS:
        if value := os.getenv(name, "").strip():
            return normalize_url(value)
    raise DatabaseNotConfigured(f"define {' o '.join(URL_ENVS)} (en el entorno o en .env)")


def normalize_url(url: str) -> str:
    """Driver psycopg 3 para las cadenas `postgres://` / `postgresql://` de Supabase (como la API)."""
    if url.startswith(("http://", "https://")):
        raise DatabaseNotConfigured(
            "la URL es la del proyecto de Supabase (API REST); hace falta la cadena PostgreSQL "
            "(Supabase > Connect > Connection String > Session pooler)"
        )
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def make_engine(url: str | None = None) -> Engine:
    url = normalize_url(url) if url else database_url()
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False, "timeout": 30})
    # Sin sentencias preparadas: el pooler de Supabase en modo transacción no las admite.
    return create_engine(url, pool_pre_ping=True, connect_args={"prepare_threshold": None})


def safe_url(engine: Engine) -> str:
    """La URL sin la contraseña, para los logs."""
    return engine.url.render_as_string(hide_password=True)
