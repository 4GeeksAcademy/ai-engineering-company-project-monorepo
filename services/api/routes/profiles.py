"""
routes/profiles.py — Endpoints CRUD para Profile

TODOS los endpoints están PROTEGIDOS.

Rutas:
- GET  /profiles/me    → Obtener mi perfil (PROTEGIDO)
- PUT  /profiles/me    → Actualizar mi perfil (PROTEGIDO)

Protección:
- get_current_user inyecta el usuario autenticado
- Solo el owner del perfil puede ver/modificar su perfil
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from dependencies.auth_deps import get_current_user
from models.profile_models import ProfileResponse, ProfileUpdate
from services.user_service import get_profile_by_user_id, update_profile

router = APIRouter(prefix="/profiles", tags=["profiles"])


# ─────────────────────────────────────────────────────────────
# GET /profiles/me — OBTENER MI PERFIL (PROTEGIDO)
# ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Obtiene el perfil del usuario autenticado.

    PROTEGIDO — requiere token JWT válido.

    Args:
        current_user: Usuario autenticado (inyectado por get_current_user).

    Retorna:
        ProfileResponse con los datos del perfil.

    Raises:
        404: Si el perfil no existe.
    """
    profile = get_profile_by_user_id(current_user["id"])
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil no encontrado.",
        )
    return profile


# ─────────────────────────────────────────────────────────────
# PUT /profiles/me — ACTUALIZAR MI PERFIL (PROTEGIDO)
# ─────────────────────────────────────────────────────────────

@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Actualiza el perfil del usuario autenticado.

    PROTEGIDO — requiere token JWT válido.
    Solo el owner del perfil puede modificarlo.

    Args:
        profile_data: Campos a actualizar (name, phone, address — opcionales).
        current_user: Usuario autenticado.

    Retorna:
        ProfileResponse con los datos actualizados.

    Raises:
        404: Si el perfil no existe.
    """
    profile = update_profile(current_user["id"], profile_data)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil no encontrado.",
        )
    return profile