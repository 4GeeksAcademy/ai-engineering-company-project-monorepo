"""
routes/telemetry.py — Endpoint de telemetría con persistencia PostgreSQL y consulta

Propósito: Endpoint real que recibe eventos de telemetría desde el frontend,
los valida uno por uno, persiste los válidos en PostgreSQL (telemetry_events),
y expone endpoints GET para consulta y reporte técnico.

Fase 3 — Telemetría de tu compañía: Almacenamiento
- Validación por evento (no batch-level 422)
- Bulk insert en una sola operación
- Respuesta { received, stored, rejected }
- Tabla write-only (append-only)

Fase 4 — Telemetría de tu compañía: Reporte técnico
- GET /telemetry/events → Consultar eventos con filtros
- GET /telemetry/summary → Datos agregados para dashboard

Endpoints:
- POST /telemetry/events → Recibe, valida y persiste eventos
- GET  /telemetry/events → Consulta eventos (filtros: event_type, service, level, from_date, to_date, limit, offset)
- GET  /telemetry/summary  → Resumen agregado (conteos por tipo, servicio, nivel, día)

Uso:
    curl -X POST http://localhost:8000/telemetry/events \
      -H "Content-Type: application/json" \
      -d '{"events": [{"eventId": "...", "event_type": "session_started", ...}]}'
    curl "http://localhost:8000/telemetry/events?event_type=login_attempted&limit=10"
    curl "http://localhost:8000/telemetry/summary"
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


# ─────────────────────────────────────────────────────────────
# Modelos para respuesta de consulta (GET)
# ─────────────────────────────────────────────────────────────

class TelemetryEventRecord(BaseModel):
    """Un registro de telemetría tal como se devuelve desde la BD."""
    id: str
    timestamp: str
    service: str
    event_type: str
    level: str
    value: float | None
    message: str | None
    tags: dict[str, Any]


class TelemetryQueryResponse(BaseModel):
    """Respuesta paginada de eventos."""
    events: list[TelemetryEventRecord]
    total: int
    limit: int
    offset: int


class TelemetrySummaryItem(BaseModel):
    """Elemento individual en un resumen agregado."""
    label: str
    count: int


class TelemetrySummaryResponse(BaseModel):
    """Resumen completo de telemetría para el dashboard."""
    total_events: int
    by_event_type: list[TelemetrySummaryItem]
    by_service: list[TelemetrySummaryItem]
    by_level: list[TelemetrySummaryItem]
    by_day: list[TelemetrySummaryItem]
    recent_events: list[TelemetryEventRecord]


# ─────────────────────────────────────────────────────────────
# GET /telemetry/events — Consultar eventos con filtros
# ─────────────────────────────────────────────────────────────

@router.get("/events", response_model=TelemetryQueryResponse)
async def query_events(
    event_type: str | None = None,
    service: str | None = None,
    level: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> TelemetryQueryResponse:
    """
    Consulta eventos de telemetría con filtros opcionales.

    - event_type: Filtrar por tipo de evento (ej. login_attempted)
    - service: Filtrar por servicio (backoffice, api)
    - level: Filtrar por nivel (info, warn, error)
    - from_date: Filtro desde (ISO 8601)
    - to_date: Filtro hasta (ISO 8601)
    - limit: Máximo de registros (default 50, max 1000)
    - offset: Paginación
    """
    try:
        pool = await get_pool()
    except RuntimeError:
        return TelemetryQueryResponse(events=[], total=0, limit=limit, offset=offset)

    limit = min(limit, 1000)

    # Construir WHERE dinámico
    conditions: list[str] = []
    params: list[Any] = []
    param_idx = 0

    if event_type:
        param_idx += 1
        conditions.append(f"event_type = ${param_idx}::text")
        params.append(event_type)
    if service:
        param_idx += 1
        conditions.append(f"service = ${param_idx}::text")
        params.append(service)
    if level:
        param_idx += 1
        conditions.append(f"level = ${param_idx}::text")
        params.append(level)
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
        # Count total
        count_sql = f"SELECT COUNT(*) FROM telemetry_events WHERE {where_clause}"
        total_row = await conn.fetchrow(count_sql, *params)
        total = total_row[0]

        # Query rows
        param_idx += 1
        query_sql = f"""
            SELECT id, "timestamp", service, event_type, level, value, message, tags
            FROM telemetry_events
            WHERE {where_clause}
            ORDER BY "timestamp" DESC
            LIMIT ${param_idx}::integer
        """
        params.append(limit)
        param_idx += 1
        query_sql += f" OFFSET ${param_idx}::integer"
        params.append(offset)

        rows = await conn.fetch(query_sql, *params)

    events = [
        TelemetryEventRecord(
            id=str(row["id"]),
            timestamp=row["timestamp"].isoformat(),
            service=row["service"],
            event_type=row["event_type"],
            level=row["level"],
            value=float(row["value"]) if row["value"] is not None else None,
            message=row["message"],
            tags=row["tags"] if isinstance(row["tags"], dict) else {},
        )
        for row in rows
    ]

    return TelemetryQueryResponse(
        events=events,
        total=total,
        limit=limit,
        offset=offset,
    )


# ─────────────────────────────────────────────────────────────
# GET /telemetry/summary — Resumen agregado para dashboard
# ─────────────────────────────────────────────────────────────

@router.get("/summary", response_model=TelemetrySummaryResponse)
async def get_summary() -> TelemetrySummaryResponse:
    """
    Retorna un resumen agregado de todos los eventos de telemetría.

    Incluye:
    - total_events: Conteo total
    - by_event_type: Conteo agrupado por tipo de evento
    - by_service: Conteo agrupado por servicio (backoffice, api)
    - by_level: Conteo agrupado por nivel (info, warn, error)
    - by_day: Conteo agrupado por día (últimos 30 días)
    - recent_events: Últimos 10 eventos
    """
    try:
        pool = await get_pool()
    except RuntimeError:
        return TelemetrySummaryResponse(
            total_events=0,
            by_event_type=[],
            by_service=[],
            by_level=[],
            by_day=[],
            recent_events=[],
        )

    async with pool.acquire() as conn:
        # Total
        total_row = await conn.fetchval("SELECT COUNT(*) FROM telemetry_events")

        # By event_type (top 20)
        type_rows = await conn.fetch("""
            SELECT event_type AS label, COUNT(*) AS count
            FROM telemetry_events
            GROUP BY event_type
            ORDER BY count DESC
            LIMIT 20
        """)

        # By service
        service_rows = await conn.fetch("""
            SELECT service AS label, COUNT(*) AS count
            FROM telemetry_events
            GROUP BY service
            ORDER BY count DESC
        """)

        # By level
        level_rows = await conn.fetch("""
            SELECT level AS label, COUNT(*) AS count
            FROM telemetry_events
            GROUP BY level
            ORDER BY count DESC
        """)

        # By day (últimos 30 días)
        day_rows = await conn.fetch("""
            SELECT DATE("timestamp")::text AS label, COUNT(*) AS count
            FROM telemetry_events
            WHERE "timestamp" >= NOW() - INTERVAL '30 days'
            GROUP BY DATE("timestamp")
            ORDER BY label DESC
        """)

        # Recent events (últimos 10)
        recent_rows = await conn.fetch("""
            SELECT id, "timestamp", service, event_type, level, value, message, tags
            FROM telemetry_events
            ORDER BY "timestamp" DESC
            LIMIT 10
        """)

    return TelemetrySummaryResponse(
        total_events=total_row,
        by_event_type=[
            TelemetrySummaryItem(label=r["label"], count=r["count"])
            for r in type_rows
        ],
        by_service=[
            TelemetrySummaryItem(label=r["label"], count=r["count"])
            for r in service_rows
        ],
        by_level=[
            TelemetrySummaryItem(label=r["label"], count=r["count"])
            for r in level_rows
        ],
        by_day=[
            TelemetrySummaryItem(label=r["label"], count=r["count"])
            for r in day_rows
        ],
        recent_events=[
            TelemetryEventRecord(
                id=str(r["id"]),
                timestamp=r["timestamp"].isoformat(),
                service=r["service"],
                event_type=r["event_type"],
                level=r["level"],
                value=float(r["value"]) if r["value"] is not None else None,
                message=r["message"],
                tags=r["tags"] if isinstance(r["tags"], dict) else {},
            )
            for r in recent_rows
        ],
    )