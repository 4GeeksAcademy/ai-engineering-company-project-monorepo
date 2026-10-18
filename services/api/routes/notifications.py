"""
notifications.py — Router de Notificaciones Server-Sent Events (SSE) en FastAPI
Módulo: Real-Time Communication (Parte 1 de 2)

Endpoints:
- GET  /api/notifications/stream : Stream continuo de eventos unidireccionales (text/event-stream).
- POST /api/notifications/publish: Publica un evento en el bus para entrega en tiempo real.
- GET  /api/notifications/stats  : Estadísticas y métricas de conexiones activas.
"""

import asyncio
from typing import Optional
from fastapi import APIRouter, Request, Header, Query, HTTPException, status
from fastapi.responses import StreamingResponse

from models.notification_models import (
    SSEEventPayload,
    NotificationPublishRequest,
    NotificationChannel
)
from services.sse_service import sse_bus

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/stream")
async def stream_notifications(
    request: Request,
    channel: NotificationChannel = Query(default="all", description="Canal al que suscribirse"),
    last_event_id: Optional[str] = Header(default=None, alias="Last-Event-ID")
):
    """
    Endpoint SSE (Server-Sent Events) unidireccional: Servidor -> Cliente.
    Transmite eventos de TrackFlow en tiempo real con soporte de reconexión y heartbeats.
    """
    client_id, queue = await sse_bus.subscribe(channel=channel, last_event_id=last_event_id)

    async def event_generator():
        try:
            # 1. Evento de bienvenida / confirmación de conexión
            welcome_evt = SSEEventPayload(
                channel=channel,
                event_type="connected",
                title="Conexión en Tiempo Real Establecida",
                message=f"Suscrito exitosamente al canal '{channel}'.",
                severity="success",
                data={"client_id": client_id, "channel": channel}
            )
            yield welcome_evt.format_sse()

            # 2. Bucle continuo de escucha de eventos y emisión de heartbeats
            while True:
                # Si el cliente canceló o cerró la conexión, terminar el generador
                if await request.is_disconnected():
                    break

                try:
                    # Espera un evento hasta 15 segundos; si no hay eventos, emite un heartbeat ping
                    event: SSEEventPayload = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield event.format_sse()
                except asyncio.TimeoutError:
                    # Heartbeat ping para evitar corte por idle timeout en proxies y firewalls
                    yield sse_bus.format_heartbeat()

        except asyncio.CancelledError:
            # Desconexión abrupta del cliente detectada por el servidor
            pass
        finally:
            # Liberación estricta de memoria de la cola
            await sse_bus.unsubscribe(client_id)

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=headers
    )


@router.post("/publish", status_code=status.HTTP_201_CREATED)
async def publish_notification(req: NotificationPublishRequest):
    """
    Publica un nuevo evento en el bus SSE para su distribución inmediata.
    """
    event = SSEEventPayload(
        channel=req.channel,
        event_type=req.event_type,
        title=req.title,
        message=req.message,
        severity=req.severity,
        data=req.data,
        retry_ms=req.retry_ms or 5000
    )

    delivered_count = await sse_bus.publish(event)

    return {
        "status": "published",
        "event_id": event.event_id,
        "event_type": event.event_type,
        "channel": event.channel,
        "delivered_to_active_clients": delivered_count,
        "timestamp": event.timestamp
    }


@router.get("/stats")
async def get_notifications_stats():
    """
    Devuelve métricas operativas de conexiones y actividad en tiempo real.
    """
    return sse_bus.get_stats()
