"""
Servicio de Dead Letter Queue (DLQ) para Tareas Asíncronas con Celery.
Ticket #DEV-55 — Colas de Mensajes y Tareas Asíncronas (Nexova Solutions).

Registra fallos permanentes tras agotar el umbral de reintentos (max_retries=3).
"""

import os
import sys
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import text

# Asegurar importaciones relativas desde la raíz del monorepo
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.api.database import engine

logger = logging.getLogger("nexova.dlq_service")


def ensure_dlq_table_exists() -> None:
    """
    Crea la tabla task_dlq y sus índices si no existen.
    Garantiza compatibilidad entre PostgreSQL (Supabase) y SQLite.
    """
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if dialect == "postgresql":
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS public.task_dlq (
                    id UUID PRIMARY KEY,
                    task_id VARCHAR(100) NOT NULL,
                    task_name VARCHAR(150) NOT NULL,
                    arguments TEXT,
                    retry_count INTEGER NOT NULL,
                    error_message TEXT NOT NULL,
                    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_task_dlq_task_id 
                    ON public.task_dlq (task_id);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_task_dlq_failed_at 
                    ON public.task_dlq (failed_at);
            """))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS task_dlq (
                    id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    task_name TEXT NOT NULL,
                    arguments TEXT,
                    retry_count INTEGER NOT NULL,
                    error_message TEXT NOT NULL,
                    failed_at TEXT NOT NULL
                );
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_task_dlq_task_id 
                    ON task_dlq (task_id);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_task_dlq_failed_at 
                    ON task_dlq (failed_at);
            """))
    logger.debug("✅ Tabla task_dlq verificada/creada correctamente.")


def record_dlq_failure(
    task_id: str,
    task_name: str,
    arguments: Any,
    retry_count: int,
    error_message: str
) -> str:
    """
    Registra un fallo definitivo en la Dead Letter Queue tras agotarse los reintentos.
    Retorna el dlq_id generado.
    """
    ensure_dlq_table_exists()
    dlq_id = str(uuid.uuid4())
    now_utc = datetime.now(timezone.utc)

    # Serializar argumentos a JSON seguro
    if isinstance(arguments, (dict, list)):
        args_str = json.dumps(arguments, default=str)
    else:
        args_str = str(arguments)

    query = text("""
        INSERT INTO task_dlq (id, task_id, task_name, arguments, retry_count, error_message, failed_at)
        VALUES (:id, :task_id, :task_name, :arguments, :retry_count, :error_message, :failed_at)
    """)

    with engine.begin() as conn:
        conn.execute(query, {
            "id": dlq_id,
            "task_id": str(task_id),
            "task_name": str(task_name),
            "arguments": args_str,
            "retry_count": int(retry_count),
            "error_message": str(error_message),
            "failed_at": now_utc
        })

    logger.error(
        f"🚨 [DLQ REGISTRADO] Task '{task_name}' [{task_id}] enviada a Dead Letter Queue "
        f"tras {retry_count} reintentos fallidos. Error: {error_message}"
    )
    return dlq_id


def get_dlq_records(limit: int = 50) -> List[Dict[str, Any]]:
    """Obtiene los últimos registros ingresados a la Dead Letter Queue."""
    ensure_dlq_table_exists()
    query = text("SELECT * FROM task_dlq ORDER BY failed_at DESC LIMIT :limit")
    with engine.connect() as conn:
        rows = conn.execute(query, {"limit": limit}).mappings().all()
        return [dict(r) for r in rows]


def get_dlq_record_by_task_id(task_id: str) -> Optional[Dict[str, Any]]:
    """Busca una tarea en la Dead Letter Queue por task_id."""
    ensure_dlq_table_exists()
    query = text("SELECT * FROM task_dlq WHERE task_id = :task_id LIMIT 1")
    with engine.connect() as conn:
        row = conn.execute(query, {"task_id": str(task_id)}).mappings().first()
        return dict(row) if row else None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Inicializando tabla task_dlq...")
    ensure_dlq_table_exists()
    print("Tabla task_dlq lista.")
