"""Celery application for Message Queues and Async Tasks.

Redis (``REDIS_URL``) is used as both the message broker and the result backend
so the API and workers share the same broker instance.

Heavy API operation wrapped as a task: ``POST /reporting/pipeline-runs`` →
``services.tasks.run_weekly_pipeline``.
"""
from __future__ import annotations

import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "brasaland",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Emit events so Flower can show queued / started / completed tasks.
    worker_send_task_events=True,
    task_send_sent_event=True,
    # Broker connection comes from REDIS_URL only (shared by API + workers).
    broker_connection_retry_on_startup=True,
)

# Register task modules with the worker.
import services.tasks  # noqa: E402,F401
