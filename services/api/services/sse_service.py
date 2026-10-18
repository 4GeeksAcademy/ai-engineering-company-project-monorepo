"""
sse_service.py — Bus de Notificaciones y Gestión de Conexiones Server-Sent Events (SSE)
Módulo: Real-Time Communication (Parte 1 de 2)

Proporciona:
1. SSENotificationBus: Bus en memoria basado en asyncio.Queue.
2. Soporte de canales/tópicos (incidents, shipments, telemetry, all).
3. Historial acotado de eventos para soporte de reconexión con Last-Event-ID.
4. Generación periódica de Heartbeats para prevenir idle timeouts en proxies.
"""

import asyncio
import collections
import uuid
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timezone

from models.notification_models import SSEEventPayload, NotificationChannel


class SSENotificationBus:
    """
    Bus asíncrono en memoria para gestión y distribución de eventos Server-Sent Events.
    Mantiene colas dedicadas por cada cliente conectado y un buffer de eventos recientes.
    """

    def __init__(self, history_size: int = 100):
        # Mapeo: client_id -> (asyncio.Queue, channel_subscribed)
        self._subscribers: Dict[str, Tuple[asyncio.Queue, str]] = {}
        # Buffer circular de últimos eventos emitidos para reconexión con Last-Event-ID
        self._history: collections.deque = collections.deque(maxlen=history_size)
        self._total_published: int = 0
        self._lock = asyncio.Lock()

    async def subscribe(
        self,
        channel: NotificationChannel = "all",
        last_event_id: Optional[str] = None
    ) -> Tuple[str, asyncio.Queue]:
        """
        Registra una nueva conexión cliente y devuelve su identificador y su cola de eventos.
        Si se provee last_event_id, reinyecta los eventos perdidos ocurridos tras ese ID.
        """
        client_id = f"cli_{uuid.uuid4().hex[:8]}"
        queue = asyncio.Queue()

        async with self._lock:
            # Reconexión con Last-Event-ID: retransmitir eventos pendientes
            if last_event_id:
                replay = False
                for evt in self._history:
                    if replay:
                        if channel == "all" or evt.channel == channel:
                            await queue.put(evt)
                    elif evt.event_id == last_event_id:
                        replay = True

            self._subscribers[client_id] = (queue, channel)

        return client_id, queue

    async def unsubscribe(self, client_id: str) -> bool:
        """
        Elimina la suscripción de un cliente liberando su cola de memoria.
        """
        async with self._lock:
            if client_id in self._subscribers:
                del self._subscribers[client_id]
                return True
            return False

    async def publish(self, event: SSEEventPayload) -> int:
        """
        Publica un evento distribuyéndolo a todos los suscriptores cuyo canal coincida.
        Retorna el número de clientes que recibieron el evento.
        """
        delivered_count = 0
        async with self._lock:
            self._history.append(event)
            self._total_published += 1

            for client_id, (queue, subscribed_channel) in list(self._subscribers.items()):
                # Entregar si el canal coincide o si el cliente se suscribió a 'all'
                if subscribed_channel == "all" or event.channel == "all" or subscribed_channel == event.channel:
                    try:
                        queue.put_nowait(event)
                        delivered_count += 1
                    except asyncio.QueueFull:
                        # Si la cola del cliente se llena, evitar bloqueo
                        pass

        return delivered_count

    @staticmethod
    def format_heartbeat() -> str:
        """
        Genera una línea de comentario SSE (heartbeat) para mantener vivo el socket HTTP.
        Los comentarios comienzan con ':' en la especificación SSE y son ignorados por los clientes,
        pero impiden que proxies intermedios o firewalls cierren la conexión por inactividad.
        """
        return ": ping - keep-alive\n\n"

    def get_stats(self) -> Dict[str, Any]:
        """
        Retorna métricas de observabilidad sobre las conexiones activas.
        """
        channel_counts: Dict[str, int] = {}
        for _, channel in self._subscribers.values():
            channel_counts[channel] = channel_counts.get(channel, 0) + 1

        return {
            "active_connections": len(self._subscribers),
            "total_published_events": self._total_published,
            "buffered_history_size": len(self._history),
            "channels_subscribed": channel_counts,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


# Instancia singleton para compartir en toda la aplicación FastAPI
sse_bus = SSENotificationBus()
