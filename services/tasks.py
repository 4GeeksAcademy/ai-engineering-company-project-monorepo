from __future__ import annotations

import csv
import json
import logging
import time
import traceback
from io import StringIO
from typing import Any
from pathlib import Path

from celery import Task
from tinydb import TinyDB, Query

from services.celery_app import celery_app

logger = logging.getLogger("celery.tasks")

# ─────────────────────────────────────────────────────────────
# Dead Letter Queue (DLQ) — TinyDB persistente
# ─────────────────────────────────────────────────────────────

DLQ_DB_PATH = Path(__file__).resolve().parent.parent / "api" / "dlq.json"
dlq_db = TinyDB(str(DLQ_DB_PATH))
dlq_table = dlq_db.table("dead_letter_queue")
DLQEntry = Query()


def push_to_dlq(task_id: str, task_name: str, exc_info: str, payload: dict | None = None, attempts: int = 0) -> None:
    """Almacena una tarea fallida en la Dead Letter Queue para revisión manual."""
    dlq_table.insert({
        "task_id": task_id,
        "task_name": task_name,
        "failed_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "error": exc_info,
        "payload": payload or {},
        "attempts": attempts,
        "status": "pending_review",
    })
    logger.warning("[DLQ] Task %s (%s) moved to DLQ after %d attempt(s)", task_id, task_name, attempts)


def get_dlq_entries(limit: int = 50) -> list[dict]:
    """Retorna entradas de la DLQ, ordenadas por fecha descendente."""
    entries = dlq_table.all()
    entries.sort(key=lambda e: e.get("failed_at", ""), reverse=True)
    return entries[:limit]


def retry_dlq_entry(doc_id: int) -> bool:
    """Marca una entrada DLQ para reintento (se reencolará manualmente)."""
    return dlq_table.update({"status": "queued_for_retry"}, doc_ids=[doc_id])


# ─────────────────────────────────────────────────────────────
# BaseTask con DLQ automática
# ─────────────────────────────────────────────────────────────

class DLQTask(Task):
    """Task base que envía fallos automáticamente a la Dead Letter Queue."""

    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Cuando una tarea falla tras max_retries, la registramos en la DLQ."""
        request = self.request
        push_to_dlq(
            task_id=task_id,
            task_name=self.name,
            exc_info=str(exc),
            payload={"args": str(args), "kwargs": str(kwargs)},
            attempts=request.retries + 1,
        )
        super().on_failure(exc, task_id, args, kwargs, einfo)


# ─────────────────────────────────────────────────────────────
# Tarea: analyze_incidents_task
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    base=DLQTask,
    name="analyze_incidents",
    max_retries=3,
    default_retry_delay=10,  # segundos entre reintentos
    acks_late=True,
)
def analyze_incidents_task(self, csv_content: str, filename: str | None = None) -> dict[str, Any]:
    """
    Tarea Celery que analiza un CSV de incidencias de forma asíncrona.

    Args:
        csv_content: Contenido crudo del CSV en texto.
        filename: Nombre original del archivo (solo para logging).

    Returns:
        Diccionario con el resultado del análisis (mismo formato que analyzer.analyze_incidents).
    """
    _start = time.perf_counter()
    task_id = self.request.id
    attempt = self.request.retries + 1

    logger.info("[%s] Starting analysis (attempt %d) for file: %s", task_id, attempt, filename or "unknown")

    try:
        # Importamos aquí para evitar dependencias circulares
        from services.api.analyzer import parse_csv_text, analyze_incidents

        rows = parse_csv_text(csv_content)
        if not rows:
            raise ValueError("CSV has no data rows")

        result = analyze_incidents(rows)

        duration = (time.perf_counter() - _start) * 1000
        logger.info(
            "[%s] Analysis SUCCESS (attempt %d) | %d records (%d valid, %d invalid) | %.1fms",
            task_id,
            attempt,
            result["total_records"],
            result["valid_records"],
            result["invalid_records"],
            duration,
        )

        return result

    except Exception as exc:
        duration = (time.perf_counter() - _start) * 1000
        logger.error(
            "[%s] Analysis FAILURE (attempt %d) after %.1fms: %s",
            task_id,
            attempt,
            duration,
            exc,
        )
        traceback.print_exc()

        # Backoff exponencial: 10s, 30s, 90s
        countdown = 10 * (3 ** (self.request.retries))
        raise self.retry(exc=exc, countdown=countdown)