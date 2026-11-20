"""
services/api/sse_manager.py
Gestor Pub/Sub en memoria para Server-Sent Events (SSE) del dashboard de RFPs.
Desacopla la creación de tickets de la transmisión hacia múltiples clientes conectados.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, Optional, Set


class SSEBroadcaster:
    """Broadcaster asíncrono en memoria basado en colas por suscriptor."""

    def __init__(self, max_queue_size: int = 100) -> None:
        self._subscribers: Set[asyncio.Queue[str]] = set()
        self._max_queue_size = max_queue_size

    def subscribe(self) -> asyncio.Queue[str]:
        """Registra un nuevo cliente conectado y devuelve su cola dedicada."""
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=self._max_queue_size)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[str]) -> None:
        """Elimina la cola de un cliente desconectado para liberar memoria."""
        self._subscribers.discard(queue)

    @property
    def active_connections(self) -> int:
        """Número de clientes actualmente escuchando el stream."""
        return len(self._subscribers)

    @staticmethod
    def format_sse(
        event: str,
        data: Dict[str, Any],
        event_id: Optional[str] = None,
    ) -> str:
        """Formatea un evento siguiendo estrictamente el wire protocol de SSE."""
        lines = []
        if event_id is not None:
            lines.append(f"id: {event_id}")
        lines.append(f"event: {event}")
        lines.append(f"data: {json.dumps(data, ensure_ascii=False)}")
        return "\n".join(lines) + "\n\n"

    async def publish(
        self,
        event: str,
        data: Dict[str, Any],
        event_id: Optional[str] = None,
    ) -> int:
        """
        Emite un evento SSE a todos los clientes suscritos.
        Retorna el número de clientes a los que se entregó el mensaje.
        """
        if not self._subscribers:
            return 0

        message = self.format_sse(event=event, data=data, event_id=event_id)
        delivered = 0

        for queue in list(self._subscribers):
            try:
                queue.put_nowait(message)
                delivered += 1
            except asyncio.QueueFull:
                # Evita que un cliente lento bloquee el sistema: descarta el más antiguo
                try:
                    queue.get_nowait()
                    queue.put_nowait(message)
                    delivered += 1
                except (asyncio.QueueEmpty, asyncio.QueueFull):
                    pass

        return delivered


# Instancia singleton compartida por los routers de FastAPI
rfp_broadcaster = SSEBroadcaster()