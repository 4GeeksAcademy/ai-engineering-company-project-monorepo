from __future__ import annotations

import os

from celery import Celery

# Broker y backend apuntan a Redis (mismo contenedor del docker-compose)
# Se lee de variable de entorno REDIS_URL, con fallback a localhost
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "trackflow",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["services.tasks"],
)

# Configuración opcional
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Reintentos automáticos para tareas críticas
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    task_store_errors_even_if_ignored=True,
)