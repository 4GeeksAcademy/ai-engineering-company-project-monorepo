from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel
from sqlalchemy import text

from services.api.database import engine
from services.api.routes.auth import get_current_user
from data.pipelines.pipeline import business_performance_flow

router= APIRouter(prefix="/reporting", tags=["Reporting & Business KPIs"])

class TriggerRequest(BaseModel):
    window_date: Optional[str] = None

@router.get("/status")
def get_pipeline_status(current_user: dict= Depends(get_current_user)) -> Dict[str, Any]:
    dialect = engine.dialect.name
    table_name = "reporting.pipeline_runs" if dialect == "postgresql" else "reporting_pipeline_runs"

    query = text (f"""
    SELECT run_id, flow_name, started_at, finished_at, status, records_processed, error_message
        FROM {table_name}
        ORDER BY started_at DESC
        LIMIT 1
    """)

    with engine.connect() as conn:
        row = conn.execute(query).fetchone()
    
    if not row:
        return {
            "status": "NO_RUNS_RECORDED",
            "message": "Aún no se han ejecutado corridas del pipeline de negocio"
        }
    
    return {
        "run_id": str(row[0]),
        "flow_name": row[1],
        "started_at": str(row[2]),
        "finished_at": str(row[3]) if row[3] else None,
        "status": row[4],
        "records_processed": row[5],
        "error_message": row[6]
    }

from services.celery_app import run_business_performance_pipeline

@router.post("/trigger", status_code=202)
def trigger_pipeline_run(
    payload: Optional[TriggerRequest] = None,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    target_date = payload.window_date if payload and payload.window_date else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Encolar en Celery desacoplado de la API
    task = run_business_performance_pipeline.delay(target_date)

    return {
        "task_id": str(task.id),
        "status": "pending",
        "message": f"Corrida del pipeline encolada exitosamente para la fecha {target_date}.",
        "target_date": target_date
    }


@router.get("/kpis")
def get_business_kpis(
    department: Optional[str] = Query(None, description="Filtrar por departamento: customer_support o talent_acquisition"),
    start_date: Optional[str] = Query(None, description="Fecha de inicio (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Fecha de fin (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    (3) Consulta las filas de KPIs de la tabla de destino del CONTEXT (reporting.executive_kpis).
    Contrato preparado para el dashboard ejecutivo de la Parte 3.
    Protegido con Auth Guard.
    """
    dialect = engine.dialect.name
    table_name = "reporting.executive_kpis" if dialect == "postgresql" else "reporting_executive_kpis"
    clauses = ["1=1"]
    params: Dict[str, Any] = {}
    if department:
        clauses.append("department = :department")
        params["department"] = department
    if start_date:
        clauses.append("window_date >= :start_date")
        params["start_date"] = start_date
    if end_date:
        clauses.append("window_date <= :end_date")
        params["end_date"] = end_date
    where_str = " AND ".join(clauses)
    query = text(f"""
        SELECT kpi_id, window_date, window_granularity, department, metric_name, metric_value, target_value, sla_status, calculated_at, run_id
        FROM {table_name}
        WHERE {where_str}
        ORDER BY window_date DESC, department ASC, metric_name ASC
    """)
    with engine.connect() as conn:
        rows = conn.execute(query, params).fetchall()
    kpi_list = []
    for r in rows:
        kpi_list.append({
            "kpi_id": str(r[0]),
            "window_date": str(r[1]),
            "window_granularity": r[2],
            "department": r[3],
            "metric_name": r[4],
            "metric_value": float(r[5]),
            "target_value": float(r[6]),
            "sla_status": r[7],
            "calculated_at": str(r[8]),
            "run_id": str(r[9])
        })
    return {
        "total_kpis": len(kpi_list),
        "department_filter": department,
        "kpis": kpi_list
    }
