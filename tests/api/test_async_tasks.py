"""
Suite de Pruebas Unitarias para Tareas Asíncronas, Celery, Dead Letter Queue y Auth Guard.
Ticket #DEV-55 — Colas de Mensajes y Tareas Asíncronas (Nexova Solutions).
"""

import os
import sys
import time
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Asegurar importaciones relativas
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.api.main import app
from services.api.routes.auth import get_current_user
from services.celery_app import celery_app, simulate_flaky_task
from services.dlq_service import ensure_dlq_table_exists, record_dlq_failure, get_dlq_record_by_task_id


@pytest.fixture(autouse=True)
def setup_test_env():
    """Configura Celery y DLQ para entorno de pruebas."""
    ensure_dlq_table_exists()
    celery_app.conf.update(
        task_always_eager=True,
        task_eager_propagates=False
    )
    yield


@pytest.fixture
def auth_client():
    """Cliente de pruebas con Auth Guard autenticado."""
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "admin-1",
        "email": "admin@nexova.com",
        "role": "admin"
    }
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def anon_client():
    """Cliente anónimo sin autenticación para verificar Auth Guard."""
    app.dependency_overrides.clear()
    with TestClient(app) as client:
        yield client


def test_auth_guard_required(anon_client):
    """
    Verifica que tanto el trigger de la tarea como el endpoint de consulta
    estén estrictamente protegidos por Auth Guard Standard (401 sin token).
    """
    res_trigger = anon_client.post("/reporting/trigger", json={})
    assert res_trigger.status_code == 401

    res_task = anon_client.get("/tasks/some-task-id")
    assert res_task.status_code == 401


def test_trigger_returns_202_under_200ms(auth_client):
    """
    Verifica que POST /reporting/trigger encole la tarea y devuelva 202 Accepted
    con task_id en menos de 200 ms.
    """
    mock_task = MagicMock()
    mock_task.id = "test-task-uuid-1234"

    with patch("services.reporting.routes.run_business_performance_pipeline.delay", return_value=mock_task):
        start = time.perf_counter()
        response = auth_client.post("/reporting/trigger", json={"window_date": "2025-01-15"})
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert response.status_code == 202
        data = response.json()
        assert data["task_id"] == "test-task-uuid-1234"
        assert data["status"] == "pending"
        assert "encolada" in data["message"].lower()

        # El criterio exige responder de forma inmediata (< 200ms)
        assert elapsed_ms < 200, f"Latencia excedida: {elapsed_ms:.2f}ms"


def test_get_task_status_lifecycle(auth_client):
    """
    Verifica que GET /tasks/{task_id} refleje los estados canónicos de Celery:
    pending, started, success, failure.
    """
    mock_async_result = MagicMock()

    with patch("services.api.routes.tasks.AsyncResult", return_value=mock_async_result):
        # 1. Estado Pending
        mock_async_result.status = "PENDING"
        mock_async_result.result = None
        res_pending = auth_client.get("/tasks/task-abc")
        assert res_pending.status_code == 200
        assert res_pending.json() == {"task_id": "task-abc", "status": "pending", "result": None}

        # 2. Estado Started
        mock_async_result.status = "STARTED"
        mock_async_result.result = None
        res_started = auth_client.get("/tasks/task-abc")
        assert res_started.status_code == 200
        assert res_started.json() == {"task_id": "task-abc", "status": "started", "result": None}

        # 3. Estado Success
        mock_async_result.status = "SUCCESS"
        mock_async_result.result = {"run_id": "run-1", "records_processed": 42}
        res_success = auth_client.get("/tasks/task-abc")
        assert res_success.status_code == 200
        data_success = res_success.json()
        assert data_success["status"] == "success"
        assert data_success["result"]["records_processed"] == 42

        # 4. Estado Failure
        mock_async_result.status = "FAILURE"
        mock_async_result.result = Exception("Database connection failure")
        res_failure = auth_client.get("/tasks/task-abc")
        assert res_failure.status_code == 200
        data_failure = res_failure.json()
        assert data_failure["status"] == "failure"
        assert "Database connection failure" in data_failure["result"]


def test_dead_letter_queue_persistence():
    """
    Verifica que al registrar un fallo definitivo en la Dead Letter Queue (DLQ),
    los datos persistan en base de datos con número de intentos y mensaje de error.
    """
    test_task_id = "failed-task-999"
    dlq_id = record_dlq_failure(
        task_id=test_task_id,
        task_name="services.celery_app.test_task",
        arguments={"date": "2025-01-15"},
        retry_count=3,
        error_message="Conexión agotada tras 3 reintentos"
    )

    assert dlq_id is not None

    record = get_dlq_record_by_task_id(test_task_id)
    assert record is not None
    assert record["task_id"] == test_task_id
    assert record["retry_count"] == 3
    assert "Conexión agotada" in record["error_message"]
    assert record["failed_at"] is not None


def test_simulate_flaky_task_dlq_integration():
    """
    Prueba que la tarea simulate_flaky_task cuando falla y supera max_retries
    dispara el registro en Dead Letter Queue.
    """
    unique_task_id = f"sim-{int(time.time())}"

    # Simular ejecución con fallo en el intento final
    with patch("services.celery_app.record_dlq_failure") as mock_record:
        task = simulate_flaky_task
        task.push_request(id=unique_task_id, retries=3)
        try:
            with pytest.raises(ValueError):
                task.run(should_fail=True, custom_id=unique_task_id)

            assert mock_record.called
            assert mock_record.call_args[1]["task_id"] == unique_task_id
            assert mock_record.call_args[1]["retry_count"] == 4
        finally:
            task.pop_request()

