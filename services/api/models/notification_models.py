"""
notification_models.py — Modelos de Datos y Envelopes para Notificaciones SSE
Módulo: Real-Time Communication (Parte 1 de 2)

Define el envelope estándar de Server-Sent Events (SSE):
- event: tipo de evento con nombre (named events)
- data: payload JSON serializado
- id: identificador de secuencia para reconexión con Last-Event-ID
- retry: tiempo de reconexión sugerido al cliente en milisegundos
"""

import json
import uuid
from typing import Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone

NotificationChannel = Literal["all", "incidents", "shipments", "telemetry", "system"]
NotificationSeverity = Literal["info", "warning", "critical", "success"]


class SSEEventPayload(BaseModel):
    """
    Representa un evento emitido a través del canal SSE.
    """
    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(
        default_factory=lambda: f"evt_{int(datetime.now(timezone.utc).timestamp()*1000)}_{uuid.uuid4().hex[:6]}",
        description="Identificador unívoco del evento para cabecera id: y reconexión"
    )
    channel: NotificationChannel = Field(
        default="all",
        description="Canal de difusión al que pertenece el evento"
    )
    event_type: str = Field(
        description="Tipo específico de evento (ej. incident_alert, shipment_update)"
    )
    title: str = Field(description="Título breve y legible de la notificación")
    message: str = Field(description="Descripción o detalle del evento")
    severity: NotificationSeverity = Field(default="info", description="Nivel de severidad operativa")
    data: Dict[str, Any] = Field(default_factory=dict, description="Payload estructurado de metadatos")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    retry_ms: int = Field(default=5000, description="Tiempo de reintento sugerido al navegador en ms")

    def format_sse(self) -> str:
        """
        Formatea el evento según la especificación W3C de Server-Sent Events:
        id: <event_id>\n
        event: <event_type>\n
        retry: <retry_ms>\n
        data: <json_string>\n\n
        """
        payload_dict = {
            "id": self.event_id,
            "channel": self.channel,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "data": self.data,
            "timestamp": self.timestamp
        }
        json_data = json.dumps(payload_dict, ensure_ascii=False)
        
        return (
            f"id: {self.event_id}\n"
            f"event: {self.event_type}\n"
            f"retry: {self.retry_ms}\n"
            f"data: {json_data}\n\n"
        )


class NotificationPublishRequest(BaseModel):
    """
    Esquema para publicar un evento mediante la API REST interna.
    """
    model_config = ConfigDict(extra="forbid")

    channel: NotificationChannel = Field(default="all")
    event_type: str = Field(examples=["incident_alert"])
    title: str = Field(examples=["Retraso en ruta A-2"])
    message: str = Field(examples=["El envío TRK-1002 ha reportado retención por congestión."])
    severity: NotificationSeverity = Field(default="warning")
    data: Dict[str, Any] = Field(default_factory=dict)
    retry_ms: Optional[int] = Field(default=5000)
