"""
services/job_runner — Módulo de control de estado para ejecuciones programadas

Exporta la API pública del servicio job_runner:
    create_run, mark_processing, mark_completed, mark_failed,
    has_processing_lock, has_completed_for_date
"""

from services.job_runner.job_runner import (
    create_run,
    has_completed_for_date,
    has_processing_lock,
    mark_completed,
    mark_failed,
    mark_processing,
)

__all__ = [
    "create_run",
    "mark_processing",
    "mark_completed",
    "mark_failed",
    "has_processing_lock",
    "has_completed_for_date",
]