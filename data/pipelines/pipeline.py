"""
pipeline.py — Pipeline de Desempeño de Negocio Resiliente (Parte 3 de 3)

Propósito:
    Implementa el pipeline ETL que produce el Reporte Semanal de Desempeño
    por Almacén y Cliente. Usa Prefect 3 para orquestación resiliente.

Arquitectura (Parte 3 — subflows):
    El flow principal (run_pipeline) orquesta 4 subflows (@flow):
    
    run_pipeline()
      ├── subflow_extract_telemetry()    → task extract()
      ├── subflow_transform_kpis()        → task transform()
      ├── subflow_load_reporting()        → task load()
      └── subflow_notify() (opcional, return_state=True)
    
    Cada subflow tiene inputs/outputs explícitos y puede ejecutarse
    de forma independiente. Las tasks internas siguen teniendo retries,
    caché, etc.

Resiliencia implementada:
    1. Retries en tasks que tocan servicios externos (DB, archivos)
    2. Caché en transformación (cache_key_fn + cache_expiration)
    3. Subflow opcional con return_state=True (notificación)
    4. Idempotencia en carga vía UPSERT (UNIQUE constraint)
    5. Log de ejecución con 10 campos de metadata

Ejecución:
    python data/pipelines/pipeline.py                         # Corrida completa
    python data/pipelines/pipeline.py --week-start 2026-09-07 # Semana específica
    python data/pipelines/pipeline.py --help                  # Ver opciones

Frecuencia: Semanal, lunes 06:00 UTC (programado vía cron)
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

# ── Prefect 3 ──────────────────────────────────────────────
# Prefect es el orquestador de pipelines. Proporciona:
# - @flow: decorador para flujos (también subflows)
# - @task: decorador para tareas individuales
# - retry_delay_seconds: espera entre reintentos
# - cache_key_fn / cache_expiration: caché de resultados
# - return_state=True: permite que un subflow falle sin detener el flow principal
from prefect import flow, task
from prefect.tasks import task_input_hash

# ── Capa de datos local ─────────────────────────────────────
# database.py gestiona conexiones a SQLite local que replica
# el esquema de PostgreSQL/Supabase de producción.
from data.pipelines.database import (
    get_reporting_db,
    get_telemetry_db,
    init_reporting_db,
)

# ─────────────────────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Constantes del pipeline
PIPELINE_NAME = "weekly_warehouse_client_performance"

# Eventos de negocio que alimentan el pipeline
# (definidos en el CONTEXT-trackflow.md, sección 3 — Source Data)
INBOUND_EVENT = "inbound_order_created"        # → Volumen de Entrada
OUTBOUND_EVENT = "outbound_order_created"       # → Rendimiento de Salida
STOCKOUT_EVENT = "stock_threshold_triggered"    # → Frecuencia de Desabastecimiento
DISCREPANCY_EVENT = "inventory_discrepancy_detected"  # → Tasa de Discrepancia

# Semana por defecto: la semana ISO actual (lunes anterior o el lunes de esta semana)
def _default_week_start() -> str:
    """
    Calcula el lunes de la semana ISO actual en UTC.
    
    Semana ISO: la semana comienza el lunes.
    Si hoy es lunes, week_start = hoy.
    Si hoy es martes, week_start = lunes de esta semana.
    etc.
    """
    today = datetime.now(timezone.utc)
    # weekday(): 0=lunes, 1=martes, ..., 6=domingo
    monday = today - timedelta(days=today.weekday())
    return monday.strftime("%Y-%m-%d")


# ─────────────────────────────────────────────────────────────
# Tasks de Prefect — operaciones atómicas del pipeline
# Cada task tiene su propia configuración de retries/caché
# ─────────────────────────────────────────────────────────────


@task(
    retries=2,              # Reintenta hasta 2 veces si la DB está ocupada
    retry_delay_seconds=10, # Espera 10 segundos entre reintentos
    name="Extract telemetry events",
)
def extract(week_start: str) -> list[dict[str, Any]]:
    """
    TASK — Extracción: Lee eventos de telemetría filtrados por semana.
    
    Lee de la tabla telemetry_events (solo lectura) los eventos de negocio
    relevantes para la semana especificada.
    
    Args:
        week_start: Fecha ISO del lunes de la semana a procesar (YYYY-MM-DD)
    
    Returns:
        Lista de eventos (dicts) con los campos necesarios para la transformación.
    
    Resiliencia:
        - retries=2: tolera caídas transitorias de la base de datos
        - retry_delay_seconds=10: espera 10s antes de reintentar
    
    Idempotencia:
        Usa ROW_NUMBER() PARTITION BY eventId para descartar eventos duplicados.
    """
    logger.info(f"[extract] Iniciando extracción para semana {week_start}...")
    
    week_start_dt = datetime.strptime(week_start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    week_end_dt = week_start_dt + timedelta(days=7)
    
    query = """
        SELECT id, timestamp, event_type, value, warehouse, client_id, quantity, event_id
        FROM (
            SELECT
                id, timestamp, event_type, value,
                json_extract(tags, '$.warehouse') AS warehouse,
                json_extract(tags, '$.client_id') AS client_id,
                json_extract(tags, '$.quantity') AS quantity,
                json_extract(tags, '$.eventId') AS event_id,
                ROW_NUMBER() OVER (
                    PARTITION BY json_extract(tags, '$.eventId')
                    ORDER BY timestamp
                ) AS rn
            FROM telemetry_events
            WHERE event_type IN (?, ?, ?, ?)
              AND timestamp >= ? 
              AND timestamp < ?
        )
        WHERE rn = 1
    """
    
    try:
        with get_telemetry_db() as conn:
            rows = conn.execute(
                query,
                (
                    INBOUND_EVENT, OUTBOUND_EVENT,
                    STOCKOUT_EVENT, DISCREPANCY_EVENT,
                    week_start, week_end_dt.isoformat()
                )
            ).fetchall()
    except Exception as e:
        logger.error(f"[extract] Error leyendo telemetry_events: {e}")
        raise
    
    events = [dict(row) for row in rows]
    logger.info(f"[extract] Leídos {len(events)} eventos únicos de telemetry_events")
    return events


@task(
    cache_key_fn=task_input_hash,
    cache_expiration=timedelta(hours=1),
    name="Transform into KPIs",
)
def transform(events: list[dict[str, Any]], week_start: str) -> list[dict[str, Any]]:
    """
    TASK — Transformación: Agrupa eventos y calcula KPIs.
    
    Toma los eventos extraídos y los agrupa por (warehouse, client_id, week_start)
    para calcular los 4 KPIs de negocio definidos en el CONTEXT.
    
    Args:
        events: Lista de eventos extraídos de telemetry_events
        week_start: Semana ISO a la que pertenecen estos eventos
    
    Returns:
        Lista de registros KPI, uno por combinación (warehouse, client_id)
    """
    logger.info(f"[transform] Agrupando {len(events)} eventos para semana {week_start}...")
    
    aggregates: dict[tuple[str, str], dict[str, Any]] = {}
    
    for event in events:
        warehouse = event["warehouse"]
        client_id = event["client_id"]
        
        if not warehouse or not client_id:
            continue
        
        key = (warehouse, client_id)
        
        if key not in aggregates:
            aggregates[key] = {
                "warehouse": warehouse,
                "client_id": client_id,
                "week_start": week_start,
                "inbound_units_count": 0,
                "outbound_orders_count": 0,
                "stockout_events_count": 0,
                "discrepancy_events_count": 0,
            }
        
        event_type = event["event_type"]
        
        if event_type == INBOUND_EVENT:
            qty = event["quantity"]
            aggregates[key]["inbound_units_count"] += int(qty) if qty else 0
            
        elif event_type == OUTBOUND_EVENT:
            aggregates[key]["outbound_orders_count"] += 1
            
        elif event_type == STOCKOUT_EVENT:
            aggregates[key]["stockout_events_count"] += 1
            
        elif event_type == DISCREPANCY_EVENT:
            aggregates[key]["discrepancy_events_count"] += 1
    
    results: list[dict[str, Any]] = []
    for agg in aggregates.values():
        outbound = agg["outbound_orders_count"]
        agg["discrepancy_rate"] = round(
            agg["discrepancy_events_count"] / outbound, 4
        ) if outbound > 0 else 0.0
        results.append(agg)
    
    logger.info(f"[transform] Generados {len(results)} registros KPI")
    return results


@task(
    retries=1,
    retry_delay_seconds=5,
    name="Load KPIs into reporting",
)
def load(kpi_records: list[dict[str, Any]], run_id: str) -> int:
    """
    TASK — Carga: Escribe los KPIs en la tabla destino con UPSERT.
    
    Args:
        kpi_records: Lista de registros KPI a insertar/actualizar
        run_id: UUID de la corrida actual
    
    Returns:
        Número de filas insertadas o actualizadas
    """
    logger.info(f"[load] Escribiendo {len(kpi_records)} registros en reporting...")
    
    upsert_sql = """
        INSERT INTO reporting_weekly_warehouse_client_performance
            (id, warehouse, client_id, week_start,
             inbound_units_count, outbound_orders_count,
             stockout_events_count, discrepancy_events_count,
             discrepancy_rate, computed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(warehouse, client_id, week_start)
        DO UPDATE SET
            inbound_units_count     = excluded.inbound_units_count,
            outbound_orders_count   = excluded.outbound_orders_count,
            stockout_events_count   = excluded.stockout_events_count,
            discrepancy_events_count = excluded.discrepancy_events_count,
            discrepancy_rate        = excluded.discrepancy_rate,
            computed_at             = datetime('now')
    """
    
    rows_affected = 0
    try:
        with get_reporting_db() as conn:
            for record in kpi_records:
                conn.execute(upsert_sql, (
                    str(uuid4()),
                    record["warehouse"],
                    record["client_id"],
                    record["week_start"],
                    record["inbound_units_count"],
                    record["outbound_orders_count"],
                    record["stockout_events_count"],
                    record["discrepancy_events_count"],
                    record["discrepancy_rate"],
                ))
                rows_affected += 1
    except Exception as e:
        logger.error(f"[load] Error en UPSERT: {e}")
        raise
    
    logger.info(f"[load] {rows_affected} filas upsertadas correctamente")
    return rows_affected


@task(name="Notify (optional)", retries=0)
def notify(rows_upserted: int, run_id: str) -> None:
    """
    TASK (OPCIONAL) — Notificación: Simula envío de alerta.
    
    Esta es una task opcional: el subflow que la envuelve se invoca
    con return_state=True para que el pipeline continúe si falla.
    
    En producción, esto enviaría un mensaje a Slack/Email/Teams.
    """
    logger.info(f"[notify] Simulando notificación: {rows_upserted} filas procesadas (run={run_id[:8]})")
    
    import random
    if random.random() < 0.3:
        raise RuntimeError("⚠️ Simulación: La API de notificaciones no respondió (timeout)")


# ─────────────────────────────────────────────────────────────
# SUBFLOWS (@flow) — cada etapa del pipeline es un flow independiente
# 
# Cada subflow tiene:
# - Inputs y outputs explícitos (tipados)
# - Puede ejecutarse de forma independiente
# - El flow principal los orquesta en secuencia
# ─────────────────────────────────────────────────────────────


@flow(name="Subflow: Extract", log_prints=True)
def subflow_extract_telemetry(week_start: str) -> list[dict[str, Any]]:
    """
    SUBFLOW 1/4 — Extracción desde telemetry_events.
    
    Args:
        week_start: Semana ISO a procesar
    
    Returns:
        Lista de eventos únicos de telemetría
    """
    logger.info(f"[subflow/extract] Iniciando subflow de extracción para semana {week_start}")
    events = extract(week_start)
    logger.info(f"[subflow/extract] Extracción completada: {len(events)} eventos")
    return events


@flow(name="Subflow: Transform KPIs", log_prints=True)
def subflow_transform_kpis(events: list[dict[str, Any]], week_start: str) -> list[dict[str, Any]]:
    """
    SUBFLOW 2/4 — Transformación a KPIs de negocio.
    
    Toma eventos en crudo y produce registros KPI agregados
    por (warehouse, client_id, week_start).
    
    Args:
        events: Eventos extraídos de telemetry_events
        week_start: Semana ISO de referencia
    
    Returns:
        Registros KPI listos para carga
    """
    logger.info(f"[subflow/transform] Iniciando transformación de {len(events)} eventos")
    kpi_records = transform(events, week_start)
    logger.info(f"[subflow/transform] Transformación completada: {len(kpi_records)} registros KPI")
    return kpi_records


@flow(name="Subflow: Load KPIs", log_prints=True)
def subflow_load_reporting(kpi_records: list[dict[str, Any]], run_id: str) -> int:
    """
    SUBFLOW 3/4 — Carga en tabla de reporting.
    
    Args:
        kpi_records: Registros KPI a upsertar
        run_id: UUID de la corrida actual
    
    Returns:
        Número de filas afectadas
    """
    logger.info(f"[subflow/load] Iniciando carga de {len(kpi_records)} registros")
    rows = load(kpi_records, run_id)
    logger.info(f"[subflow/load] Carga completada: {rows} filas upsertadas")
    return rows


@flow(name="Subflow: Notify (optional)", log_prints=True)
def subflow_notify(rows_upserted: int, run_id: str) -> None:
    """
    SUBFLOW 4/4 (OPCIONAL) — Notificación.
    
    Este subflow se invoca con return_state=True desde el flow principal,
    por lo que si falla, el pipeline continúa sin interrupción.
    
    Args:
        rows_upserted: Filas procesadas
        run_id: UUID de la corrida
    """
    logger.info(f"[subflow/notify] Enviando notificación...")
    notify(rows_upserted, run_id)
    logger.info(f"[subflow/notify] Notificación enviada correctamente")


# ─────────────────────────────────────────────────────────────
# Flow principal — orquesta los 4 subflows
# ─────────────────────────────────────────────────────────────


@flow(name=PIPELINE_NAME, log_prints=True)
def run_pipeline(week_start: Optional[str] = None) -> dict[str, Any]:
    """
    Flow principal del pipeline de desempeño de negocio.
    
    Orquesta los 4 subflows en secuencia:
    1. subflow_extract_telemetry()   → Lee eventos de telemetría
    2. subflow_transform_kpis()      → Calcula KPIs
    3. subflow_load_reporting()      → Escribe en tabla destino
    4. subflow_notify()              → Notificación (opcional, return_state=True)
    
    Args:
        week_start: Semana ISO a procesar (YYYY-MM-DD).
                    Por defecto: la semana actual.
    
    Returns:
        Dict con metadata de la ejecución
    """
    if week_start is None:
        week_start = _default_week_start()
    
    logger.info("=" * 60)
    logger.info(f"🚀 Iniciando pipeline: {PIPELINE_NAME}")
    logger.info(f"📅 Semana objetivo: {week_start}")
    logger.info("=" * 60)
    
    run_id = str(uuid4())
    started_at = datetime.now(timezone.utc).isoformat()
    
    init_reporting_db()
    
    try:
        # ── 1. Subflow de extracción ──
        events = subflow_extract_telemetry(week_start)
        
        # ── 2. Subflow de transformación ──
        kpi_records = subflow_transform_kpis(events, week_start)
        
        # ── 3. Subflow de carga ──
        rows_upserted = subflow_load_reporting(kpi_records, run_id)
        
        # ── 4. Subflow de notificación (opcional, return_state=True) ──
        # Pasamos return_state=True al invocar el subflow para que Prefect
        # devuelva el estado (State) en vez del resultado. Si falla,
        # el pipeline continúa sin interrupción.
        notify_result = subflow_notify(rows_upserted, run_id, return_state=True)
        
        if notify_result and notify_result.is_failed():
            logger.warning(f"[notify] La notificación falló (ignorado — subflow opcional): {notify_result.message}")
        else:
            logger.info("[notify] Notificación exitosa")
        
        # ── Registrar corrida exitosa ──
        finished_at = datetime.now(timezone.utc).isoformat()
        _log_pipeline_run(run_id, week_start, "Completed",
                          started_at, finished_at,
                          rows_read=len(events),
                          rows_upserted=rows_upserted)
        
        logger.info("✅ Pipeline completado exitosamente")
        logger.info(f"   Eventos leídos: {len(events)}")
        logger.info(f"   Registros KPI generados: {len(kpi_records)}")
        logger.info(f"   Filas upsertadas: {rows_upserted}")
        
        return {
            "status": "Completed",
            "run_id": run_id,
            "week_start": week_start,
            "rows_read": len(events),
            "rows_upserted": rows_upserted,
        }
        
    except Exception as e:
        finished_at = datetime.now(timezone.utc).isoformat()
        _log_pipeline_run(run_id, week_start, "Failed",
                          started_at, finished_at,
                          error_message=str(e))
        
        logger.error(f"❌ Pipeline falló: {e}")
        raise


# ─────────────────────────────────────────────────────────────
# Función auxiliar: registro de log de ejecución
# ─────────────────────────────────────────────────────────────


def _log_pipeline_run(
    run_id: str,
    week_start: str,
    status: str,
    started_at: str,
    finished_at: str,
    rows_read: int = 0,
    rows_upserted: int = 0,
    error_message: Optional[str] = None,
    triggered_by: str = "scheduled",
) -> None:
    """
    Registra la metadata de una corrida en reporting.pipeline_runs.
    
    Campos registrados (10):
    1. run_id          — UUID único de la corrida
    2. pipeline_name   — Nombre del pipeline
    3. status          — Completed / Failed / Running
    4. started_at      — Inicio de ejecución
    5. finished_at     — Fin de ejecución
    6. rows_read       — Eventos leídos de telemetry_events
    7. rows_upserted   — Filas escritas en destino
    8. error_message   — Mensaje de error (si falló)
    9. triggered_by    — scheduled / manual
    10. week_start     — Semana procesada
    """
    with get_reporting_db() as conn:
        conn.execute("""
            INSERT INTO reporting_pipeline_runs
                (run_id, pipeline_name, status, started_at, finished_at,
                 rows_read, rows_upserted, error_message, triggered_by, week_start)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            run_id,
            PIPELINE_NAME,
            status,
            started_at,
            finished_at,
            rows_read,
            rows_upserted,
            error_message,
            triggered_by,
            week_start,
        ))


# ─────────────────────────────────────────────────────────────
# Punto de entrada — ejecución como script CLI
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    """
    Punto de entrada para ejecución directa desde línea de comandos.
    
    Uso:
        python data/pipelines/pipeline.py
        python data/pipelines/pipeline.py --week-start 2026-09-07
        python data/pipelines/pipeline.py --help
    
    Este entrypoint debe seguir funcionando tras el refactor a subflows
    (requisito de la Fase 3 de la Parte 3).
    """
    import argparse
    
    parser = argparse.ArgumentParser(
        description=f"Pipeline ETL: {PIPELINE_NAME} — Produce reporte semanal de desempeño por almacén y cliente"
    )
    parser.add_argument(
        "--week-start",
        type=str,
        default=None,
        help="Semana ISO a procesar (YYYY-MM-DD). Por defecto: la semana actual.",
    )
    parser.add_argument(
        "--db-path",
        type=str,
        default=None,
        help="Ruta al directorio de bases de datos. Por defecto: data/pipelines/",
    )
    
    args = parser.parse_args()
    
    # Si se especificó una ruta de BD, actualizar variable de entorno
    if args.db_path:
        os.environ["PIPELINES_DB_DIR"] = args.db_path
    
    logger.info(f"📦 Prefect versión: {__import__('prefect').__version__}")
    
    result = run_pipeline(week_start=args.week_start)
    
    if result["status"] == "Completed":
        logger.info(f"\n🎉 Pipeline completado con éxito")
        sys.exit(0)
    else:
        logger.error(f"\n❌ Pipeline falló con estado: {result['status']}")
        sys.exit(1)
