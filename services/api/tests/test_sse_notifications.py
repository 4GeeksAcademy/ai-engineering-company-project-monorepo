"""
test_sse_notifications.py — Suite de Pruebas Automatizadas para Notificaciones SSE
Módulo: Real-Time Communication (Parte 1 de 2)

Cubre:
1. Formato estricto del protocolo SSE (id, event, retry, data, heartbeats).
2. Bus de eventos en memoria (suscripción, filtrado por canal, búfer circular y Last-Event-ID).
3. Endpoints HTTP (GET /api/notifications/stats, POST /api/notifications/publish).
4. Endpoint de streaming (GET /api/notifications/stream, cabeceras, evento inicial y liberación de colas).
"""

import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from main import app
from models.notification_models import (
    SSEEventPayload,
    NotificationPublishRequest
)
from services.sse_service import SSENotificationBus, sse_bus
from routes.notifications import stream_notifications


# ─────────────────────────────────────────────────────────────
# 1. Pruebas de Modelos y Formato SSE
# ─────────────────────────────────────────────────────────────

def test_sse_event_payload_formatting():
    """Valida que el payload genere el bloque SSE conforme al estándar W3C."""
    payload = SSEEventPayload(
        event_id="evt_test_123",
        channel="incidents",
        event_type="incident_alert",
        title="Alerta de Presión",
        message="Válvula 4 con sobrepresión",
        severity="critical",
        data={"valve_id": "V-04", "psi": 120},
        retry_ms=3000,
        timestamp="2026-10-18T12:00:00Z"
    )

    formatted = payload.format_sse()

    assert formatted.startswith("id: evt_test_123\n")
    assert "event: incident_alert\n" in formatted
    assert "retry: 3000\n" in formatted
    assert "data: {" in formatted
    assert formatted.endswith("\n\n")

    # Extraer el JSON del data:
    data_line = [line for line in formatted.splitlines() if line.startswith("data: ")][0]
    data_json = json.loads(data_line[6:])
    assert data_json["id"] == "evt_test_123"
    assert data_json["channel"] == "incidents"
    assert data_json["severity"] == "critical"
    assert data_json["data"]["valve_id"] == "V-04"


def test_heartbeat_formatting():
    """Valida que los comentarios de ping sigan la sintaxis ': comment\\n\\n'."""
    bus = SSENotificationBus()
    heartbeat = bus.format_heartbeat()
    assert heartbeat == ": ping - keep-alive\n\n"
    assert heartbeat.startswith(":")  # En SSE, líneas que empiezan con ':' son comentarios ignorados por EventSource


# ─────────────────────────────────────────────────────────────
# 2. Pruebas del Bus SSE (SSENotificationBus)
# ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_bus_subscription_and_unsubscription():
    """Valida el ciclo de suscripción y desuscripción de clientes en memoria."""
    bus = SSENotificationBus()
    client_id, queue = await bus.subscribe(channel="incidents")

    assert client_id in bus._subscribers
    _, sub_channel = bus._subscribers[client_id]
    assert sub_channel == "incidents"
    assert isinstance(queue, asyncio.Queue)

    stats = bus.get_stats()
    assert stats["active_connections"] == 1
    assert stats["channels_subscribed"]["incidents"] == 1

    # Desuscripción
    unsubscribed = await bus.unsubscribe(client_id)
    assert unsubscribed is True
    assert client_id not in bus._subscribers

    stats_after = bus.get_stats()
    assert stats_after["active_connections"] == 0


@pytest.mark.asyncio
async def test_bus_channel_filtering():
    """Valida que los eventos se enruten únicamente a los suscriptores correspondientes."""
    bus = SSENotificationBus()

    # Suscriptor A: solo 'incidents'
    cli_a, queue_a = await bus.subscribe(channel="incidents")
    # Suscriptor B: solo 'shipments'
    cli_b, queue_b = await bus.subscribe(channel="shipments")
    # Suscriptor C: canal global 'all'
    cli_c, queue_c = await bus.subscribe(channel="all")

    # 1. Publicar en 'incidents'
    event_inc = SSEEventPayload(
        channel="incidents",
        event_type="incident_created",
        title="Nueva Incidencia",
        message="Avería en ruta",
        severity="warning"
    )
    delivered = await bus.publish(event_inc)
    assert delivered == 2  # Debe llegar a cli_a y cli_c

    assert not queue_a.empty()
    assert queue_b.empty()  # No debe recibirlo
    assert not queue_c.empty()

    item_a = queue_a.get_nowait()
    assert item_a.channel == "incidents"
    item_c = queue_c.get_nowait()
    assert item_c.channel == "incidents"

    # 2. Publicar en 'shipments'
    event_ship = SSEEventPayload(
        channel="shipments",
        event_type="shipment_delayed",
        title="Retraso en Envío",
        message="Camión demorado",
        severity="info"
    )
    delivered_ship = await bus.publish(event_ship)
    assert delivered_ship == 2  # Debe llegar a cli_b y cli_c

    assert queue_a.empty()  # No debe recibirlo
    assert not queue_b.empty()
    assert not queue_c.empty()

    # Limpieza
    await bus.unsubscribe(cli_a)
    await bus.unsubscribe(cli_b)
    await bus.unsubscribe(cli_c)


@pytest.mark.asyncio
async def test_bus_last_event_id_replay():
    """Valida que un cliente reconectado con Last-Event-ID reciba los eventos perdidos del búfer circular."""
    bus = SSENotificationBus(history_size=10)

    # Publicar 3 eventos
    evt1 = SSEEventPayload(event_id="evt_001", channel="incidents", event_type="e1", title="T1", message="M1", severity="info")
    evt2 = SSEEventPayload(event_id="evt_002", channel="incidents", event_type="e2", title="T2", message="M2", severity="info")
    evt3 = SSEEventPayload(event_id="evt_003", channel="shipments", event_type="e3", title="T3", message="M3", severity="info")

    await bus.publish(evt1)
    await bus.publish(evt2)
    await bus.publish(evt3)

    # Cliente reconecta solicitando eventos posteriores a evt_001 en canal 'incidents'
    cli_reconnected, queue = await bus.subscribe(channel="incidents", last_event_id="evt_001")

    # Debe recibir inmediatamente evt_002 en su cola (pero no evt_003 porque es de shipments)
    assert not queue.empty()
    replayed = queue.get_nowait()
    assert replayed.event_id == "evt_002"
    assert queue.empty()

    await bus.unsubscribe(cli_reconnected)


# ─────────────────────────────────────────────────────────────
# 3. Pruebas de Endpoints HTTP (FastAPI TestClient)
# ─────────────────────────────────────────────────────────────

def test_api_notifications_stats():
    """Valida el endpoint GET /api/notifications/stats."""
    client = TestClient(app)
    response = client.get("/api/notifications/stats")
    assert response.status_code == 200

    data = response.json()
    assert "active_connections" in data
    assert "total_published_events" in data
    assert "buffered_history_size" in data
    assert "channels_subscribed" in data
    assert "timestamp" in data


def test_api_notifications_publish():
    """Valida el endpoint POST /api/notifications/publish."""
    client = TestClient(app)
    payload = {
        "channel": "system",
        "event_type": "security_alert",
        "title": "Intento de Acceso No Autorizado",
        "message": "Múltiples intentos fallidos",
        "severity": "critical",
        "data": {"ip": "192.168.1.50"}
    }
    response = client.post("/api/notifications/publish", json=payload)
    assert response.status_code == 201

    res_data = response.json()
    assert res_data["status"] == "published"
    assert res_data["channel"] == "system"
    assert res_data["event_type"] == "security_alert"
    assert res_data["event_id"].startswith("evt_")
    assert "delivered_to_active_clients" in res_data


def test_api_notifications_publish_validation_error():
    """Valida que un canal no permitido devuelva 400."""
    client = TestClient(app)
    invalid_payload = {
        "channel": "canal_inexistente",
        "event_type": "test",
        "title": "Test",
        "message": "Test"
    }
    response = client.post("/api/notifications/publish", json=invalid_payload)
    assert response.status_code == 400


# ─────────────────────────────────────────────────────────────
# 4. Pruebas del Endpoint SSE (Stream & Generator)
# ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_sse_stream_headers_and_welcome():
    """Valida cabeceras SSE obligatorias y la emisión del evento de bienvenida 'connected'."""
    mock_request = MagicMock()
    mock_request.is_disconnected = AsyncMock(return_value=False)

    response = await stream_notifications(
        request=mock_request,
        channel="incidents",
        last_event_id=None
    )

    # 1. Cabeceras
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream"
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["connection"] == "keep-alive"
    assert response.headers["x-accel-buffering"] == "no"

    # 2. Evento inicial en el generador
    gen = response.body_iterator
    welcome_chunk = await gen.__anext__()

    assert "event: connected\n" in welcome_chunk
    assert "Conexión en Tiempo Real Establecida" in welcome_chunk
    assert "incidents" in welcome_chunk

    await gen.aclose()


@pytest.mark.asyncio
async def test_sse_stream_live_delivery_and_cleanup():
    """Valida la entrega de eventos en vivo al generador del cliente y su posterior liberación."""
    mock_request = MagicMock()
    mock_request.is_disconnected = AsyncMock(return_value=False)

    initial_stats = sse_bus.get_stats()
    initial_connections = initial_stats["active_connections"]

    response = await stream_notifications(
        request=mock_request,
        channel="shipments",
        last_event_id=None
    )

    gen = response.body_iterator
    # Consumir mensaje de bienvenida
    await gen.__anext__()

    # Conexión registrada activamente en el bus
    assert sse_bus.get_stats()["active_connections"] == initial_connections + 1

    # Publicar un evento en 'shipments'
    evt = SSEEventPayload(
        channel="shipments",
        event_type="gps_ping",
        title="Ubicación GPS",
        message="Camión en punto de control",
        severity="info",
        data={"lat": 40.4168, "lon": -3.7038}
    )
    await sse_bus.publish(evt)

    # El generador debe recibir el evento publicado
    received_chunk = await gen.__anext__()
    assert "event: gps_ping\n" in received_chunk
    assert "40.4168" in received_chunk

    # Cerrar generador (simulando desconexión de cliente)
    await gen.aclose()

    # La conexión debe haberse liberado inmediatamente del bus
    assert sse_bus.get_stats()["active_connections"] == initial_connections
