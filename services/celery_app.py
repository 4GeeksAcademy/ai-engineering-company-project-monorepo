"""
Configuración del Módulo Celery para Procesamiento Asíncrono.
Ticket #DEV-55 — Colas de Mensajes y Tareas Asíncronas (Nexova Solutions).

Patrón Productor / Consumidor:
- Broker & Result Backend: Redis
- Dead Letter Queue: Integración con task_dlq
- Reintentos con Backoff Exponencial
- Timeouts (Hard & Soft) y Trazabilidad con Tracebacks
"""

import os
import sys
import time
import logging
import traceback
from typing import Optional, Dict, Any
from celery import Celery
from celery.exceptions import SoftTimeLimitExceeded

# Asegurar importaciones relativas desde la raíz del monorepo
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.dlq_service import record_dlq_failure

logger = logging.getLogger("nexova.celery")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

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

# Alias para compatibilidad con CLI de Celery (-A services.celery_app)
app = celery_app
celery = celery_app

# Configuraciones de Estabilidad, Resiliencia y Timeouts
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
    task_time_limit=300,                 # Hard timeout: 5 minutos
    task_soft_time_limit=270,            # Soft timeout: 4.5 minutos (SoftTimeLimitExceeded)
)


@celery_app.task(
    name="services.celery_app.run_business_performance_pipeline",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    time_limit=300,
    soft_time_limit=270
)
def run_business_performance_pipeline(self, target_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Tarea asíncrona pesada para orquestar el Business Performance Pipeline de Nexova.
    Encola la operación sin bloquear FastAPI y almacena el resultado en Redis.
    """
    task_id = self.request.id or "unknown"
    current_retry = self.request.retries
    start_time = time.time()

    logger.info(
        f"🚀 [Celery Worker] Iniciando pipeline de negocio [Task ID: {task_id}] | "
        f"Fecha objetivo: {target_date} | Intento: {current_retry + 1}/3"
    )

    try:
        if BASE_DIR not in sys.path:
            sys.path.insert(0, BASE_DIR)
        from data.pipelines.pipeline import business_performance_flow
        result = business_performance_flow(target_date=target_date)
        duration = time.time() - start_time
        logger.info(
            f"✅ [Celery Worker] Pipeline finalizado exitosamente [Task ID: {task_id}] | " 
            f"Estado: SUCCESS | Duración: {duration:.2f}s"
        )
        return result

    except SoftTimeLimitExceeded as exc:
        duration = time.time() - start_time
        tb = traceback.format_exc()
        logger.error(
            f"⏰ [Celery Worker] Soft time limit excedido (270s) [Task ID: {task_id}] | "
            f"Estado: FAILURE | Duración: {duration:.2f}s\nTraceback:\n{tb}"
        )
        record_dlq_failure(
            task_id=task_id,
            task_name=self.name,
            arguments={"target_date": target_date},
            retry_count=current_retry + 1,
            error_message=f"SoftTimeLimitExceeded: {exc}\n{tb}"
        )
        raise exc

    except Exception as exc:
        duration = time.time() - start_time
        tb = traceback.format_exc()
        status_name = "FAILURE" if current_retry >= self.max_retries else "RETRY"
        logger.error(
            f"❌ [Celery Worker] Fallo en intento {current_retry + 1}/3 [Task ID: {task_id}] | "
            f"Estado: {status_name} | Duración: {duration:.2f}s | Error: {exc}\nTraceback:\n{tb}"
        )

        if current_retry >= self.max_retries:
            # Enviar a Dead Letter Queue tras agotar 3 reintentos
            record_dlq_failure(
                task_id=task_id,
                task_name=self.name,
                arguments={"target_date": target_date},
                retry_count=current_retry + 1,
                error_message=f"{exc}\n{tb}"
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
    default_retry_delay=2,
    time_limit=60,
    soft_time_limit=45
)
def simulate_flaky_task(self, should_fail: bool = True, custom_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Tarea auxiliar para pruebas automatizadas y demostración de Flower / DLQ.
    Permite probar el flujo de fallos repetidos y caída definitiva en task_dlq.
    """
    task_id = self.request.id or "sim-task"
    current_retry = self.request.retries
    start_time = time.time()

    logger.info(f"🧪 [Simulate Task] Task {task_id} | Intento {current_retry + 1}/3 | should_fail={should_fail}")

    if should_fail:
        err = ValueError(f"Fallo forzado para verificación de DLQ (Intento {current_retry + 1})")
        duration = time.time() - start_time
        tb = traceback.format_exc()
        status_name = "FAILURE" if current_retry >= self.max_retries else "RETRY"

        logger.warning(
            f"⚠️ [Simulate Task] Fallo provocado en intento {current_retry + 1}/3 [Task ID: {task_id}] | "
            f"Estado: {status_name} | Duración: {duration:.2f}s\nTraceback:\n{tb}"
        )

        if current_retry >= self.max_retries:
            record_dlq_failure(
                task_id=task_id,
                task_name=self.name,
                arguments={"should_fail": should_fail, "custom_id": custom_id},
                retry_count=current_retry + 1,
                error_message=f"{err}\n{tb}"
            )
            raise err
        countdown = (2 ** current_retry) * 2
        raise self.retry(exc=err, countdown=countdown)

    duration = time.time() - start_time
    logger.info(f"✅ [Simulate Task] Finalizado [Task ID: {task_id}] | Estado: SUCCESS | Duración: {duration:.2f}s")
    return {"status": "SUCCESS", "task_id": task_id, "custom_id": custom_id}


if __name__ == "__main__":
    print(f"Módulo Celery configurado. Broker: {BROKER_URL} | Backend: {RESULT_BACKEND}")
