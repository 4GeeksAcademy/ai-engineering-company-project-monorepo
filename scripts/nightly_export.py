#!/usr/bin/env python3
"""
Script Nocturno de Telemetría (Ticket #DEV-53).
Nexova Solutions — Procesos en Segundo Plano.

Responsabilidades:
1. Proceso desacoplado de la API (CLI independiente).
2. Distributed Lock nativo mediante estado 'processing' en job_runs.
3. Idempotencia diaria por (job_name, target_date).
4. Exportación de snapshot de respaldo a data/raw/telemetry_YYYY-MM-DD.csv.
5. Invocación del pipeline de datos como subproceso.
6. Máquina de estados garantizada (pending -> processing -> completed | failed).
"""

import os
import sys
import logging
import subprocess
from datetime import datetime, timezone, timedelta
from typing import Optional
import pandas as pd
from sqlalchemy import text

# Asegurar importaciones relativas desde la raíz del monorepo
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.api.database import engine
from services.job_runner import (
    ensure_job_runs_table_exists,
    has_processing_lock,
    has_completed_for_date,
    create_job_run,
    transition_to_processing,
    mark_completed,
    mark_failed,
)

# Configuración de Logging Estructurado
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [nightly_export] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("nightly_export")

JOB_NAME = "nightly_export"


def resolve_target_date() -> str:
    """
    Resuelve la fecha objetivo a procesar:
    1. Si se pasa como argumento de línea de comandos: sys.argv[1].
    2. Si se define variable de entorno: TARGET_DATE.
    3. Por defecto: ayer en UTC.
    """
    if len(sys.argv) > 1 and sys.argv[1].strip():
        date_str = sys.argv[1].strip()
        logger.info(f"📅 Fecha objetivo recibida por argumento CLI: {date_str}")
        return date_str

    env_date = os.getenv("TARGET_DATE")
    if env_date and env_date.strip():
        date_str = env_date.strip()
        logger.info(f"📅 Fecha objetivo obtenida desde variable de entorno TARGET_DATE: {date_str}")
        return date_str

    yesterday_utc = (datetime.now(timezone.utc) - timedelta(days=1)).date()
    date_str = yesterday_utc.strftime("%Y-%m-%d")
    logger.info(f"📅 Fecha objetivo calculada por defecto (ayer en UTC): {date_str}")
    return date_str


def export_telemetry_csv(target_date: str) -> str:
    """
    Exporta los eventos de telemetría de la fecha indicada a un archivo CSV en data/raw/.
    El archivo CSV es estrictamente un snapshot de backup/auditoría.
    Retorna la ruta absoluta del archivo generado.
    """
    raw_dir = os.path.join(BASE_DIR, "data", "raw")
    os.makedirs(raw_dir, exist_ok=True)
    csv_filename = f"telemetry_{target_date}.csv"
    csv_path = os.path.join(raw_dir, csv_filename)

    if os.path.exists(csv_path):
        logger.info(f"📁 Snapshot CSV ya existente en {csv_path}. Omitiendo sobreescritura.")
        return csv_path

    start_ts = f"{target_date} 00:00:00"
    end_ts = f"{target_date} 23:59:59"

    logger.info(f"📥 Exportando telemetría desde BD para el rango [{start_ts} - {end_ts}]...")

    query = text("""
        SELECT id, timestamp, event_type, tags
        FROM telemetry_events
        WHERE timestamp >= :start AND timestamp <= :end
        ORDER BY timestamp ASC
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"start": start_ts, "end": end_ts})

    df.to_csv(csv_path, index=False)
    logger.info(f"💾 Snapshot CSV guardado con éxito: {csv_path} ({len(df)} filas exportadas).")
    return csv_path


def trigger_pipeline_subprocess(target_date: str) -> None:
    """
    Ejecuta el pipeline de datos (Hito 6) como un subproceso desacoplado.
    Lanza 'python data/pipelines/pipeline.py <target_date>'.
    """
    pipeline_script = os.path.join(BASE_DIR, "data", "pipelines", "pipeline.py")
    cmd = [sys.executable, pipeline_script, target_date]
    logger.info(f"⚙️ Disparando pipeline como subproceso: {' '.join(cmd)}")

    result = subprocess.run(
        cmd,
        cwd=BASE_DIR,
        capture_output=True,
        text=True,
        check=False
    )

    if result.returncode != 0:
        error_details = (
            f"El subproceso del pipeline falló con código de salida {result.returncode}.\n"
            f"Stderr: {result.stderr}\n"
            f"Stdout: {result.stdout}"
        )
        logger.error(error_details)
        raise RuntimeError(f"Fallo en ejecución del pipeline: {result.stderr or result.stdout}")

    logger.info("✅ Subproceso del pipeline finalizado exitosamente.")
    logger.debug(f"Salida del pipeline:\n{result.stdout}")


def main() -> int:
    """
    Punto de entrada principal con máquina de estados y control de concurrencia.
    """
    logger.info("=================================================================")
    logger.info("🚀 Iniciando orquestador nocturno de telemetría (nightly_export)")
    logger.info("=================================================================")

    ensure_job_runs_table_exists()
    target_date = resolve_target_date()

    # 1. Verificación de Distributed Lock
    if has_processing_lock(JOB_NAME):
        logger.warning(
            f"🔒 Lock activo detectado: ya existe una instancia de '{JOB_NAME}' en estado 'processing'. "
            "Abortando silenciosamente para evitar ejecuciones concurrentes."
        )
        return 0

    # 2. Verificación de Idempotencia diaria
    if has_completed_for_date(JOB_NAME, target_date):
        logger.info(
            f"⏭️ Idempotencia confirmada: la tarea '{JOB_NAME}' ya se encuentra completada para la fecha {target_date}. "
            "Omitiendo ejecución por duplicado."
        )
        return 0

    # 3. Transición a 'pending' y adquisición de lock ('processing')
    run_id = create_job_run(JOB_NAME, target_date, initial_status="pending")
    transition_to_processing(run_id)

    # 4. Ejecución del flujo bajo bloque de resiliencia (cero zombis)
    try:
        # Paso A: Exportar backup CSV a data/raw/
        export_telemetry_csv(target_date)

        # Paso B: Disparar el pipeline de datos en un subproceso
        trigger_pipeline_subprocess(target_date)

        # Paso C: Marcar como completado y liberar lock
        mark_completed(run_id)
        logger.info(f"🏁 Proceso nocturno completado con éxito para {target_date} [Run ID: {run_id}].")
        return 0

    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"💥 Error crítico durante la ejecución de '{JOB_NAME}': {err_msg}")
        mark_failed(run_id, err_msg)
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
