"""
reporting_routes.py — Endpoints de reporting del pipeline de desempeño de negocio

Propósito:
    Implementa los 3 endpoints requeridos para la Fase 5:
    1. GET  /reporting/weekly-warehouse-client-performance — Consulta KPIs
    2. GET  /reporting/pipeline-runs/latest — Metadata de última corrida
    3. POST /reporting/pipeline-runs — Disparar corrida manual

Importa funciones desde data/pipelines/pipeline.py y data/pipelines/database.py
— no duplica la lógica del pipeline (se mantiene DRY).

Uso (montado en main.py):
    app.include_router(reporting_router)

Ver también:
    CONTEXT-trackflow.md sección 6 — contrato exacto de los endpoints
    data/pipelines/PIPELINE_DESIGN.md — diseño completo del pipeline
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# ── Importar desde data/pipelines/ (no duplicar lógica) ──
# El pipeline importa sus propias funciones; aquí solo llamamos
# a las que necesitamos para consultar resultados y disparar corridas.
from data.pipelines.database import get_reporting_db, init_reporting_db
from data.pipelines.pipeline import run_pipeline, PIPELINE_NAME

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reporting", tags=["reporting"])


# ─────────────────────────────────────────────────────────────
# Modelos de respuesta Pydantic
# ─────────────────────────────────────────────────────────────


class KPIRow(BaseModel):
    """Una fila del reporte semanal de desempeño."""
    warehouse: str
    client_id: str
    inbound_units_count: int
    outbound_orders_count: int
    stockout_events_count: int
    discrepancy_events_count: int
    discrepancy_rate: float


class KPIsResponse(BaseModel):
    """Respuesta del endpoint de consulta de KPIs."""
    week_start: str
    entries: list[KPIRow]


class PipelineRunMetadata(BaseModel):
    """Metadata de una corrida del pipeline."""
    run_id: str
    pipeline_name: str
    status: str
    started_at: str
    finished_at: Optional[str] = None
    rows_read: int = 0
    rows_upserted: int = 0
    error_message: Optional[str] = None
    triggered_by: str = "scheduled"
    week_start: str


class PipelineRunResponse(BaseModel):
    """Respuesta al disparar una corrida manual."""
    status: str
    run_id: str
    week_start: str
    rows_read: int
    rows_upserted: int


# ─────────────────────────────────────────────────────────────
# Endpoint 1 — Consultar KPIs semanales
# ─────────────────────────────────────────────────────────────


@router.get("/weekly-warehouse-client-performance", response_model=KPIsResponse)
def get_weekly_performance(
    week_start: Optional[str] = Query(
        default=None,
        description="Semana ISO a consultar (YYYY-MM-DD). Por defecto: la última semana con datos."
    )
) -> KPIsResponse:
    """
    Endpoint 1/3 — Consulta las filas de KPIs de la tabla destino.
    
    Devuelve todas las combinaciones warehouse/client_id para la semana
    especificada, con los 4 KPIs calculados.
    
    Este es el endpoint que consumirá el dashboard de la Parte 3.
    
    Args:
        week_start: Semana ISO en formato YYYY-MM-DD.
                    Si no se especifica, devuelve la semana más reciente
                    que tenga datos en la tabla.
    
    Returns:
        KPIsResponse con week_start y lista de entries.
    
    Contrato (CONTEXT-trackflow.md sección 6):
        GET /reporting/weekly-warehouse-client-performance?week_start=2026-07-13
        {
            "week_start": "2026-07-13",
            "entries": [
                {
                    "warehouse": "los_angeles",
                    "client_id": "fashion-co",
                    "inbound_units_count": 4200,
                    "outbound_orders_count": 980,
                    "stockout_events_count": 3,
                    "discrepancy_events_count": 2,
                    "discrepancy_rate": 0.002
                }
            ]
        }
    """
    # Si no se especificó semana, obtener la más reciente
    if week_start is None:
        week_start = _get_latest_week_start()
        if week_start is None:
            raise HTTPException(
                status_code=404,
                detail="No hay datos de KPIs disponibles. Ejecuta el pipeline primero."
            )
    
    try:
        with get_reporting_db() as conn:
            rows = conn.execute(
                """
                SELECT warehouse, client_id,
                       inbound_units_count, outbound_orders_count,
                       stockout_events_count, discrepancy_events_count,
                       discrepancy_rate
                FROM reporting_weekly_warehouse_client_performance
                WHERE week_start = ?
                ORDER BY warehouse, client_id
                """,
                (week_start,)
            ).fetchall()
    except Exception as e:
        logger.error(f"Error consultando KPIs: {e}")
        raise HTTPException(status_code=500, detail="Error interno al consultar KPIs")
    
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontraron datos para la semana {week_start}"
        )
    
    entries = [KPIRow(**dict(row)) for row in rows]
    
    return KPIsResponse(week_start=week_start, entries=entries)


# ─────────────────────────────────────────────────────────────
# Endpoint 2 — Consultar última corrida
# ─────────────────────────────────────────────────────────────


@router.get("/pipeline-runs/latest", response_model=PipelineRunMetadata)
def get_latest_run() -> PipelineRunMetadata:
    """
    Endpoint 2/3 — Devuelve la metadata de la última corrida del pipeline.
    
    Información devuelta:
    - Estado (Completed / Failed / Running)
    - Hora de inicio y fin
    - Registros leídos y escritos
    - Mensaje de error (si falló)
    
    Esto permite al dashboard (Parte 3) mostrar el estado de salud
    del pipeline sin necesidad de acceder a la base de datos directamente.
    """
    try:
        with get_reporting_db() as conn:
            row = conn.execute(
                """
                SELECT run_id, pipeline_name, status,
                       started_at, finished_at,
                       rows_read, rows_upserted,
                       error_message, triggered_by, week_start
                FROM reporting_pipeline_runs
                WHERE pipeline_name = ?
                ORDER BY started_at DESC
                LIMIT 1
                """,
                (PIPELINE_NAME,)
            ).fetchone()
    except Exception as e:
        logger.error(f"Error consultando última corrida: {e}")
        raise HTTPException(status_code=500, detail="Error interno al consultar corridas")
    
    if row is None:
        raise HTTPException(
            status_code=404,
            detail="No hay corridas registradas. Ejecuta el pipeline primero."
        )
    
    return PipelineRunMetadata(**dict(row))


# ─────────────────────────────────────────────────────────────
# Endpoint 3 — Disparar corrida manual
# ─────────────────────────────────────────────────────────────


@router.post("/pipeline-runs", response_model=PipelineRunResponse)
def trigger_pipeline_run(
    week_start: Optional[str] = Query(
        default=None,
        description="Semana ISO a procesar (YYYY-MM-DD). Por defecto: la semana actual."
    )
) -> PipelineRunResponse:
    """
    Endpoint 3/3 — Dispara una corrida manual del pipeline.
    
    Importa y ejecuta el flow run_pipeline() desde data/pipelines/pipeline.py
    — no duplica la lógica ETL aquí.
    
    Args:
        week_start: Semana ISO opcional. Si no se especifica, procesa
                    la semana actual.
    
    Returns:
        PipelineRunResponse con status, run_id, week_start y métricas.
    
    Uso:
        curl -X POST "http://localhost:8000/reporting/pipeline-runs?week_start=2026-09-07"
    """
    # Verificar que las tablas de reporting existen
    init_reporting_db()
    
    try:
        # Llamar al flow principal de Prefect desde data/pipelines/
        # Esta es la función importada — no reescribimos la lógica aquí
        result = run_pipeline(week_start=week_start)
    except Exception as e:
        logger.error(f"Error ejecutando pipeline manual: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"El pipeline falló: {str(e)}"
        )
    
    return PipelineRunResponse(
        status=result.get("status", "Completed"),
        run_id=result.get("run_id", ""),
        week_start=result.get("week_start", ""),
        rows_read=result.get("rows_read", 0),
        rows_upserted=result.get("rows_upserted", 0),
    )


# ─────────────────────────────────────────────────────────────
# Función auxiliar
# ─────────────────────────────────────────────────────────────


def _get_latest_week_start() -> Optional[str]:
    """
    Obtiene la semana más reciente que tenga datos en la tabla de KPIs.
    
    Returns:
        week_start en formato YYYY-MM-DD, o None si no hay datos.
    """
    try:
        with get_reporting_db() as conn:
            row = conn.execute(
                """
                SELECT week_start
                FROM reporting_weekly_warehouse_client_performance
                ORDER BY week_start DESC
                LIMIT 1
                """
            ).fetchone()
        return row["week_start"] if row else None
    except Exception:
        return None