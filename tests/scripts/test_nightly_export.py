"""
Suite de Pruebas Unitarias para el Script Nocturno de Telemetría (Ticket #DEV-53).
Nexova Solutions — Procesos en Segundo Plano.

Valida:
1. Máquina de estados completa: pending -> processing -> completed | failed.
2. Distributed lock nativo vía estado 'processing'.
3. Idempotencia diaria por target_date.
4. Resiliencia y garantía de cero zombis ante excepciones.
5. Resolución flexible de target_date (CLI, ENV, UTC yesterday).
"""

import os
import sys
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine, text

# Asegurar importaciones relativas
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import services.job_runner as jr
import scripts.nightly_export as ne


@pytest.fixture
def mock_db(tmp_path, monkeypatch):
    """
    Crea una base de datos SQLite aislada en memoria para cada test,
    garantizando cero llamadas a red y aislamiento total.
    """
    db_file = tmp_path / "test_jobs.db"
    test_engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})

    # Sobrescribir el engine en los módulos
    monkeypatch.setattr(jr, "engine", test_engine)
    monkeypatch.setattr(ne, "engine", test_engine)

    # Crear tablas
    with test_engine.begin() as conn:
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
            CREATE TABLE IF NOT EXISTS telemetry_events (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                tags TEXT
            );
        """))

    yield test_engine


def test_resolve_target_date_from_env(monkeypatch):
    """Verifica que TARGET_DATE en variable de entorno tenga precedencia sobre el cálculo por defecto."""
    monkeypatch.setenv("TARGET_DATE", "2025-01-20")
    monkeypatch.setattr(sys, "argv", ["nightly_export.py"])
    assert ne.resolve_target_date() == "2025-01-20"


def test_resolve_target_date_from_cli_arg(monkeypatch):
    """Verifica que el argumento de línea de comandos tenga la máxima prioridad."""
    monkeypatch.setenv("TARGET_DATE", "2025-01-20")
    monkeypatch.setattr(sys, "argv", ["nightly_export.py", "2025-02-15"])
    assert ne.resolve_target_date() == "2025-02-15"


def test_resolve_target_date_default_yesterday(monkeypatch):
    """Verifica el cálculo por defecto de ayer en UTC cuando no hay parámetros."""
    monkeypatch.delenv("TARGET_DATE", raising=False)
    monkeypatch.setattr(sys, "argv", ["nightly_export.py"])
    expected = (datetime.now(timezone.utc) - timedelta(days=1)).date().strftime("%Y-%m-%d")
    assert ne.resolve_target_date() == expected


def test_successful_flow(mock_db, tmp_path, monkeypatch):
    """
    Test 1: Flujo exitoso completo.
    - Exporta CSV a data/raw/.
    - Dispara subproceso.
    - Transiciona a 'completed'.
    """
    target_date = "2025-03-10"
    monkeypatch.setenv("TARGET_DATE", target_date)
    monkeypatch.setattr(sys, "argv", ["nightly_export.py"])

    # Sembrar evento en telemetry_events
    with mock_db.begin() as conn:
        conn.execute(text("""
            INSERT INTO telemetry_events (id, timestamp, event_type, tags)
            VALUES ('evt-1', '2025-03-10 14:30:00', 'support_ticket_resolved', '{"ticket_id": "T1"}')
        """))

    # Sobrescribir BASE_DIR de ne para usar directorio temporal para el CSV
    monkeypatch.setattr(ne, "BASE_DIR", str(tmp_path))

    # Mock del subproceso para verificar su invocación
    mock_subprocess = MagicMock()
    mock_subprocess.returncode = 0
    mock_subprocess.stdout = "Pipeline OK"
    mock_subprocess.stderr = ""
    with patch("subprocess.run", return_value=mock_subprocess) as mock_run:
        exit_code = ne.main()
        assert exit_code == 0
        assert mock_run.called

    # Verificar existencia y contenido del CSV
    csv_file = tmp_path / "data" / "raw" / f"telemetry_{target_date}.csv"
    assert csv_file.exists()
    content = csv_file.read_text()
    assert "evt-1" in content

    # Verificar estado en job_runs
    with mock_db.connect() as conn:
        row = conn.execute(text("SELECT * FROM job_runs WHERE target_date = :td"), {"td": target_date}).mappings().first()
        assert row is not None
        assert row["status"] == "completed"
        assert row["started_at"] is not None
        assert row["finished_at"] is not None
        assert row["error_message"] is None


def test_distributed_lock_aborts_silently(mock_db, monkeypatch):
    """
    Test 2: Distributed lock.
    Si ya existe una instancia en 'processing', aborta silenciosamente con código 0.
    """
    target_date = "2025-03-11"
    monkeypatch.setenv("TARGET_DATE", target_date)
    monkeypatch.setattr(sys, "argv", ["nightly_export.py"])

    # Insertar ejecución previa que aún está en processing
    with mock_db.begin() as conn:
        conn.execute(text("""
            INSERT INTO job_runs (id, job_name, target_date, status, started_at, created_at)
            VALUES ('lock-id', 'nightly_export', '2025-03-11', 'processing', '2025-03-11 02:00:00', '2025-03-11 02:00:00')
        """))

    with patch("subprocess.run") as mock_run:
        exit_code = ne.main()
        # Aborto silencioso: returncode 0 y el subproceso NUNCA se invoca
        assert exit_code == 0
        mock_run.assert_not_called()


def test_idempotency_by_target_date(mock_db, monkeypatch):
    """
    Test 3: Idempotencia diaria.
    Si ya existe un registro 'completed' para la fecha, omite la ejecución con código 0.
    """
    target_date = "2025-03-12"
    monkeypatch.setenv("TARGET_DATE", target_date)
    monkeypatch.setattr(sys, "argv", ["nightly_export.py"])

    # Insertar ejecución ya completada para esa fecha
    with mock_db.begin() as conn:
        conn.execute(text("""
            INSERT INTO job_runs (id, job_name, target_date, status, started_at, finished_at, created_at)
            VALUES ('done-id', 'nightly_export', '2025-03-12', 'completed', '2025-03-12 02:00:00', '2025-03-12 02:05:00', '2025-03-12 02:00:00')
        """))

    with patch("subprocess.run") as mock_run:
        exit_code = ne.main()
        assert exit_code == 0
        mock_run.assert_not_called()


def test_resilience_zero_zombies_on_failure(mock_db, tmp_path, monkeypatch):
    """
    Test 4: Resiliencia y Cero Zombis.
    Si el subproceso falla, el estado en job_runs transiciona forzosamente a 'failed'
    con el mensaje de error y el script termina con código 1.
    """
    target_date = "2025-03-13"
    monkeypatch.setenv("TARGET_DATE", target_date)
    monkeypatch.setattr(sys, "argv", ["nightly_export.py"])
    monkeypatch.setattr(ne, "BASE_DIR", str(tmp_path))

    # Forzar fallo simulado en subprocess.run
    mock_fail = MagicMock()
    mock_fail.returncode = 1
    mock_fail.stdout = ""
    mock_fail.stderr = "Crash de memoria o BD inaccesible"
    with patch("subprocess.run", return_value=mock_fail):
        exit_code = ne.main()
        assert exit_code == 1

    # Verificar que el registro quedó en 'failed' y no en 'processing'
    with mock_db.connect() as conn:
        row = conn.execute(text("SELECT * FROM job_runs WHERE target_date = :td"), {"td": target_date}).mappings().first()
        assert row is not None
        assert row["status"] == "failed"
        assert row["finished_at"] is not None
        assert "Fallo en ejecución del pipeline" in row["error_message"]

        # Verificar que CERO registros quedan en 'processing'
        zombies = conn.execute(text("SELECT count(*) FROM job_runs WHERE status = 'processing'")).scalar()
        assert zombies == 0
