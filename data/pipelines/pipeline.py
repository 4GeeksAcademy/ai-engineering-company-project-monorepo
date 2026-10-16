"""
Pipeline de Desempeño de Negocio Resiliente para Nexova Solutions.
Orquestado con Prefect 3.
Punto de entrada CLI: python data/pipelines/pipeline.py
"""

import os
import sys
import uuid
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

import pandas as pd
from sqlalchemy import text
from prefect import flow, task

# Asegurar importaciones relativas desde la raíz del monorepo
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from services.api.database import engine
from data.process.transformations import transform_events_to_business_kpis

logger = logging.getLogger("nexova.business_pipeline")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


# =====================================================================
# INICIALIZACIÓN DE TABLAS DE DESTINO (ESQUEMA REPORTING)
# =====================================================================
def ensure_reporting_tables_exist():
    """
    Crea las tablas maestras de reporting si no existen.
    Compatible tanto con PostgreSQL/Supabase como con SQLite local.
    """
    with engine.begin() as conn:
        dialect = engine.dialect.name
        if dialect == "postgresql":
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS reporting;"))

            # Tabla de KPIs ejecutivos con restricción de unicidad para idempotencia
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS reporting.executive_kpis (
                    kpi_id UUID PRIMARY KEY,
                    window_date DATE NOT NULL,
                    window_granularity VARCHAR(20) NOT NULL,
                    department VARCHAR(50) NOT NULL,
                    metric_name VARCHAR(100) NOT NULL,
                    metric_value NUMERIC NOT NULL,
                    target_value NUMERIC NOT NULL,
                    sla_status VARCHAR(20) NOT NULL,
                    calculated_at TIMESTAMPTZ NOT NULL,
                    run_id UUID NOT NULL,
                    CONSTRAINT uq_kpi_window UNIQUE (window_date, window_granularity, department, metric_name)
                );
            """))

            # Tabla de auditoría de ejecuciones
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS reporting.pipeline_runs (
                    run_id UUID PRIMARY KEY,
                    flow_name VARCHAR(100) NOT NULL,
                    started_at TIMESTAMPTZ NOT NULL,
                    finished_at TIMESTAMPTZ,
                    status VARCHAR(20) NOT NULL,
                    records_processed INTEGER NOT NULL DEFAULT 0,
                    error_message TEXT
                );
            """))
        else:
            # Fallback local SQLite
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS reporting_executive_kpis (
                    kpi_id TEXT PRIMARY KEY,
                    window_date TEXT NOT NULL,
                    window_granularity TEXT NOT NULL,
                    department TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    target_value REAL NOT NULL,
                    sla_status TEXT NOT NULL,
                    calculated_at TEXT NOT NULL,
                    run_id TEXT NOT NULL,
                    UNIQUE(window_date, window_granularity, department, metric_name)
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS reporting_pipeline_runs (
                    run_id TEXT PRIMARY KEY,
                    flow_name TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    finished_at TEXT,
                    status TEXT NOT NULL,
                    records_processed INTEGER NOT NULL DEFAULT 0,
                    error_message TEXT
                );
            """))


# =====================================================================
# TASKS ATÓMICAS DE PREFECT CON RESILIENCIA
# =====================================================================

# Reintentos = 3 con espera de 10s: Justificación: Absorber micro-cortes transitorios
# de red o saturación de conexiones en el pool de Supabase/PostgreSQL.
@task(
    name="extract-telemetry-events",
    retries=3,
    retry_delay_seconds=10,
    log_prints=True
)
def extract_telemetry_events_task(start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
    """Extrae eventos brutos de la tabla telemetry_events dentro de la ventana."""
    query = text("""
        SELECT id, timestamp, event_type, tags
        FROM telemetry_events
        WHERE timestamp >= :start AND timestamp <= :end
    """)
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"start": start_time, "end": end_time})

    if df.empty:
        print(f"ℹ️ No se encontraron eventos en telemetry_events para el intervalo [{start_time} - {end_time}].")
        return []

    print(f"✅ Se extrajeron {len(df)} eventos brutos de telemetría.")
    return df.to_dict(orient="records")


def generate_cache_key(context, parameters) -> str:
    """
    Genera clave de caché basada en la fecha de ventana.
    Permite que la task de transformación reutilice cómputo previo para el mismo día
    sin re-calcular operaciones matriciales pesadas en Pandas dentro de la hora.
    """
    w_date = parameters.get("window_date", "default")
    return f"transform-kpis-cache-{w_date}"


# Caché por 1 hora: Justificación: Si la transformación corre repetidamente para
# la misma ventana en la última hora, reutiliza el resultado previo sin re-procesar Pandas.
@task(
    name="transform-business-kpis",
    cache_key_fn=generate_cache_key,
    cache_expiration=timedelta(minutes=60),
    log_prints=True
)
def transform_business_kpis_task(raw_events: List[Dict[str, Any]], window_date: str) -> List[Dict[str, Any]]:
    """Transforma eventos en KPIs consolidados llamando al módulo reutilizable."""
    print(f"🔄 Ejecutando transformación y cálculo de KPIs para fecha: {window_date}")
    kpis = transform_events_to_business_kpis(raw_events, window_date)
    print(f"📊 Se calcularon {len(kpis)} KPIs de negocio.")
    return kpis


# Reintentos = 3 con espera de 5s: Justificación: Prevenir deadlocks transitorios o
# bloqueos breves de transacción durante la escritura en la base de datos relacional.
@task(
    name="load-executive-kpis",
    retries=3,
    retry_delay_seconds=5,
    log_prints=True
)
def load_executive_kpis_task(kpis: List[Dict[str, Any]], run_id: str) -> int:
    """
    Carga idempotente (UPSERT) en la tabla de reporting.
    Garantiza que re-ejecutar el pipeline sobre los mismos datos no genera duplicados.
    """
    if not kpis:
        return 0

    dialect = engine.dialect.name
    now_iso = datetime.now(timezone.utc).isoformat()
    loaded_count = 0

    with engine.begin() as conn:
        for item in kpis:
            kpi_id = str(uuid.uuid4())
            w_date = item["window_date"]
            granularity = item["window_granularity"]
            dept = item["department"]
            metric = item["metric_name"]
            val = float(item["metric_value"])
            target = float(item["target_value"])
            status = item["sla_status"]

            if dialect == "postgresql":
                upsert_query = text("""
                    INSERT INTO reporting.executive_kpis 
                    (kpi_id, window_date, window_granularity, department, metric_name, metric_value, target_value, sla_status, calculated_at, run_id)
                    VALUES (:kpi_id, :window_date, :window_granularity, :department, :metric_name, :metric_value, :target_value, :sla_status, :calculated_at, :run_id)
                    ON CONFLICT (window_date, window_granularity, department, metric_name)
                    DO UPDATE SET
                        metric_value = EXCLUDED.metric_value,
                        target_value = EXCLUDED.target_value,
                        sla_status = EXCLUDED.sla_status,
                        calculated_at = EXCLUDED.calculated_at,
                        run_id = EXCLUDED.run_id;
                """)
            else:
                upsert_query = text("""
                    INSERT INTO reporting_executive_kpis 
                    (kpi_id, window_date, window_granularity, department, metric_name, metric_value, target_value, sla_status, calculated_at, run_id)
                    VALUES (:kpi_id, :window_date, :window_granularity, :department, :metric_name, :metric_value, :target_value, :sla_status, :calculated_at, :run_id)
                    ON CONFLICT(window_date, window_granularity, department, metric_name)
                    DO UPDATE SET
                        metric_value = excluded.metric_value,
                        target_value = excluded.target_value,
                        sla_status = excluded.sla_status,
                        calculated_at = excluded.calculated_at,
                        run_id = excluded.run_id;
                """)

            conn.execute(upsert_query, {
                "kpi_id": kpi_id,
                "window_date": w_date,
                "window_granularity": granularity,
                "department": dept,
                "metric_name": metric,
                "metric_value": val,
                "target_value": target,
                "sla_status": status,
                "calculated_at": now_iso,
                "run_id": run_id
            })
            loaded_count += 1

    print(f"💾 Carga idempotente completada: {loaded_count} KPIs persistidos en reporting.")
    return loaded_count


@task(name="optional-eval-snapshot", log_prints=True)
def optional_eval_snapshot_task(kpis: List[Dict[str, Any]], run_id: str) -> str:
    """
    Task opcional / no crítica:
    Genera un snapshot en data/eval/ para validaciones posteriores.
    Si esta tarea falla, el flow principal NO debe interrumpirse.
    """
    eval_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../eval"))
    os.makedirs(eval_dir, exist_ok=True)
    snapshot_path = os.path.join(eval_dir, f"snapshot_{run_id}.json")

    with open(snapshot_path, "w", encoding="utf-8") as f:
        json.dump({"run_id": run_id, "timestamp": datetime.now(timezone.utc).isoformat(), "kpis": kpis}, f, indent=2)

    print(f"📄 Snapshot analítico generado con éxito en: {snapshot_path}")
    return snapshot_path


@task(name="log-pipeline-run", log_prints=True)
def log_pipeline_run_task(
    run_id: str,
    flow_name: str,
    started_at: datetime,
    finished_at: datetime,
    status: str,
    records_processed: int,
    error_message: Optional[str] = None
):
    """Registra la metadata de auditoría de la corrida en la base de datos."""
    dialect = engine.dialect.name
    table_name = "reporting.pipeline_runs" if dialect == "postgresql" else "reporting_pipeline_runs"

    query = text(f"""
        INSERT INTO {table_name}
        (run_id, flow_name, started_at, finished_at, status, records_processed, error_message)
        VALUES (:run_id, :flow_name, :started_at, :finished_at, :status, :records_processed, :error_message)
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "run_id": run_id,
            "flow_name": flow_name,
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "status": status,
            "records_processed": records_processed,
            "error_message": error_message
        })
    print(f"📝 Auditoría registrada: run_id={run_id} con estado={status}.")


# =====================================================================
# SUBFLOWS MODULARES DE PREFECT 3 (TOPOLOGÍA DE PRODUCCIÓN)
# =====================================================================

@flow(name="extract-telemetry-events-subflow", log_prints=True)
def extract_telemetry_events_subflow(start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
    """
    Subflow 1: Extracción de eventos de telemetría de negocio desde public.telemetry_events.
    Inputs explícitos: start_time (datetime), end_time (datetime).
    Output explícito: List[Dict[str, Any]] con los eventos crudos en memoria.
    """
    print(f"📥 [Subflow Extracción] Obteniendo eventos brutos para la ventana [{start_time} - {end_time}]...")
    return extract_telemetry_events_task(start_time, end_time)


@flow(name="transform-business-kpis-subflow", log_prints=True)
def transform_business_kpis_subflow(raw_events: List[Dict[str, Any]], window_date: str) -> List[Dict[str, Any]]:
    """
    Subflow 2: Transformación analítica de eventos a métricas y KPIs de Nexova Solutions.
    Inputs explícitos: raw_events (List[Dict]), window_date (str YYYY-MM-DD).
    Output explícito: List[Dict[str, Any]] con los KPIs calculados por departamento.
    """
    print(f"🔄 [Subflow Transformación] Procesando métricas de negocio para la fecha {window_date}...")
    return transform_business_kpis_task(raw_events, window_date)


@flow(name="load-executive-kpis-subflow", log_prints=True)
def load_executive_kpis_subflow(kpis: List[Dict[str, Any]], run_id: str) -> int:
    """
    Subflow 3: Carga idempotente (UPSERT) en la tabla destino reporting.executive_kpis.
    Inputs explícitos: kpis (List[Dict]), run_id (str).
    Output explícito: int (total de registros persistidos o actualizados).
    """
    print(f"💾 [Subflow Carga] Persistiendo KPIs en destino relacional para run_id={run_id}...")
    return load_executive_kpis_task(kpis, run_id)


@flow(name="eval-snapshot-subflow", log_prints=True)
def eval_snapshot_subflow(kpis: List[Dict[str, Any]], run_id: str) -> str:
    """
    Subflow Opcional / No Crítico:
    Generación de snapshot analítico en data/eval/ para validación offline.
    Invocado desde el flow principal con return_state=True para tolerancia a fallos.
    """
    print(f"📄 [Subflow Opcional] Generando snapshot de evaluación...")
    return optional_eval_snapshot_task(kpis, run_id)


# =====================================================================
# FLOW COORDINADOR PRINCIPAL (PREFECT)
# =====================================================================
@flow(name="business-performance-pipeline", log_prints=True)
def business_performance_flow(target_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Flow principal de Prefect 3 que coordina los subflows de extracción,
    transformación, carga idempotente, subflow opcional de snapshot y auditoría.
    Mantiene dependencias e interfaces desacopladas sin variables globales.
    """
    ensure_reporting_tables_exist()

    run_id = str(uuid.uuid4())
    flow_name = "business_performance_flow"
    started_at = datetime.now(timezone.utc)

    # Determinar ventana temporal (por defecto el día de hoy UTC)
    if not target_date:
        target_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    window_start = datetime.strptime(f"{target_date} 00:00:00", "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    window_end = datetime.strptime(f"{target_date} 23:59:59", "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)

    print(f"🚀 Iniciando Business Performance Pipeline [Run ID: {run_id}] para fecha: {target_date}")

    records_processed = 0
    try:
        # 1. Extracción mediante Subflow dedicado
        events = extract_telemetry_events_subflow(window_start, window_end)

        # 2. Transformación mediante Subflow dedicado
        kpis = transform_business_kpis_subflow(events, target_date)

        # 3. Carga idempotente mediante Subflow dedicado
        records_processed = load_executive_kpis_subflow(kpis, run_id)

        # 4. Subflow opcional/no crítico con return_state=True
        opt_state = eval_snapshot_subflow(kpis, run_id, return_state=True)
        if opt_state.is_failed():
            print("⚠️ Aviso: El subflow opcional de snapshot falló, pero el flujo principal continúa sin interrupciones.")

        finished_at = datetime.now(timezone.utc)
        status = "COMPLETED"
        log_pipeline_run_task(run_id, flow_name, started_at, finished_at, status, records_processed, None)

        return {
            "run_id": run_id,
            "status": status,
            "records_processed": records_processed,
            "window_date": target_date
        }

    except Exception as exc:
        finished_at = datetime.now(timezone.utc)
        status = "FAILED"
        err_msg = str(exc)
        print(f"❌ Error crítico en ejecución del pipeline: {err_msg}")
        log_pipeline_run_task(run_id, flow_name, started_at, finished_at, status, records_processed, err_msg)
        raise exc


# =====================================================================
# EJECUCIÓN DIRECTA POR CLI
# =====================================================================
if __name__ == "__main__":
    # Permite ejecutar: python data/pipelines/pipeline.py [YYYY-MM-DD]
    date_arg = sys.argv[1] if len(sys.argv) > 1 else None
    result = business_performance_flow(target_date=date_arg)
    print(f"🏁 Pipeline finalizado con éxito: {result}")