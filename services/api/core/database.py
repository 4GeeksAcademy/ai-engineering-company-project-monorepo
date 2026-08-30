"""
core/database.py — Conexión asíncrona a PostgreSQL para telemetría

Gestiona el pool de conexiones asyncpg para la tabla telemetry_events.
Las conexiones se inicializan al arrancar la aplicación y se cierran al detenerla.

Uso:
    from core.database import get_pool, init_db, close_db
    pool = await init_db()
    # ... usar pool ...
    await close_db()
"""

from __future__ import annotations

import os
import logging

import asyncpg

logger = logging.getLogger(__name__)

# Pool global — se asigna en init_db()
_pool: asyncpg.Pool | None = None


def _get_dsn() -> str:
    """
    Construye el DSN desde variables de entorno.
    Prioridad:
      1. DATABASE_URL (completa)
      2. Componentes individuales DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
    """
    database_url = os.getenv("DATABASE_URL", "")
    if database_url:
        return database_url

    # Fallback a componentes individuales
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "telemetry")
    user = os.getenv("DB_USER", "app")
    password = os.getenv("DB_PASSWORD", "devpassword")

    return f"postgresql://{user}:{password}@{host}:{port}/{name}"


async def init_db() -> asyncpg.Pool:
    """
    Inicializa el pool de conexiones y crea la tabla telemetry_events si no existe.
    Debe llamarse en el startup event de FastAPI.
    """
    global _pool

    dsn = _get_dsn()
    # Ocultar la contraseña en los logs
    safe_dsn = dsn.split("@")
    if len(safe_dsn) > 1:
        safe_dsn[0] = safe_dsn[0].split(":")[0] + ":****"
        safe_dsn_str = "@".join(safe_dsn)
    else:
        safe_dsn_str = dsn
    logger.info("Initializing PostgreSQL pool — %s", safe_dsn_str)

    _pool = await asyncpg.create_pool(
        dsn=dsn,
        min_size=1,
        max_size=5,
        command_timeout=30,
    )

    # Crear tabla y índices si no existen
    await _ensure_schema()

    return _pool


async def _ensure_schema() -> None:
    """
    Crea la tabla telemetry_events y sus índices si no existen.
    La tabla es write-only (append-only): nunca se actualizan o borran eventos.
    """
    if not _pool:
        raise RuntimeError("Database pool not initialized")

    async with _pool.acquire() as conn:
        # ─────────────────────────────────────────────────────────────
        # Tabla telemetry_events
        # Columnas según especificación del proyecto:
        #   id         — uuid PK, default gen_random_uuid()
        #   timestamp  — timestamptz NOT NULL
        #   service    — text NOT NULL
        #   event_type — text NOT NULL
        #   level      — text default 'info'
        #   value      — numeric nullable
        #   message    — text nullable
        #   tags       — jsonb default '{}'
        # ─────────────────────────────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_events (
                id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "timestamp" timestamptz NOT NULL,
                service     text NOT NULL,
                event_type  text NOT NULL,
                level       text NOT NULL DEFAULT 'info',
                value       numeric,
                message     text,
                tags        jsonb NOT NULL DEFAULT '{}'::jsonb
            );
        """)

        # ─────────────────────────────────────────────────────────────
        # Índices requeridos:
        #   1. timestamp  (BTREE) — búsquedas por rango de fechas
        #   2. event_type (BTREE) — filtrado por tipo de evento
        #   3. tags       (GIN)   — búsquedas dentro de JSONB
        # ─────────────────────────────────────────────────────────────
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_telemetry_events_timestamp
                ON telemetry_events ("timestamp");
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_telemetry_events_event_type
                ON telemetry_events (event_type);
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_telemetry_events_tags
                ON telemetry_events USING GIN (tags);
        """)

        logger.info("Schema telemetry_events ensured (table + 3 indexes)")


async def get_pool() -> asyncpg.Pool:
    """
    Retorna el pool global de conexiones.
    Debe llamarse después de init_db().
    """
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db() first.")
    return _pool


async def close_db() -> None:
    """
    Cierra el pool de conexiones.
    Debe llamarse en el shutdown event de FastAPI.
    """
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL pool closed")
