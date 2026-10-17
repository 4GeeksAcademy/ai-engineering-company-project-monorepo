#!/usr/bin/env python3
"""
nightly_export.py — Script nocturno de exportación de telemetría

Propósito:
    Script independiente (NO parte de FastAPI) que se ejecuta cada noche
    vía crontab para:
    1. Exportar telemetry_events del día anterior a CSV (backup/auditoría)
    2. Lanzar el pipeline ETL como subproceso
    3. Registrar el ciclo de vida en job_runs (pending → processing → completed|failed)

    La máquina de estados y el distributed lock se implementan vía el
    estado 'processing' en job_runs — sin tabla/columna lock aparte.

Uso:
    python scripts/nightly_export.py
    TARGET_DATE=2026-09-07 python scripts/nightly_export.py

Requiere:
    - services/job_runner/ (servicio de control de estado)
    - data/pipelines/telemetry_events.db (base de datos fuente)
    - data/pipelines/pipeline.py (pipeline ETL)
"""

from __future__ import annotations

import csv
import logging
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
from typing import Optional

# Asegurar que podemos importar desde la raíz del monorepo
_HERE = Path(__file__).resolve().parent  # scripts/
_REPO_ROOT = _HERE.parent  # raíz del monorepo
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from services.job_runner import (
    create_run,
    mark_processing,
    mark_completed,
    mark_failed,
    has_processing_lock,
    has_completed_for_date,
)

# ─────────────────────────────────────────────────────────────
# Constantes
# ─────────────────────────────────────────────────────────────

JOB_NAME = "nightly_export"
TELEMETRY_DB_PATH = _REPO_ROOT / "data" / "pipelines" / "telemetry_events.db"
RAW_DIR = _REPO_ROOT / "data" / "raw"
PIPELINE_MODULE = "data.pipelines.pipeline"
UTC = timezone.utc

# Formato de log
LOG_FORMAT = "%(asctime)sZ %(levelname)-5s %(name)s status=%(status)s target_date=%(target_date)s%(extra)s"
LOG_DATEFMT = "%Y-%m-%dT%H:%M:%S"


# ─────────────────────────────────────────────────────────────
# Logger personalizado con campos estructurados
# ─────────────────────────────────────────────────────────────

class StructuredLogger:
    """
    Logger que permite logs estructurados con campos adicionales.

    Ejemplo de salida:
        2026-09-08T02:00:01Z INFO  nightly_export status=started target_date=2026-09-07
    """

    def __init__(self, name: str = JOB_NAME):
        self._logger = logging.getLogger(name)
        self._log = logging.getLogger(name)
        self._log.setLevel(logging.INFO)

        # Handler para stdout
        if not self._log.handlers:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                fmt="%(asctime)sZ %(levelname)-5s %(name)s status=%(status)s target_date=%(target_date)s%(extra)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
            handler.setFormatter(formatter)
            self._log.addHandler(handler)

    def _log_msg(self, level: int, status: str, target_date: str, **extra) -> None:
        extra_str = ""
        if extra:
            extra_parts = []
            for k, v in extra.items():
                extra_parts.append(f"{k}={v}")
            extra_str = " " + " ".join(extra_parts)
        self._log.log(level, "", extra={"status": status, "target_date": target_date, "extra": extra_str})

    def info(self, status: str, target_date: str, **extra) -> None:
        """Log a nivel INFO."""
        self._log_msg(logging.INFO, status, target_date, **extra)

    def error(self, status: str, target_date: str, **extra) -> None:
        """Log a nivel ERROR."""
        self._log_msg(logging.ERROR, status, target_date, **extra)


log = StructuredLogger()


# ─────────────────────────────────────────────────────────────
# Funciones auxiliares
# ─────────────────────────────────────────────────────────────


def resolve_target_date() -> str:
    """
    Resuelve la fecha objetivo para la exportación.

    Prioridad:
    1. Variable de entorno TARGET_DATE (formato YYYY-MM-DD)
    2. Ayer en UTC (datetime.now(timezone.utc).date() - timedelta(days=1))

    Returns:
        Fecha en formato YYYY-MM-DD
    """
    env_date = os.environ.get("TARGET_DATE")
    if env_date:
        # Validar formato
        try:
            datetime.strptime(env_date, "%Y-%m-%d")
            return env_date
        except ValueError:
            log.error("invalid_target_date_format", "N/A",
                       error=f"TARGET_DATE={env_date} no es YYYY-MM-DD")
            sys.exit(1)

    yesterday = (datetime.now(UTC).date() - timedelta(days=1)).isoformat()
    return yesterday


def get_week_start(target_date_str: str) -> str:
    """
    Calcula el lunes de la semana ISO que contiene target_date.

    El pipeline (data.pipelines.pipeline) recibe --week-start como
    el lunes de la semana a procesar.

    Args:
        target_date_str: Fecha en formato YYYY-MM-DD

    Returns:
        Fecha del lunes de la semana en formato YYYY-MM-DD
    """
    d = date.fromisoformat(target_date_str)
    monday = d - timedelta(days=d.weekday())  # weekday(): Monday=0, Sunday=6
    return monday.isoformat()


def export_telemetry_to_csv(target_date: str) -> Optional[Path]:
    """
    Exporta filas de telemetry_events para target_date a un CSV.

    Solo exporta si el archivo CSV no existe ya (idempotencia).
    El CSV es snapshot de backup/auditoría — el pipeline lee desde BD.

    Args:
        target_date: Fecha en formato YYYY-MM-DD

    Returns:
        Path al CSV generado, o None si ya existía
    """
    csv_path = RAW_DIR / f"telemetry_{target_date}.csv"

    if csv_path.exists():
        log.info("csv_already_exists", target_date, reason="file_exists")
        return None

    # Asegurar que el directorio existe
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    if not TELEMETRY_DB_PATH.exists():
        raise FileNotFoundError(
            f"Base de datos de telemetría no encontrada: {TELEMETRY_DB_PATH}"
        )

    conn = sqlite3.connect(str(TELEMETRY_DB_PATH))
    conn.row_factory = sqlite3.Row

    try:
        # Consultar eventos para la fecha objetivo
        cursor = conn.execute(
            "SELECT id, timestamp, service, event_type, level, value, message, tags "
            "FROM telemetry_events "
            "WHERE timestamp LIKE ? "
            "ORDER BY timestamp",
            (f"{target_date}%",),
        )
        rows = cursor.fetchall()

        if not rows:
            log.info("no_events_found", target_date)
            # Escribir CSV vacío con headers
            with open(csv_path, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["id", "timestamp", "service", "event_type", "level", "value", "message", "tags"])
            return csv_path

        # Escribir CSV
        with open(csv_path, "w", newline="") as f:
            writer = csv.writer(f)
            # Header
            writer.writerow(["id", "timestamp", "service", "event_type", "level", "value", "message", "tags"])
            # Data rows
            for row in rows:
                writer.writerow([
                    row["id"],
                    row["timestamp"],
                    row["service"],
                    row["event_type"],
                    row["level"],
                    row["value"],
                    row["message"],
                    row["tags"],
                ])

        log.info("csv_exported", target_date, rows=len(rows), path=str(csv_path))
        return csv_path

    finally:
        conn.close()


def run_pipeline(week_start: str) -> int:
    """
    Ejecuta el pipeline ETL como subproceso.

    Args:
        week_start: Lunes de la semana ISO a procesar (YYYY-MM-DD)

    Returns:
        Código de salida del subproceso (0 = éxito)
    """
    cmd = [
        sys.executable,
        "-m",
        PIPELINE_MODULE,
        "--week-start",
        week_start,
    ]

    log.info("pipeline_started", "N/A", cmd=" ".join(cmd))

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=str(_REPO_ROOT),
    )

    if result.returncode != 0:
        stderr_preview = result.stderr.strip()[:500] if result.stderr else "no stderr"
        raise RuntimeError(
            f"Pipeline exit code {result.returncode}: {stderr_preview}"
        )

    log.info("pipeline_completed", "N/A", exit_code=str(result.returncode))
    return result.returncode


# ─────────────────────────────────────────────────────────────
# Función principal
# ─────────────────────────────────────────────────────────────


def main() -> None:
    """
    Flujo principal del script nocturno.

    1. Resolver target_date
    2. Lock check (processing activo?)
    3. Idempotencia check (ya completado para esta fecha?)
    4. Crear registro job_runs → processing
    5. Exportar CSV
    6. Ejecutar pipeline
    7. Marcar como completado
    8. Capturar excepciones → marcar como failed
    """

    # Paso 1: Resolver fecha objetivo
    target_date = resolve_target_date()
    log.info("started", target_date)

    # Paso 2: Lock check — distributed lock vía 'processing'
    if has_processing_lock(JOB_NAME):
        log.info("cancelled", target_date, reason="processing_lock")
        sys.exit(0)

    # Paso 3: Idempotencia check — ya completado para esta fecha?
    if has_completed_for_date(JOB_NAME, target_date):
        log.info("skipped", target_date, reason="duplicate")
        sys.exit(0)

    # Paso 4: Crear registro → processing
    run_id = create_run(JOB_NAME, target_date)
    mark_processing(run_id)
    log.info("processing", target_date, run_id=run_id)

    try:
        # Paso 5: Exportar telemetry_events a CSV (solo si no existe)
        csv_path = export_telemetry_to_csv(target_date)
        if csv_path:
            log.info("csv_exported", target_date, path=str(csv_path))

        # Paso 6: Calcular week_start y ejecutar pipeline
        week_start = get_week_start(target_date)
        run_pipeline(week_start)

        # Paso 7: Marcar como completado
        mark_completed(run_id)
        log.info("completed", target_date, run_id=run_id)

    except Exception as e:
        # Paso 8: Marcar como failed — nunca dejar zombie en 'processing'
        error_msg = str(e)[:1000]  # Limitar longitud
        mark_failed(run_id, error_msg)
        log.error("failed", target_date, error=error_msg, run_id=run_id)
        sys.exit(1)


# ─────────────────────────────────────────────────────────────
# Punto de entrada
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()