"""
analysis_models.py — Modelos Pydantic para el análisis de incidencias

Estructura del dict devuelto por analyze_incidents():
{
  "total_records": int,
  "valid_records": int,
  "invalid_records": int,
  "invalid_breakdown": dict[str, int],
  "primary_invalid_breakdown": dict[str, int],
  "by_category": dict[str, int],
  "by_status": dict[str, int],
  "by_country": dict[str, int],
  "satisfaction": {
    "scored_incidents": int,
    "total_closed": int,
    "average": float,
    "distribution": dict[str, int],
  },
  "percentages": {
    "category": dict[str, float],
    "status": dict[str, float],
    "country": dict[str, float],
  },
}
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class SatisfactionSummary(BaseModel):
    """Resumen de satisfacción de incidencias cerradas."""
    scored_incidents: int = Field(..., description="Número de incidencias cerradas con puntuación")
    total_closed: int = Field(..., description="Total de incidencias cerradas")
    average: float = Field(..., description="Puntuación media")
    distribution: dict[str, int] = Field(..., description="Distribución de puntuaciones (1-5)")


class PercentageBreakdown(BaseModel):
    """Desglose porcentual."""
    category: dict[str, float] = Field(..., description="Porcentaje por categoría")
    status: dict[str, float] = Field(..., description="Porcentaje por estado")
    country: dict[str, float] = Field(..., description="Porcentaje por país")


class AnalysisResponse(BaseModel):
    """Respuesta del análisis de incidencias subidas vía CSV."""
    total_records: int = Field(..., description="Total de registros procesados")
    valid_records: int = Field(..., description="Registros válidos")
    invalid_records: int = Field(..., description="Registros inválidos")
    invalid_breakdown: dict[str, int] = Field(..., description="Desglose de errores por regla")
    primary_invalid_breakdown: dict[str, int] = Field(..., description="Desglose de errores primarios")
    by_category: dict[str, int] = Field(..., description="Conteo por categoría")
    by_status: dict[str, int] = Field(..., description="Conteo por estado")
    by_country: dict[str, int] = Field(..., description="Conteo por país")
    satisfaction: SatisfactionSummary = Field(..., description="Resumen de satisfacción")
    percentages: PercentageBreakdown = Field(..., description="Desglose porcentual")


class AppInfo(BaseModel):
    """Información básica de la aplicación."""
    app: str = Field(..., description="Nombre de la aplicación")
    docs: str = Field(..., description="URL de la documentación")
    health: str = Field(..., description="URL del health check")
    endpoints: dict[str, str] = Field(..., description="Mapa de endpoints disponibles")


class HealthResponse(BaseModel):
    """Respuesta del health check."""
    status: str = Field(..., description="Estado del servidor")