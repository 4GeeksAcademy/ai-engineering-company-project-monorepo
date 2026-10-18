"""
chat_stream_service.py — Motor de Streaming Conversacional para TrackFlow
Módulo: Real-Time Communication (Parte 2 de 2)

Gestiona el historial de conversación por sesión y la generación incremental
(streaming) de respuestas del asistente de operaciones y logística.
"""

import time
import asyncio
from typing import Dict, List, Optional, AsyncGenerator, Any
from models.chat_models import ChatMessage, MessageRole, get_utc_now_iso


class ChatStreamService:
    """
    Servicio de chat conversacional en tiempo real.
    Mantiene el contexto histórico por sesión y emite fragmentos de texto en streaming.
    """

    def __init__(self):
        # Mapeo: session_id -> List[ChatMessage]
        self._history: Dict[str, List[ChatMessage]] = {}
        self._lock = asyncio.Lock()

    def get_history(self, session_id: str) -> List[ChatMessage]:
        """Devuelve una copia del historial de mensajes de la sesión."""
        return list(self._history.get(session_id, []))

    async def add_message(
        self,
        session_id: str,
        role: MessageRole,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ChatMessage:
        """Registra un nuevo mensaje en el historial de la sesión."""
        msg = ChatMessage(
            role=role,
            content=content,
            metadata=metadata or {}
        )
        async with self._lock:
            if session_id not in self._history:
                self._history[session_id] = []
            self._history[session_id].append(msg)
        return msg

    async def clear_history(self, session_id: str) -> bool:
        """Elimina el historial de mensajes de la sesión indicada."""
        async with self._lock:
            if session_id in self._history:
                del self._history[session_id]
                return True
            return False

    async def generate_response_stream(
        self,
        session_id: str,
        user_prompt: str,
        chunk_delay: float = 0.02
    ) -> AsyncGenerator[str, None]:
        """
        Generador asíncrono que emite fragmentos de respuesta token por token.
        Integra respuestas contextualizadas para TrackFlow (flota, logística, proveedores).
        """
        # 1. Registrar mensaje del usuario en el historial
        await self.add_message(session_id, role="user", content=user_prompt)

        # 2. Generar respuesta contextual según el prompt
        prompt_lower = user_prompt.lower()
        if any(w in prompt_lower for w in ["incidencia", "averia", "sensor", "alerta"]):
            response_text = (
                f"He consultado el gestor de incidencias de TrackFlow. "
                f"Actualmente el sistema monitoriza las rutas activas. "
                f"Para la alerta reportada ('{user_prompt}'), se ha generado "
                f"un evento prioritario y el equipo de operaciones ha sido notificado."
            )
        elif any(w in prompt_lower for w in ["proveedor", "supplier", "catalogo"]):
            response_text = (
                f"Accediendo al directorio de proveedores de TrackFlow. "
                f"Disponemos de 15 proveedores homologados en la base de datos "
                f"con evaluación media de 4.2/5.0 estrellas."
            )
        elif any(w in prompt_lower for w in ["camion", "flota", "envio", "shipment", "ruta"]):
            response_text = (
                f"El estado de la flota logística indica 98.4% de envíos a tiempo. "
                f"Las unidades en tránsito mantienen enlace de telemetría activo "
                f"sin retenciones críticas registradas."
            )
        else:
            response_text = (
                f"Hola, soy el Asistente Inteligente de TrackFlow. "
                f"Puedo ayudarte a consultar incidencias, proveedores, envíos "
                f"o métricas de la cadena logística en tiempo real."
            )

        # 3. Fragmentar en tokens/palabras y emitir progresivamente con retardo de cadencia
        words = response_text.split(" ")
        full_accumulated = []

        for i, word in enumerate(words):
            chunk = word if i == 0 else " " + word
            full_accumulated.append(chunk)
            yield chunk
            if chunk_delay > 0:
                await asyncio.sleep(chunk_delay)

        # 4. Registrar la respuesta consolidada en el historial
        consolidated = "".join(full_accumulated)
        await self.add_message(
            session_id,
            role="assistant",
            content=consolidated,
            metadata={"chunks_count": len(words), "model": "trackflow-agent-v1"}
        )

    def get_session_stats(self) -> dict:
        """Devuelve estadísticas generales del almacenamiento de sesiones."""
        return {
            "total_stored_sessions": len(self._history),
            "sessions": {
                sid: len(msgs) for sid, msgs in self._history.items()
            }
        }


# Instancia única compartida del servicio de streaming
chat_stream_service = ChatStreamService()
