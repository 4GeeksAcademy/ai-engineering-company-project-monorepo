"""
routes/telemetry.py — Stub endpoint de telemetría

Propósito: Endpoint temporal para verificar que los eventos de telemetría
llegan con el formato correcto desde el frontend. No persiste nada aún.

En la Fase 3 (próximo proyecto) se reemplazará con la implementación real
incluyendo validación completa y persistencia en Supabase.

Endpoints:
- POST /telemetry/events → Recibe un batch de eventos y los valida

Uso:
    curl -X POST http://localhost:8000/telemetry/events \
      -H "Content-Type: application/json" \
      -d '{"events": [{"eventId": "...", "event_type": "session_started", ...}]}'
"""

from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# ─────────────────────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────────────────────

# Leer endpoint desde variable de entorno para establecer el patrón desde ya
# (En el futuro apuntará al endpoint real con persistencia)
TELEMETRY_ENDPOINT = os.getenv("TELEMETRY_ENDPOINT", "")


# ─────────────────────────────────────────────────────────────
# Modelos Pydantic — Reutilizables en Fase 3
# ─────────────────────────────────────────────────────────────

class TelemetryEvent(BaseModel):
    """
    Modelo del Event Envelope estándar de TrackFlow.

    Todo evento de telemetría debe cumplir con esta estructura.
    Los campos eventId, timestamp, sessionId, userId, schemaVersion y requestId
    son generados automáticamente por el TelemetryService del frontend.

    Este modelo se reutilizará tal cual en la Fase 3 (persistencia real).
    """
    eventId: str = Field(..., description="UUID v4 — Identificador único del evento")
    timestamp: str = Field(..., description="ISO 8601 UTC — Momento exacto de captura")
    sessionId: str = Field(..., description="UUID v4 — Identificador de sesión")
    userId: str = Field(..., description="UUID v4 — ID del usuario autenticado")
    event_type: str = Field(..., pattern=r"^[a-z]+_[a-z]+$", description="Taxonomía entidad_acción")
    schemaVersion: str = Field(..., pattern=r"^\d+\.\d+$", description="Versión del esquema")
    requestId: str = Field(..., description="UUID v4 — Correlación frontend-backend-logs")
    properties: dict[str, Any] = Field(default_factory=dict, description="Payload específico del evento")


class TelemetryBatchRequest(BaseModel):
    """Payload para POST /telemetry/events — Array de eventos."""
    events: list[TelemetryEvent]


class TelemetryBatchResponse(BaseModel):
    """Respuesta del stub endpoint."""
    received: int


# ─────────────────────────────────────────────────────────────
# POST /telemetry/events — Stub de recepción
# ─────────────────────────────────────────────────────────────

@router.post("/events", response_model=TelemetryBatchResponse)
async def receive_events(batch: TelemetryBatchRequest) -> TelemetryBatchResponse:
    """
    Recibe un batch de eventos de telemetría desde el frontend.

    Fase actual (Stub):
    - Valida el formato del payload mediante Pydantic
    - Loggea el número de eventos recibidos y sus event_type
    - Retorna 200 OK con el conteo

    Fase 3 (futuro):
    - Validará contra el esquema JSON de cada evento
    - Persistirá en Supabase
    - Retornará errores específicos por evento inválido
    """
    event_count = len(batch.events)
    event_types = [e.event_type for e in batch.events]

    logger.info(
        "Telemetry batch received — count=%d, types=%s",
        event_count,
        event_types,
    )

    # Log detallado de cada evento para depuración en desarrollo
    for event in batch.events:
        logger.debug(
            "Event — id=%s type=%s userId=%s sessionId=%s",
            event.eventId,
            event.event_type,
            event.userId,
            event.sessionId,
        )

    return TelemetryBatchResponse(received=event_count)