r"""
Módulo de Control de Estado y Bloqueo Distribuido para Tareas en Segundo Plano.
Ticket #DEV-53 — Procesos en Segundo Plano (Nexova Solutions).

Máquina de estados canónica:
    pending -> processing -> completed
           \-> failed
"""

import os
import sys
import uuid
import logging
from contextlib import contextmanager
from datetime import datetime, timezone, date
from typing import Optional, Dict, Any, Union
from sqlalchemy import text

# Asegurar importaciones relativas desde la raíz del monorepo
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from services.api.database import engine

logger = logging.getLogger("nexova.job_runner")


def ensure_job_runs_table_exists() -> None:
    """
    Crea la tabla job_runs y sus índices correspondientes si no existen.
    Garantiza compatibilidad dual entre PostgreSQL (Supabase) y SQLite local.
    """
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if dialect == "postgresql":
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS public.job_runs (
                    id UUID PRIMARY KEY,
                    job_name VARCHAR(100) NOT NULL,
                    target_date DATE NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    started_at TIMESTAMPTZ,
                    finished_at TIMESTAMPTZ,
                    error_message TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_job_runs_name_date 
                    ON public.job_runs (job_name, target_date);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_job_runs_status 
                    ON public.job_runs (job_name, status);
            """))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS job_runs (
                    id TEXT PRIMARY KEY,
                    job_name TEXT NOT NULL,
                    target_date TEXT NOT NULL,
                    status TEXT NOT NULL,
                    started_at TEXT,
                    finished_at TEXT,
                    error_message TEXT,
                    created_at TEXT NOT NULL
                );
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_job_runs_name_date 
                    ON job_runs (job_name, target_date);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_job_runs_status 
                    ON job_runs (job_name, status);
            """))
    logger.debug("✅ Tabla job_runs verificada/creada correctamente en la base de datos.")


def _normalize_date_str(target_date: Union[date, str]) -> str:
    """Convierte un objeto date o string a formato YYYY-MM-DD."""
    if isinstance(target_date, date):
        return target_date.strftime("%Y-%m-%d")
    return str(target_date).strip()


def has_processing_lock(job_name: str) -> bool:
    """
    Comprueba si existe un bloqueo distribuido activo (estado 'processing')
    para el job indicado.
    Si ya existe un proceso ejecutándose, retorna True.
    """
    ensure_job_runs_table_exists()
    query = text("""
        SELECT id FROM job_runs 
        WHERE job_name = :job_name AND status = 'processing'
        LIMIT 1
    """)
    with engine.connect() as conn:
        row = conn.execute(query, {"job_name": job_name}).first()
        return row is not None


def has_completed_for_date(job_name: str, target_date: Union[date, str]) -> bool:
    """
    Comprueba si ya existe una ejecución finalizada con éxito ('completed')
    para el job y la fecha objetivo especificados (Idempotencia).
    """
    ensure_job_runs_table_exists()
    date_str = _normalize_date_str(target_date)
    query = text("""
        SELECT id FROM job_runs 
        WHERE job_name = :job_name 
          AND target_date = :target_date 
          AND status = 'completed'
        LIMIT 1
    """)
    with engine.connect() as conn:
        row = conn.execute(query, {
            "job_name": job_name,
            "target_date": date_str
        }).first()
        return row is not None


def create_job_run(job_name: str, target_date: Union[date, str], initial_status: str = "pending") -> str:
    """
    Registra una nueva ejecución en estado 'pending' (o el inicial indicado).
    Retorna el run_id generado.
    """
    ensure_job_runs_table_exists()
    run_id = str(uuid.uuid4())
    date_str = _normalize_date_str(target_date)
    now_utc = datetime.now(timezone.utc)

    query = text("""
        INSERT INTO job_runs (id, job_name, target_date, status, created_at)
        VALUES (:id, :job_name, :target_date, :status, :created_at)
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "id": run_id,
            "job_name": job_name,
            "target_date": date_str,
            "status": initial_status,
            "created_at": now_utc
        })
    logger.info(f"📝 Registro job_run creado: [ID: {run_id}] | Job: '{job_name}' | Fecha: {date_str} | Estado: {initial_status}")
    return run_id


def transition_to_processing(run_id: str) -> None:
    """
    Transiciona una ejecución existente al estado 'processing' y fija started_at.
    Este estado actúa formalmente como el distributed lock.
    """
    now_utc = datetime.now(timezone.utc)
    query = text("""
        UPDATE job_runs
        SET status = 'processing', started_at = :started_at
        WHERE id = :id
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "id": run_id,
            "started_at": now_utc
        })
    logger.info(f"🔒 Transición a 'processing' (Lock adquirido) [ID: {run_id}]")


def mark_completed(run_id: str) -> None:
    """
    Marca la ejecución como 'completed' y fija finished_at.
    Libera el distributed lock.
    """
    now_utc = datetime.now(timezone.utc)
    query = text("""
        UPDATE job_runs
        SET status = 'completed', finished_at = :finished_at
        WHERE id = :id
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "id": run_id,
            "finished_at": now_utc
        })
    logger.info(f"✅ Transición a 'completed' (Lock liberado) [ID: {run_id}]")


def mark_failed(run_id: str, error_message: str) -> None:
    """
    Marca la ejecución como 'failed', fija finished_at y registra el mensaje de error.
    Garantiza que ningún registro quede como zombi en 'processing'.
    """
    now_utc = datetime.now(timezone.utc)
    query = text("""
        UPDATE job_runs
        SET status = 'failed', finished_at = :finished_at, error_message = :error_message
        WHERE id = :id
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "id": run_id,
            "finished_at": now_utc,
            "error_message": str(error_message)
        })
    logger.error(f"❌ Transición a 'failed' [ID: {run_id}]: {error_message}")


def get_job_run(run_id: str) -> Optional[Dict[str, Any]]:
    """Obtiene los detalles de un registro de job_run por ID."""
    ensure_job_runs_table_exists()
    query = text("SELECT * FROM job_runs WHERE id = :id")
    with engine.connect() as conn:
        row = conn.execute(query, {"id": run_id}).mappings().first()
        if row:
            return dict(row)
        return None


@contextmanager
def managed_job_run(job_name: str, target_date: Union[date, str]):
    """
    Manejador de contexto defensivo para la ejecución de tareas.
    Ciclo de vida garantizado:
      1. Registra 'pending'.
      2. Pasa a 'processing' (adquiere lock).
      3. Ejecuta el bloque del usuario.
      4. Si ocurre excepción, pasa automáticamente a 'failed' con mensaje de error.
      5. Si termina con éxito, pasa a 'completed'.
    """
    run_id = create_job_run(job_name, target_date, initial_status="pending")
    transition_to_processing(run_id)
    try:
        yield run_id
        mark_completed(run_id)
    except Exception as exc:
        mark_failed(run_id, str(exc))
        raise exc


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    ensure_job_runs_table_exists()
    test_date = date.today().strftime("%Y-%m-%d")
    print(f"Estado de lock para 'nightly_export': {has_processing_lock('nightly_export')}")
    print(f"Estado de completado para 'nightly_export' en {test_date}: {has_completed_for_date('nightly_export', test_date)}")
