"""
services/telemetry/analysis.py — Pipeline de análisis con Pandas

Propósito: Pipeline ETL que carga eventos desde PostgreSQL, los refina con Pandas,
y produce métricas agregadas para el reporte técnico de telemetría (Fase 4).

Flujo (instructor requirement):
    cargar (SQL) → refinar (Pandas) → convertir tipos → agrupar → agregar → devolver

Cada función pública sigue estrictamente ese pipeline y retorna
list[dict] via reset_index().to_dict(orient='records') — sin bucles Python.

Uso (dentro de FastAPI):
    from services.telemetry.analysis import events_per_day, error_rate_by_type
    rows = await load_events(pool, from_date, to_date)
    df = pandas_refine(rows)
    result = events_per_day(df, from_date, to_date)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# Fase 1: Cargar (SQL)
# ═══════════════════════════════════════════════════════════════

async def load_events(
    pool: Any,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[dict[str, Any]]:
    """
    Carga eventos desde PostgreSQL dentro del rango de fechas.
    Retorna list[dict] crudos desde asyncpg.

    Pipeline: cargar (SQL) — primer paso del flujo ETL.
    """
    conditions: list[str] = []
    params: list[Any] = []
    param_idx = 0

    if from_date:
        param_idx += 1
        conditions.append(f'"timestamp" >= ${param_idx}::timestamptz')
        params.append(from_date)
    if to_date:
        param_idx += 1
        conditions.append(f'"timestamp" <= ${param_idx}::timestamptz')
        params.append(to_date)

    where_clause = " AND ".join(conditions) if conditions else "TRUE"

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT
                id,
                "timestamp",
                service,
                event_type,
                level,
                value,
                message,
                tags::text AS tags
            FROM telemetry_events
            WHERE {where_clause}
            ORDER BY "timestamp" ASC
            """,
            *params,
        )

    return [
        {
            "id": str(r["id"]),
            "timestamp": r["timestamp"],
            "service": r["service"],
            "event_type": r["event_type"],
            "level": r["level"],
            "value": float(r["value"]) if r["value"] is not None else None,
            "message": r["message"],
        }
        for r in rows
    ]


# ═══════════════════════════════════════════════════════════════
# Fase 2: Refinar (Pandas)
# ═══════════════════════════════════════════════════════════════

def pandas_refine(rows: list[dict[str, Any]]) -> pd.DataFrame:
    """
    Convierte list[dict] → DataFrame y refina tipos.

    Pipeline: refinar (Pandas) + convertir tipos.
    - Convierte timestamp a datetime UTC
    - Convierte value a float (rellena NaN con 0.0)
    - Convierte level a categoría ordinal

    Instructor requirement: pd.to_datetime(df['timestamp'], utc=True)
    antes de cualquier groupby.
    """
    if not rows:
        return pd.DataFrame(
            columns=["id", "timestamp", "service", "event_type", "level", "value", "message"]
        )

    df = pd.DataFrame(rows)

    # ─── Convertir tipos ───
    # Instructor requirement: usar pd.to_datetime con utc=True
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    # value: float, NaN → 0.0
    df["value"] = pd.to_numeric(df["value"], errors="coerce").fillna(0.0)

    # level: categoría con orden (info < warn < error)
    level_order = pd.CategoricalDtype(["info", "warn", "error"], ordered=True)
    df["level"] = df["level"].astype(level_order)

    logger.debug(
        "Pandas refine complete — %d rows, range=[%s, %s]",
        len(df),
        df["timestamp"].min(),
        df["timestamp"].max(),
    )
    return df


# ═══════════════════════════════════════════════════════════════
# Métrica 1: events_per_day
# ═══════════════════════════════════════════════════════════════

def events_per_day(
    df: pd.DataFrame,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[dict[str, Any]]:
    """
    Agrupa eventos por día calendario (UTC).

    Pipeline: refinar (ya hecho) → agrupar → agregar → devolver.
    - GroupBy: df['timestamp'].dt.date
    - Aggregate: count
    - Return: reset_index().to_dict(orient='records')
      con keys: 'date' (str) y 'count' (int)

    Instructor requirement: Sin bucles — solo Pandas operations.
    """
    if df.empty:
        return []

    grouped = (
        df
        .groupby(df["timestamp"].dt.date, sort=True)
        .agg(count=("id", "count"))
        .reset_index()
        .rename(columns={"timestamp": "date"})
    )

    # Convertir date a string ISO
    grouped["date"] = grouped["date"].astype(str)

    return grouped.to_dict(orient="records")


# ═══════════════════════════════════════════════════════════════
# Métrica 2: error_rate_by_type
# ═══════════════════════════════════════════════════════════════

def error_rate_by_type(
    df: pd.DataFrame,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[dict[str, Any]]:
    """
    Calcula tasa de errores por tipo de evento.

    Pipeline: refinar → agrupar → agregar → devolver.
    - Filtra level == 'error'
    - GroupBy: event_type
    - Aggregate: count
    - Return: reset_index().to_dict(orient='records')
      con keys: 'event_type' (str), 'count' (int), 'percentage' (float)

    Instructor requirement: Sin bucles — solo Pandas operations.
    """
    if df.empty:
        return []

    total = len(df)

    error_counts = (
        df
        .query("level == 'error'")
        .groupby("event_type", sort=True)
        .agg(count=("id", "count"))
        .reset_index()
    )

    if total > 0:
        error_counts["percentage"] = (error_counts["count"] / total * 100).round(2)
    else:
        error_counts["percentage"] = 0.0

    return error_counts.to_dict(orient="records")


# ═══════════════════════════════════════════════════════════════
# Métrica 3: events_by_service
# ═══════════════════════════════════════════════════════════════

def events_by_service(
    df: pd.DataFrame,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[dict[str, Any]]:
    """
    Distribución de eventos por servicio (api, backoffice).

    Pipeline: refinar → agrupar → agregar → devolver.
    - GroupBy: service
    - Aggregate: count, mean(value)
    - Return: reset_index().to_dict(orient='records')
      con keys: 'service' (str), 'count' (int), 'avg_value' (float)

    Instructor requirement: Sin bucles — solo Pandas operations.
    """
    if df.empty:
        return []

    result = (
        df
        .groupby("service", sort=True)
        .agg(count=("id", "count"), avg_value=("value", "mean"))
        .reset_index()
    )

    # Redondear avg_value
    result["avg_value"] = result["avg_value"].round(2)

    return result.to_dict(orient="records")


# ═══════════════════════════════════════════════════════════════
# Métrica 4: level_distribution
# ═══════════════════════════════════════════════════════════════

def level_distribution(
    df: pd.DataFrame,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[dict[str, Any]]:
    """
    Distribución de eventos por nivel de severidad (info, warn, error).

    Pipeline: refinar → agrupar → agregar → devolver.
    - GroupBy: level (ordinal: info < warn < error)
    - Aggregate: count
    - Return: reset_index().to_dict(orient='records')
      con keys: 'level' (str), 'count' (int)

    Instructor requirement: Sin bucles — solo Pandas operations.
    """
    if df.empty:
        return []

    result = (
        df
        .groupby("level", sort=True)
        .agg(count=("id", "count"))
        .reset_index()
    )

    # Convertir categoría a string para JSON
    result["level"] = result["level"].astype(str)

    return result.to_dict(orient="records")


# ═══════════════════════════════════════════════════════════════
# Métrica 5: daily_error_trend
# ═══════════════════════════════════════════════════════════════

def daily_error_trend(
    df: pd.DataFrame,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[dict[str, Any]]:
    """
    Tendencia diaria de errores (solo eventos con level='error').

    Pipeline: refinar → agrupar → agregar → devolver.
    - Filtra level == 'error'
    - GroupBy: día calendario
    - Aggregate: count
    - Return: reset_index().to_dict(orient='records')
      con keys: 'date' (str), 'error_count' (int)

    Instructor requirement: Sin bucles — solo Pandas operations.
    """
    if df.empty:
        return []

    result = (
        df
        .query("level == 'error'")
        .groupby(df["timestamp"].dt.date, sort=True)
        .agg(error_count=("id", "count"))
        .reset_index()
        .rename(columns={"timestamp": "date"})
    )

    result["date"] = result["date"].astype(str)

    return result.to_dict(orient="records")