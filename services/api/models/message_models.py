"""
message_models.py — Modelos Pydantic para respuestas simples (mensajes de confirmación)

Usado por:
- Endpoints de auth (forgot/reset/change password)
- Endpoints DELETE (suppliers, users)
- Endpoints informativos (GET /, GET /health)
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    """
    Respuesta genérica para endpoints que solo devuelven un mensaje.

    Ejemplo: {"message": "Contraseña actualizada correctamente"}
    """
    message: str = Field(..., description="Mensaje descriptivo del resultado de la operación")