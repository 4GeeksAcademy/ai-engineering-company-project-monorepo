"""
routes/pipeline.py — Endpoints de estado del pipeline ETL

Propósito: Exponer los datos de reporting.db (KPIs semanales y ejecuciones
del pipeline) para que el backoffice los consuma y muestre el dashboard.

Endpoints:
- GET /pipeline/runs          → Historial de ejecuciones del pipeline
- GET /pipeline/latest-runs   → Últimas N ejecuciones (por defecto 10)
- GET /pipeline/kpis          → KPIs semanales agrupados por almacén/cliente
- GET /pipeline/stats         → Estadísticas resumidas del pipeline

Uso (curl):
    curl http://localhost:8000/pipeline/runs
    curl http://localhost:8000/pipeline/latest-runs?limit=5
    curl http://localhost:8000/pipeline/kpis?week_start=2026-08-31
    curl http://localhost:8000/pipeline/stats
"""

from __future__ import annotations

import logging
import sqlite3
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────


def _get_reporting_db_path() -> Path:
    """
    Resuelve la ruta a reporting.db respetando PIPELINES_DB_DIR.
    Lógica duplicada de data.pipelines.database para no crear
    dependencia circular desde la API.
    """
    env_dir = Path(__file__).parent.parent  # services/api/
    pipelines_root = env_dir.parent.parent / "data" / "pipelines"  # data/pipelines/

    override = __import__("os").environ.get("PIPELINES_DB_DIR")
    if override:
        base = Path(override)
    else:
        base = pipelines_root

    return base / "reporting.db"


def _dict_from_row(cursor: sqlite3.Cursor, row: sqlite3.Row) -> dict[str, Any]:
    """Convierte una sqlite3.Row a dict."""
    return dict(zip([d[0] for d in cursor.description], row))


# ─────────────────────────────────────────────────────────────
# GET /pipeline/runs
# ─────────────────────────────────────────────────────────────


@router.get("/runs")
def get_all_runs() -> list[dict[str, Any]]:
    """
    Devuelve todas las ejecuciones del pipeline ordenadas por fecha descendente.
    """
    db_path = _get_reporting_db_path()
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Reporting DB not found")

    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT * FROM reporting_pipeline_runs ORDER BY started_at DESC"
        )
        rows = [_dict_from_row(cursor, row) for row in cursor.fetchall()]
        conn.close()
        return rows
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────
# GET /pipeline/latest-runs
# ─────────────────────────────────────────────────────────────


@router.get("/latest-runs")
def get_latest_runs(
    limit: int = Query(default=10, ge=1, le=100, description="Número de ejecuciones a devolver"),
) -> list[dict[str, Any]]:
    """
    Devuelve las últimas N ejecuciones del pipeline.
    Útil para el dashboard que muestra el historial reciente.
    """
    db_path = _get_reporting_db_path()
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Reporting DB not found")

    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT * FROM reporting_pipeline_runs ORDER BY started_at DESC LIMIT ?",
            (limit,),
        )
        rows = [_dict_from_row(cursor, row) for row in cursor.fetchall()]
        conn.close()
        return rows
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────
# GET /pipeline/kpis
# ─────────────────────────────────────────────────────────────


@router.get("/kpis")
def get_kpis(
    week_start: str | None = Query(default=None, description="Semana en formato YYYY-MM-DD"),
) -> list[dict[str, Any]]:
    """
    Devuelve los KPIs semanales. Opcionalmente filtrados por semana.
    """
    db_path = _get_reporting_db_path()
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Reporting DB not found")

    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row

        if week_start:
            cursor = conn.execute(
                "SELECT * FROM reporting_weekly_warehouse_client_performance WHERE week_start = ? ORDER BY warehouse, client_id",
                (week_start,),
            )
        else:
            cursor = conn.execute(
                "SELECT * FROM reporting_weekly_warehouse_client_performance ORDER BY week_start DESC, warehouse, client_id"
            )

        rows = [_dict_from_row(cursor, row) for row in cursor.fetchall()]
        conn.close()
        return rows
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────
# GET /pipeline/stats
# ─────────────────────────────────────────────────────────────


@router.get("/stats")
def get_pipeline_stats() -> dict[str, Any]:
    """
    Devuelve estadísticas resumidas del pipeline:
    - total_runs: ejecuciones totales
    - completed_runs: ejecuciones exitosas
    - failed_runs: ejecuciones fallidas
    - last_run: información de la última ejecución
    - rows_processed: total de filas leídas y upserteadas
    - weeks_with_data: número de semanas con KPIs calculados
    """
    db_path = _get_reporting_db_path()
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Reporting DB not found")

    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT * FROM reporting_pipeline_runs ORDER BY started_at DESC LIMIT 1")
        last_run_row = cursor.fetchone()
        last_run = _dict_from_row(cursor, last_run_row) if last_run_row else None

        cursor = conn.execute("SELECT COUNT(*) as total FROM reporting_pipeline_runs")
        total_runs = cursor.fetchone()["total"]

        cursor = conn.execute(
            "SELECT COUNT(*) as cnt FROM reporting_pipeline_runs WHERE status = 'Completed'"
        )
        completed_runs = cursor.fetchone()["cnt"]

        cursor = conn.execute(
            "SELECT COUNT(*) as cnt FROM reporting_pipeline_runs WHERE status = 'Failed'"
        )
        failed_runs = cursor.fetchone()["cnt"]

        cursor = conn.execute(
            "SELECT COALESCE(SUM(rows_read), 0) as total_read, COALESCE(SUM(rows_upserted), 0) as total_upserted FROM reporting_pipeline_runs"
        )
        row = cursor.fetchone()
        rows_read = row["total_read"]
        rows_upserted = row["total_upserted"]

        cursor = conn.execute(
            "SELECT COUNT(DISTINCT week_start) as weeks FROM reporting_weekly_warehouse_client_performance"
        )
        weeks_with_data = cursor.fetchone()["weeks"]

        conn.close()

        return {
            "total_runs": total_runs,
            "completed_runs": completed_runs,
            "failed_runs": failed_runs,
            "success_rate": round(completed_runs / total_runs * 100, 1) if total_runs > 0 else 0.0,
            "last_run": last_run,
            "rows_read_total": rows_read,
            "rows_upserted_total": rows_upserted,
            "weeks_with_kpis": weeks_with_data,
        }
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=str(exc))