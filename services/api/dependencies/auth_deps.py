"""
dependencies/auth_deps.py — Dependencias de autenticación FastAPI

Dependencias disponibles:
- get_current_user: extrae token del header, valida JWT, devuelve user
- get_admin_user: igual que get_current_user pero verifica role==admin

Cualquier ruta que incluya Depends(get_current_user) queda automáticamente
protegida. Si no hay token válido → 401.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from services.auth_service import decode_access_token
from services.user_service import get_user_by_id

# OAuth2PasswordBearer extrae automáticamente el token del header:
# Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Valida el token JWT y devuelve el usuario autenticado.

    Extrae el token del header Authorization,
    lo decodifica, extrae el user_id (sub) y
    recupera el usuario de TinyDB.

    Returns:
        Dict con datos del usuario (sin hashed_password).

    Raises:
        401: Si el token es inválido, expiró o el usuario no existe.
    """
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: falta subject (sub).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: subject (sub) debe ser un número.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario desactivado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Igual que get_current_user pero verifica que el rol sea admin.

    Útil para rutas que solo los administradores pueden ejecutar.

    Raises:
        403: Si el usuario no es admin.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador.",
        )
    return current_user