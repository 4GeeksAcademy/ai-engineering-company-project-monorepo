"""
websocket_manager.py — Gestor Centralizado de Conexiones WebSocket
Módulo: Real-Time Communication (Parte 2 de 2)

Administra las conexiones WebSocket activas por sesión, asegurando aislamiento,
comunicación bidireccional y limpieza de sockets en memoria.
"""

import uuid
import asyncio
import logging
from typing import Dict, Set, List, Optional, Any
from datetime import datetime, timezone
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel

logger = logging.getLogger("api.websocket")


class ConnectionManager:
    """
    Gestor en memoria de conexiones WebSocket agrupadas por session_id.
    Permite concurrencia segura, multi-pestaña por sesión y broadcast selectivo.
    """

    def __init__(self):
        # Mapeo: session_id -> Set[WebSocket]
        self._sessions: Dict[str, Set[WebSocket]] = {}
        # Mapeo inverso: WebSocket -> (client_id, session_id)
        self._socket_meta: Dict[WebSocket, Dict[str, Any]] = {}
        self._total_connected: int = 0
        self._lock = asyncio.Lock()

    async def connect(self, session_id: str, websocket: WebSocket) -> str:
        """
        Acepta una conexión entrante, la registra en la sesión y devuelve un client_id único.
        """
        await websocket.accept()
        client_id = f"ws_cli_{uuid.uuid4().hex[:8]}"

        async with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = set()
            self._sessions[session_id].add(websocket)

            self._socket_meta[websocket] = {
                "client_id": client_id,
                "session_id": session_id,
                "connected_at": datetime.now(timezone.utc).isoformat()
            }
            self._total_connected += 1

        logger.info(f"WebSocket conectado: client_id={client_id} en session={session_id}")
        return client_id

    async def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        """
        Elimina la conexión del gestor liberando recursos de memoria.
        """
        async with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id].discard(websocket)
                if not self._sessions[session_id]:
                    del self._sessions[session_id]

            meta = self._socket_meta.pop(websocket, None)
            client_id = meta.get("client_id") if meta else "unknown"

        logger.info(f"WebSocket desconectado: client_id={client_id} de session={session_id}")

    async def send_json(self, websocket: WebSocket, message: Any) -> bool:
        """
        Envía un mensaje serializado a un socket individual con captura segura de desconexiones.
        """
        payload = message.model_dump() if isinstance(message, BaseModel) else message
        try:
            await websocket.send_json(payload)
            return True
        except (WebSocketDisconnect, RuntimeError, Exception) as exc:
            logger.warning(f"Error al enviar JSON a WebSocket: {exc}")
            return False

    async def broadcast_to_session(
        self,
        session_id: str,
        message: Any,
        exclude: Optional[WebSocket] = None
    ) -> int:
        """
        Envía un mensaje a todos los sockets activos suscritos a la misma sesión.
        """
        payload = message.model_dump() if isinstance(message, BaseModel) else message

        async with self._lock:
            targets = [
                ws for ws in self._sessions.get(session_id, set())
                if ws != exclude
            ]

        if not targets:
            return 0

        # Enviar concurrentemente a todos los sockets de la sesión
        results = await asyncio.gather(
            *(self._safe_send(ws, payload) for ws in targets),
            return_exceptions=True
        )

        successful_deliveries = sum(1 for res in results if res is True)

        # Detectar y limpiar sockets fallidos
        failed_sockets = [
            ws for ws, res in zip(targets, results)
            if res is not True
        ]
        for failed_ws in failed_sockets:
            await self.disconnect(session_id, failed_ws)

        return successful_deliveries

    async def _safe_send(self, websocket: WebSocket, payload: dict) -> bool:
        """Helper interno para envío seguro."""
        try:
            await websocket.send_json(payload)
            return True
        except Exception:
            return False

    def get_session_connection_count(self, session_id: str) -> int:
        """Devuelve el número de clientes conectados a una sesión."""
        return len(self._sessions.get(session_id, set()))

    def get_active_sessions(self) -> List[str]:
        """Devuelve la lista de sesiones con al menos una conexión activa."""
        return list(self._sessions.keys())

    def get_total_connections(self) -> int:
        """Devuelve el total global de sockets WebSocket abiertos actualmente."""
        return sum(len(sockets) for sockets in self._sessions.values())

    def get_stats(self) -> dict:
        """Devuelve métricas operativas del gestor de conexiones."""
        return {
            "total_active_connections": self.get_total_connections(),
            "active_sessions_count": len(self._sessions),
            "sessions": {
                sid: len(sockets) for sid, sockets in self._sessions.items()
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


# Instancia única compartida del gestor de conexiones
connection_manager = ConnectionManager()
