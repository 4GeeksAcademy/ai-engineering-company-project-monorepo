"""
routes/telemetry.py — Endpoint de telemetría con persistencia en PostgreSQL

Propósito: Endpoint real que recibe eventos de telemetría desde el frontend,
los valida uno por uno y persiste los válidos en PostgreSQL (telemetry_events).

Fase 3 — Telemetría de tu compañía: Almacenamiento
- Validación por evento (no batch-level 422)
- Bulk insert en una sola operación
- Respuesta { received, stored, rejected }
- Tabla write-only (append-only)

Endpoints:
- POST /telemetry/events → Recibe, valida y persiste eventos

Uso:
    curl -X POST http://localhost:8000/telemetry/events \
      -H "Content-Type: application/json" \
      -d '{"events": [{"eventId": "...", "event_type": "session_started", ...}]}'
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from core.database import get_pool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# ─────────────────────────────────────────────────────────────
# Modelos Pydantic — Reutilizados desde Fase 2
# ─────────────────────────────────────────────────────────────

class TelemetryEvent(BaseModel):
    """
    Modelo del Event Envelope estándar de TrackFlow.

    Todo evento de telemetría debe cumplir con esta estructura.
    Los campos eventId, timestamp, sessionId, userId, schemaVersion y requestId
    son generados automáticamente por el TelemetryService del frontend.

    Este modelo se reutiliza tal cual desde la Fase 2 (sin cambios).
    """
    eventId: str = Field(..., description="UUID v4 — Identificador único del evento")
    timestamp: str = Field(..., description="ISO 8601 UTC — Momento exacto de captura")
    sessionId: str = Field(..., description="UUID v4 — Identificador de sesión")
    userId: str = Field(..., description="UUID v4 — ID del usuario autenticado")
    event_type: str = Field(..., pattern=r"^[a-z]+(_[a-z]+)+$", description="Taxonomía entidad_acción")
    schemaVersion: str = Field(..., pattern=r"^\d+\.\d+$", description="Versión del esquema")
    requestId: str = Field(..., description="UUID v4 — Correlación frontend-backend-logs")
    properties: dict[str, Any] = Field(default_factory=dict, description="Payload específico del evento")


class TelemetryBatchRequest(BaseModel):
    """Payload para POST /telemetry/events — Array de eventos (raw dicts)."""
    events: list[dict[str, Any]]


class TelemetryBatchResponse(BaseModel):
    """Respuesta del endpoint con conteos detallados."""
    received: int
    stored: int
    rejected: int


# ─────────────────────────────────────────────────────────────
# Mapeo de niveles de severidad basado en event_type
# ─────────────────────────────────────────────────────────────

def _derive_level(event_type: str) -> str:
    """
    Deriva el nivel de severidad según la taxonomía del evento.
    - Eventos que terminan en _error → 'error'
    - Eventos de threshold/fallo → 'warn'
    - Demás eventos → 'info'
    """
    if event_type.endswith("_error") or event_type.endswith("_failed"):
        return "error"
    if event_type.endswith("_rejected") or event_type.endswith("_triggered"):
        return "warn"
    return "info"


def _derive_service(event: dict[str, Any]) -> str:
    """
    Deriva el servicio de origen del evento.
    - Si el event_type contiene 'api_' → 'api'
    - Si contiene 'page_' o 'session_' o 'login_' → 'backoffice'
    - Por defecto → 'api'
    """
    event_type = event.get("event_type", "")
    if event_type.startswith("api_"):
        return "api"
    if any(event_type.startswith(p) for p in ("page_", "session_", "login_", "logout_", "reset_")):
        return "backoffice"
    return "api"


def _extract_message(event_type: str, properties: dict[str, Any]) -> str | None:
    """
    Extrae un mensaje legible del evento si es posible.
    """
    msg_map = {
        "inbound_order_created": "Inbound order created",
        "outbound_order_created": "Outbound order created",
        "stock_threshold_triggered": "Stock threshold triggered",
        "direct_stock_edit_rejected": "Direct stock edit rejected",
        "inventory_discrepancy_detected": "Inventory discrepancy detected",
        "session_started": "Session started",
        "page_navigated": f"Page navigated: {properties.get('page', 'unknown')}",
        "login_attempted": "Login attempted",
        "login_failed": "Login failed",
        "login_succeeded": "Login succeeded",
        "api_validation_error": f"Validation error: {properties.get('error', 'unknown')}",
        "api_endpoint_error": f"API error: {properties.get('endpoint', 'unknown')}",
    }
    return msg_map.get(event_type)


def _extract_value(properties: dict[str, Any]) -> float | None:
    """
    Extrae un valor numérico del evento si aplica.
    """
    return properties.get("quantity") or properties.get("value") or properties.get("duration_ms")


def _build_tags(event: dict[str, Any]) -> dict[str, Any]:
    """
    Construye el campo tags combinando:
    - Envelope fields: eventId, sessionId, userId, schemaVersion, requestId
    - Properties del evento (si no es un campo ya mapeado)
    - Context-specific dimensions de telemetry-plan.md
    """
    tags = {
        "eventId": event.get("eventId"),
        "sessionId": event.get("sessionId"),
        "userId": event.get("userId"),
        "schemaVersion": event.get("schemaVersion"),
        "requestId": event.get("requestId"),
    }

    # Añadir propiedades específicas del evento (allowlist contextual)
    properties = event.get("properties", {}) or {}
    for key in ("warehouse", "client_id", "product_id", "product_category",
                 "page", "component", "method", "status_code", "error",
                 "endpoint", "duration_ms"):
        if key in properties:
            tags[key] = properties[key]

    return tags


# ─────────────────────────────────────────────────────────────
# POST /telemetry/events — Endpoint real con persistencia
# ─────────────────────────────────────────────────────────────

@router.post("/events", response_model=TelemetryBatchResponse)
async def receive_events(batch: TelemetryBatchRequest) -> TelemetryBatchResponse:
    """
    Recibe un batch de eventos de telemetría, los valida uno por uno,
    y persiste los válidos en PostgreSQL mediante bulk insert.

    Comportamiento:
    - El envelope se parsea suelto (list[dict], NO list[TelemetryEvent])
      para evitar que un solo evento inválido cause 422 en todo el batch
    - Cada evento se valida con TelemetryEvent.model_validate() en try/except
    - Eventos inválidos incrementan 'rejected' pero NO abortan el batch
    - Los eventos válidos se insertan en una sola operación bulk INSERT

    Response: { "received": N, "stored": M, "rejected": R }

    Frontend: Sin cambios — misma URL, mismo formato de respuesta.
    """
    raw_events = batch.events
    total_received = len(raw_events)

    if not raw_events:
        return TelemetryBatchResponse(received=0, stored=0, rejected=0)

    logger.info(
        "Telemetry batch received — count=%d",
        total_received,
    )

    # ─────────────────────────────────────────────────────────────
    # Fase 1: Validación por evento (per-event parsing)
    # ─────────────────────────────────────────────────────────────
    valid_records: list[dict[str, Any]] = []
    rejected_count = 0

    for raw in raw_events:
        try:
            # Validar contra TelemetryEvent (reutilizado desde Fase 2)
            event = TelemetryEvent.model_validate(raw)

            # Construir registro para inserción en PostgreSQL
            properties = event.properties or {}
            # Convertir ISO timestamp string a datetime para asyncpg
            ts_str = event.timestamp
            try:
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                ts = datetime.utcnow()

            record = {
                "timestamp": ts,
                "service": _derive_service(raw),
                "event_type": event.event_type,
                "level": _derive_level(event.event_type),
                "value": _extract_value(properties),
                "message": _extract_message(event.event_type, properties),
                "tags": json.dumps(_build_tags(raw)),
            }
            valid_records.append(record)

        except Exception as exc:
            logger.warning("Telemetry event rejected — %s", exc)
            rejected_count += 1

    # ─────────────────────────────────────────────────────────────
    # Fase 2: Bulk insert (una sola operación)
    # ─────────────────────────────────────────────────────────────
    stored_count = 0
    if valid_records:
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Bulk insert: todos los registros en una sola sentencia
                # Usamos executemany con la misma query parametrizada
                await conn.executemany(
                    """
                    INSERT INTO telemetry_events
                        ("timestamp", service, event_type, level, value, message, tags)
                    VALUES
                        ($1::timestamptz, $2::text, $3::text, $4::text, $5::numeric, $6::text, $7::jsonb)
                    """,
                    [
                        (
                            r["timestamp"],
                            r["service"],
                            r["event_type"],
                            r["level"],
                            r["value"],
                            r["message"],
                            r["tags"],
                        )
                        for r in valid_records
                    ],
                )
            stored_count = len(valid_records)
            logger.info(
                "Telemetry batch stored — stored=%d, rejected=%d",
                stored_count,
                rejected_count,
            )

        except Exception as exc:
            logger.error("Telemetry batch insert failed — %s", exc)
            # Si falla la BD, devolvemos los conteos pero stored=0
            # para que el frontend sepa que no se persistió nada
            stored_count = 0

    return TelemetryBatchResponse(
        received=total_received,
        stored=stored_count,
        rejected=rejected_count,
    )