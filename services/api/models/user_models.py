"""
user_models.py — Modelos Pydantic para User

User almacena SOLO credenciales:
- id: autoincremental (TinyDB doc_id)
- email: único, válido
- hashed_password: bcrypt hash (NUNCA texto plano)
- is_active: bool (default True)
- role: admin | manager | user (Enum)
- created_at: timestamp

NO almacenar name, phone, address aquí. Van en Profile.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    """Roles permitidos para usuarios del sistema."""
    admin = "admin"
    manager = "manager"
    user = "user"


class UserCreate(BaseModel):
    """
    Payload para POST /users (registro público).
    El cliente envía email + password + datos de profile opcionales.
    """
    email: EmailStr = Field(..., description="Email del usuario (único en el sistema)")
    password: str = Field(..., min_length=6, description="Contraseña (mínimo 6 caracteres)")
    role: UserRole = Field(default=UserRole.user, description="Rol del usuario")
    is_active: bool = Field(default=True, description="Si el usuario está activo")
    # Datos de perfil (opcionales en registro)
    name: Optional[str] = Field(None, description="Nombre visible en el perfil")
    phone: Optional[str] = Field(None, description="Teléfono de contacto")
    address: Optional[str] = Field(None, description="Dirección física")


class UserUpdate(BaseModel):
    """
    Payload para PUT /users/{id}.
    Todos los campos son opcionales — solo se actualizan los que se envían.
    """
    email: Optional[EmailStr] = Field(None, description="Nuevo email")
    password: Optional[str] = Field(None, min_length=6, description="Nueva contraseña")
    role: Optional[UserRole] = Field(None, description="Nuevo rol")
    is_active: Optional[bool] = Field(None, description="Activar/desactivar usuario")


class UserResponse(BaseModel):
    """
    Respuesta de usuario NUNCA incluye hashed_password.
    """
    id: int = Field(..., description="ID del usuario en TinyDB")
    email: str = Field(..., description="Email del usuario")
    role: str = Field(..., description="Rol del usuario")
    is_active: bool = Field(..., description="Si el usuario está activo")
    created_at: str = Field(..., description="Timestamp de creación")