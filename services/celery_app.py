"""
Configuración del Módulo Celery para Procesamiento Asíncrono.
Ticket #DEV-55 — Colas de Mensajes y Tareas Asíncronas (Nexova Solutions).

Patrón Productor / Consumidor:
- Broker & Result Backend: Redis
- Dead Letter Queue: Integración con task_dlq
- Reintentos con Backoff Exponencial
"""

import os
import sys
import logging
from typing import Optional, Dict, Any
from celery import Celery

# Asegurar importaciones relativas desde la raíz del monorepo
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.dlq_service import record_dlq_failure

logger = logging.getLogger("nexova.celery")

# Configurar URLs de conexión para Redis Broker y Backend
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# Instancia de Celery
celery_app = Celery(
    "nexova_tasks",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
)

# Configuraciones de Estabilidad y Resiliencia
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,                 # ACK solo tras finalización exitosa
    worker_prefetch_multiplier=1,        # 1 mensaje a la vez por worker (fair dispatch)
    result_expires=86400,                # Resultados válidos por 24 horas
    task_track_started=True,             # Monitoreo del estado 'started' en Redis/Flower
)


@celery_app.task(
    name="services.celery_app.run_business_performance_pipeline",
    bind=True,
    max_retries=3,
    default_retry_delay=5
)
def run_business_performance_pipeline(self, target_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Tarea asíncrona pesada para orquestar el Business Performance Pipeline de Nexova.
    Encola la operación sin bloquear FastAPI y almacena el resultado en Redis.
    """
    task_id = self.request.id or "unknown"
    current_retry = self.request.retries
    logger.info(
        f"🚀 [Celery Worker] Iniciando pipeline de negocio [Task ID: {task_id}] | "
        f"Fecha objetivo: {target_date} | Intento: {current_retry + 1}/3"
    )

    try:
        from data.pipelines.pipeline import business_performance_flow
        result = business_performance_flow(target_date=target_date)
        logger.info(f"✅ [Celery Worker] Pipeline finalizado exitosamente [Task ID: {task_id}]")
        return result

    except Exception as exc:
        logger.warning(f"⚠️ [Celery Worker] Fallo en intento {current_retry + 1}/3 para task {task_id}: {exc}")

        if current_retry >= self.max_retries:
            # Enviar a Dead Letter Queue tras agotar 3 reintentos
            record_dlq_failure(
                task_id=task_id,
                task_name=self.name,
                arguments={"target_date": target_date},
                retry_count=current_retry + 1,
                error_message=str(exc)
            )
            raise exc
        else:
            # Backoff exponencial: 5s, 10s, 20s
            countdown = (2 ** current_retry) * 5
            logger.info(f"⏳ [Celery Worker] Programando reintento {current_retry + 1} en {countdown}s para task {task_id}")
            raise self.retry(exc=exc, countdown=countdown)


@celery_app.task(
    name="services.celery_app.simulate_flaky_task",
    bind=True,
    max_retries=3,
    default_retry_delay=2
)
def simulate_flaky_task(self, should_fail: bool = True, custom_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Tarea auxiliar para pruebas automatizadas y demostración de Flower / DLQ.
    Permite probar el flujo de fallos repetidos y caída definitiva en task_dlq.
    """
    task_id = self.request.id or "sim-task"
    current_retry = self.request.retries
    logger.info(f"🧪 [Simulate Task] Task {task_id} | Intento {current_retry + 1}/3 | should_fail={should_fail}")

    if should_fail:
        err = ValueError(f"Fallo forzado para verificación de DLQ (Intento {current_retry + 1})")
        if current_retry >= self.max_retries:
            record_dlq_failure(
                task_id=task_id,
                task_name=self.name,
                arguments={"should_fail": should_fail, "custom_id": custom_id},
                retry_count=current_retry + 1,
                error_message=str(err)
            )
            raise err
        countdown = (2 ** current_retry) * 2
        raise self.retry(exc=err, countdown=countdown)

    return {"status": "SUCCESS", "task_id": task_id, "custom_id": custom_id}


if __name__ == "__main__":
    print(f"Módulo Celery configurado. Broker: {BROKER_URL} | Backend: {RESULT_BACKEND}")
