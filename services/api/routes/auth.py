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

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from dependencies.auth_deps import get_current_user
from services.auth_service import create_access_token, verify_password
from services.user_service import get_profile_by_user_id, get_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])


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
    profile: Optional[dict] = None


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