"""
profile_models.py — Modelos Pydantic para Profile

Profile almacena datos de contacto vinculados 1:1 a User.
- user_id: FK al User en TinyDB
- name: nombre visible
- phone: teléfono de contacto
- address: dirección física

Solo el owner del perfil puede modificarlo.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    """
    Payload para crear un perfil (se crea automáticamente al registrar usuario).
    """
    name: Optional[str] = Field(None, description="Nombre visible")
    phone: Optional[str] = Field(None, description="Teléfono de contacto")
    address: Optional[str] = Field(None, description="Dirección física")


class ProfileUpdate(BaseModel):
    """
    Payload para PUT /profiles/me.
    Todos los campos son opcionales.
    """
    name: Optional[str] = Field(None, description="Nombre visible")
    phone: Optional[str] = Field(None, description="Teléfono de contacto")
    address: Optional[str] = Field(None, description="Dirección física")


class ProfileResponse(BaseModel):
    """
    Respuesta del perfil.
    """
    id: int = Field(..., description="ID del perfil en TinyDB")
    user_id: int = Field(..., description="ID del usuario al que pertenece")
    name: Optional[str] = Field(None, description="Nombre visible")
    phone: Optional[str] = Field(None, description="Teléfono de contacto")
    address: Optional[str] = Field(None, description="Dirección física")