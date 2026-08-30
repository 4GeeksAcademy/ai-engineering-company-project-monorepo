"""
routes/auth.py — Endpoints de autenticación

Rutas:
- POST /auth/login   → Login (PÚBLICO) — email + password → JWT token
- GET  /auth/me      → Mi info (PROTEGIDO) — email + role + Profile

Flujo login:
1. Recibe email y password
2. Busca usuario por email en TinyDB
3. Verifica password contra hash
4. Si OK → crea y devuelve JWT token
5. Si no → 401

Flujo /auth/me:
1. get_current_user valida el token
2. Recupera Profile vinculado
3. Devuelve email, role + datos de Profile
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from models import MessageResponse
from models.profile_models import ProfileResponse

from dependencies.auth_deps import get_current_user
from services.auth_service import (
    create_access_token,
    create_reset_token,
    hash_password,
    invalidate_reset_token,
    is_token_invalidated,
    verify_password,
    verify_reset_token,
)
from services.email_service import send_reset_email
from services.user_service import get_profile_by_user_id, get_user_by_email

from database import users_table, User as UserQuery

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Modelos de request/response para login
# ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Payload para POST /auth/login"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Respuesta para POST /auth/login"""
    access_token: str
    token_type: str = "bearer"


class AuthMeResponse(BaseModel):
    """Respuesta para GET /auth/me"""
    email: str
    role: str
    is_active: bool
    profile: Optional[ProfileResponse] = None


# ── Schemas para AUTH-03: Restablecimiento de contraseña ──────

class ForgotPasswordRequest(BaseModel):
    """Schema para solicitud de restablecimiento de contraseña."""
    email: str  # Email del usuario que olvidó su contraseña

class ResetPasswordRequest(BaseModel):
    """
    Schema para restablecer la contraseña con token.

    El token se obtiene del enlace enviado por email.
    """
    token: str       # Token JWT de restablecimiento
    new_password: str  # Nueva contraseña (mínimo 8 caracteres)

class ChangePasswordRequest(BaseModel):
    """
    Schema para cambiar la contraseña estando autenticado.

    Requiere la contraseña actual para verificar la identidad.
    """
    current_password: str  # Contraseña actual
    new_password: str      # Nueva contraseña (mínimo 8 caracteres)


# ─────────────────────────────────────────────────────────────
# POST /auth/login — LOGIN (PÚBLICO)
# ─────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    """
    Inicia sesión y obtiene un token JWT.

    Endpoint PÚBLICO — no requiere autenticación previa.

    Args:
        credentials: email y password.

    Retorna:
        access_token (JWT) y token_type.

    Raises:
        401: Si el email no existe o la contraseña es incorrecta.
    """
    # Buscar usuario por email
    user = get_user_by_email(credentials.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar contraseña
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar si el usuario está activo
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario desactivado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Crear token JWT
    token = create_access_token(
        data={"sub": str(user["id"]), "role": user["role"]}
    )

    return LoginResponse(access_token=token)


# ─────────────────────────────────────────────────────────────
# GET /auth/me — MI INFORMACIÓN (PROTEGIDO)
# ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=AuthMeResponse)
def get_auth_me(current_user: dict = Depends(get_current_user)):
    """
    Obtiene la información del usuario autenticado.

    PROTEGIDO — requiere token JWT válido.

    Args:
        current_user: Usuario autenticado (inyectado por get_current_user).

    Retorna:
        AuthMeResponse con email, role, is_active y profile.
    """
    profile = get_profile_by_user_id(current_user["id"])
    return AuthMeResponse(
        email=current_user["email"],
        role=current_user["role"],
        is_active=current_user["is_active"],
        profile=profile,
    )


# ════════════════════════════════════════════════════════════════
# AUTH-03: POST /auth/forgot-password
# ════════════════════════════════════════════════════════════════

@router.post("/forgot-password", response_model=MessageResponse, status_code=200)
def forgot_password(request: ForgotPasswordRequest):
    """
    Solicita restablecimiento de contraseña.

    Si el email existe:
      1. Genera token JWT con expiración (30 min por defecto)
      2. Envía email con enlace: /reset-password?token=<token>

    SIEMPRE devuelve 200, incluso si el email no existe.
    Esto previene enumeración de usuarios (un atacante no puede
    saber qué emails están registrados).

    Request:  POST /auth/forgot-password
    Body:     { "email": "usuario@ejemplo.com" }
    Response: 200 { "message": "Si esa dirección está registrada..." }
    """
    email = request.email.strip().lower()

    # Buscar usuario por email
    user = get_user_by_email(email)

    if user:
        # Generar token de restablecimiento
        reset_token = create_reset_token(user["id"])

        # Enviar email (asíncrono — no bloquear la respuesta)
        send_reset_email(email, reset_token)

        logger.info(f"Email de reset enviado a {email}")

    # Siempre devolver 200
    return MessageResponse(
        message="Si esa dirección está registrada, recibirás un enlace de restablecimiento en breve."
    )


# ════════════════════════════════════════════════════════════════
# AUTH-03: POST /auth/reset-password
# ════════════════════════════════════════════════════════════════

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(request: ResetPasswordRequest):
    """
    Restablece la contraseña usando un token de reset.

    Valida el token (firma, expiración, no usado previamente).
    Si es válido: hashea la nueva contraseña, actualiza el registro,
    e invalida el token para que no pueda reutilizarse.

    Request:  POST /auth/reset-password
    Body:     { "token": "<jwt>", "new_password": "nueva123" }
    Response: 200 { "message": "Contraseña actualizada correctamente" }
    Error:    400 { "detail": "Este enlace ha expirado o ya ha sido utilizado" }
    """
    # Validar token
    user_id = verify_reset_token(request.token)
    if user_id is None:
        raise HTTPException(
            status_code=400,
            detail="Este enlace ha expirado o ya ha sido utilizado. Solicita uno nuevo.",
        )

    # Verificar que el token no haya sido usado antes
    if is_token_invalidated(request.token):
        raise HTTPException(
            status_code=400,
            detail="Este enlace ya ha sido utilizado. Solicita uno nuevo.",
        )

    # Buscar usuario en la base de datos
    user = users_table.get(doc_id=user_id)
    if user is None:
        raise HTTPException(
            status_code=400,
            detail="Este enlace ha expirado o ya ha sido utilizado. Solicita uno nuevo.",
        )

    # Hashear nueva contraseña
    hashed_password = hash_password(request.new_password)

    # Actualizar registro del usuario
    users_table.update({"hashed_password": hashed_password}, doc_ids=[user_id])

    # Invalidar el token para evitar reutilización
    invalidate_reset_token(request.token)

    logger.info(f"Contraseña restablecida para user_id={user_id}")

    return MessageResponse(message="Contraseña actualizada correctamente. Ya puedes iniciar sesión.")


# ════════════════════════════════════════════════════════════════
# AUTH-03: POST /auth/change-password
# ════════════════════════════════════════════════════════════════

@router.post("/change-password", response_model=MessageResponse)
def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Cambia la contraseña del usuario autenticado.

    Requiere token de acceso válido en Authorization header.
    Verifica la contraseña actual antes de cambiarla.

    Request:  POST /auth/change-password
    Headers:  Authorization: Bearer <access_token>
    Body:     { "current_password": "actual123", "new_password": "nueva123" }
    Response: 200 { "message": "Contraseña actualizada correctamente" }
    Error:    400 { "detail": "La contraseña actual es incorrecta" }
    """
    # Verificar que la contraseña actual es correcta
    if not verify_password(request.current_password, current_user["hashed_password"]):
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual es incorrecta.",
        )

    # Hashear y actualizar nueva contraseña
    hashed_password = hash_password(request.new_password)

    user_id = current_user["id"]
    users_table.update({"hashed_password": hashed_password}, doc_ids=[user_id])

    logger.info(f"Contraseña cambiada para user_id={user_id}")

    return MessageResponse(message="Contraseña actualizada correctamente.")