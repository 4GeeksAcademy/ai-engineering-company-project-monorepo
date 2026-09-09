"""
job_runner.py — Servicio de control de estado para ejecuciones programadas

Propósito:
    Módulo que encapsula todo el acceso a la tabla job_runs (SQLite).
    Implementa la máquina de estados:
        pending → processing → completed
                             ↘ failed

    El estado 'processing' actúa como distributed lock natural:
    - Si existe un registro 'processing' para el job, otra instancia aborta.
    - No hay tabla/columna lock aparte.

    job_runs ≠ pipeline_runs (ver documentación del proyecto).

Uso:
    from services.job_runner.job_runner import (
        create_run,
        mark_processing,
        mark_completed,
        mark_failed,
        has_processing_lock,
        has_completed_for_date,
    )

    run_id = create_run("nightly_export", "2026-09-08")
    if has_processing_lock("nightly_export"):
        print("Ya hay una ejecución en curso")
"""

from __future__ import annotations

import logging
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Constantes
# ─────────────────────────────────────────────────────────────

STATUS_PENDING = "pending"
STATUS_PROCESSING = "processing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"

VALID_STATUSES = {STATUS_PENDING, STATUS_PROCESSING, STATUS_COMPLETED, STATUS_FAILED}

# Nombre base del archivo de base de datos
JOB_RUNS_DB_NAME = "job_runs.db"


# ─────────────────────────────────────────────────────────────
# Helpers de conexión
# ─────────────────────────────────────────────────────────────


def _get_db_path() -> Path:
    """
    Resuelve la ruta a job_runs.db.

    Sigue la misma convención que data/pipelines/database.py:
    - Por defecto: data/pipelines/job_runs.db
    - Override vía variable de entorno PIPELINES_DB_DIR
    """
    env_dir = Path(__file__).resolve().parent.parent.parent  # services/ -> raíz del repo
    pipelines_root = env_dir / "data" / "pipelines"

    override = __import__("os").environ.get("PIPELINES_DB_DIR")
    if override:
        base = Path(override)
    else:
        base = pipelines_root

    return base / JOB_RUNS_DB_NAME


def _get_connection() -> sqlite3.Connection:
    """
    Retorna una conexión a job_runs.db con row_factory configurado.
    """
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


# ─────────────────────────────────────────────────────────────
# Funciones de la API pública
# ─────────────────────────────────────────────────────────────


def create_run(job_name: str, target_date: str) -> str:
    """
    Crea un registro en job_runs con status='pending'.

    Args:
        job_name: Nombre del job (ej. 'nightly_export')
        target_date: Fecha objetivo en formato YYYY-MM-DD

    Returns:
        ID del registro creado (UUID v4)
    """
    run_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn = _get_connection()
    try:
        conn.execute(
            """
            INSERT INTO job_runs (id, job_name, target_date, status, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (run_id, job_name, target_date, STATUS_PENDING, now),
        )
        conn.commit()
        logger.debug("Created run %s for job=%s target_date=%s", run_id, job_name, target_date)
        return run_id
    finally:
        conn.close()


def mark_processing(run_id: str) -> None:
    """
    Transiciona un registro a status='processing' con started_at.

    Args:
        run_id: ID del registro a actualizar
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = _get_connection()
    try:
        conn.execute(
            """
            UPDATE job_runs
            SET status = ?, started_at = ?
            WHERE id = ?
            """,
            (STATUS_PROCESSING, now, run_id),
        )
        conn.commit()
    finally:
        conn.close()


def mark_completed(run_id: str) -> None:
    """
    Transiciona un registro a status='completed' con finished_at.

    Args:
        run_id: ID del registro a actualizar
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = _get_connection()
    try:
        conn.execute(
            """
            UPDATE job_runs
            SET status = ?, finished_at = ?
            WHERE id = ?
            """,
            (STATUS_COMPLETED, now, run_id),
        )
        conn.commit()
    finally:
        conn.close()


def mark_failed(run_id: str, error_message: str) -> None:
    """
    Transiciona un registro a status='failed' con finished_at y mensaje de error.

    Args:
        run_id: ID del registro a actualizar
        error_message: Mensaje descriptivo del error
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = _get_connection()
    try:
        conn.execute(
            """
            UPDATE job_runs
            SET status = ?, finished_at = ?, error_message = ?
            WHERE id = ?
            """,
            (STATUS_FAILED, now, error_message, run_id),
        )
        conn.commit()
    finally:
        conn.close()


def has_processing_lock(job_name: str) -> bool:
    """
    Verifica si existe un registro 'processing' activo para el job.

    Esta es la implementación del distributed lock:
    - Si retorna True, otra instancia está ejecutándose.
    - El lock se libera automáticamente cuando el registro pasa a
      'completed' o 'failed'.
    - No hay tabla, columna o mecanismo lock aparte.

    Args:
        job_name: Nombre del job a verificar

    Returns:
        True si existe algún registro con status='processing' para ese job
    """
    conn = _get_connection()
    try:
        cursor = conn.execute(
            "SELECT COUNT(*) as cnt FROM job_runs WHERE job_name = ? AND status = ?",
            (job_name, STATUS_PROCESSING),
        )
        row = cursor.fetchone()
        return row["cnt"] > 0
    finally:
        conn.close()


def has_completed_for_date(job_name: str, target_date: str) -> bool:
    """
    Verifica si ya existe un registro 'completed' para (job, target_date).

    Esta es la implementación de la idempotencia:
    - Si retorna True, el trabajo ya se completó para esa fecha.
    - El script debe omitir la exportación y el pipeline.

    Args:
        job_name: Nombre del job
        target_date: Fecha objetivo en formato YYYY-MM-DD

    Returns:
        True si existe un registro 'completed' para (job_name, target_date)
    """
    conn = _get_connection()
    try:
        cursor = conn.execute(
            "SELECT COUNT(*) as cnt FROM job_runs WHERE job_name = ? AND target_date = ? AND status = ?",
            (job_name, target_date, STATUS_COMPLETED),
        )
        row = cursor.fetchone()
        return row["cnt"] > 0
    finally:
        conn.close()