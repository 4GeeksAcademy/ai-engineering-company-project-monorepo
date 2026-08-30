"""
routes/users.py — Endpoints CRUD para User

TODOS los endpoints están protegidos EXCEPTO POST /users (registro).

Rutas:
- POST   /users         → Registrar (PÚBLICO)
- GET    /users         → Listar (PROTEGIDO)
- GET    /users/{id}    → Obtener por ID (PROTEGIDO)
- PUT    /users/{id}    → Actualizar (PROTEGIDO — solo owner o admin)
- DELETE /users/{id}    → Eliminar (PROTEGIDO — solo owner o admin)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from dependencies.auth_deps import get_current_user
from models import MessageResponse
from models.profile_models import ProfileCreate
from models.user_models import UserCreate, UserResponse, UserUpdate
from services.user_service import (
    create_user,
    delete_user,
    get_all_users,
    get_user_by_id,
    update_user,
)

router = APIRouter(prefix="/users", tags=["users"])


# ─────────────────────────────────────────────────────────────
# POST /users — REGISTRO (PÚBLICO)
# ─────────────────────────────────────────────────────────────

@router.post("/", response_model=UserResponse, status_code=200)
def register_user(user_data: UserCreate):
    """
    Registra un nuevo usuario en el sistema.

    Endpoint PÚBLICO — no requiere autenticación.
    Crea automáticamente el perfil vinculado al usuario.

    Args:
        user_data: email, password, role (opcional), más datos de profile.

    Retorna:
        UserResponse con id, email, role, is_active, created_at.

    Raises:
        409: Si el email ya está registrado.
        422: Si los datos no pasan validación Pydantic.
    """
    # Extraer datos de profile si vienen en el payload
    profile_data = None
    if hasattr(user_data, 'name') or hasattr(user_data, 'phone') or hasattr(user_data, 'address'):
        profile_data = ProfileCreate(
            name=getattr(user_data, 'name', None),
            phone=getattr(user_data, 'phone', None),
            address=getattr(user_data, 'address', None),
        )

    try:
        user = create_user(user_data, profile_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )

    return user


# ─────────────────────────────────────────────────────────────
# GET /users — LISTAR (PROTEGIDO)
# ─────────────────────────────────────────────────────────────

@router.get("/", response_model=list[UserResponse])
def list_users(current_user: dict = Depends(get_current_user)):
    """
    Lista todos los usuarios registrados.

    PROTEGIDO — requiere token JWT válido.
    No incluye hashed_password en la respuesta.

    Args:
        current_user: Usuario autenticado (inyectado por get_current_user).

    Retorna:
        Lista de UserResponse.
    """
    return get_all_users()


# ─────────────────────────────────────────────────────────────
# GET /users/{user_id} — OBTENER POR ID (PROTEGIDO)
# ─────────────────────────────────────────────────────────────

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, current_user: dict = Depends(get_current_user)):
    """
    Obtiene un usuario por su ID.

    PROTEGIDO — requiere token JWT válido.

    Args:
        user_id: ID del usuario a buscar.

    Retorna:
        UserResponse con los datos del usuario.

    Raises:
        404: Si el usuario no existe.
    """
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {user_id} no encontrado.",
        )
    return user


# ─────────────────────────────────────────────────────────────
# PUT /users/{user_id} — ACTUALIZAR (PROTEGIDO — owner o admin)
# ─────────────────────────────────────────────────────────────

@router.put("/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: int,
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Actualiza los datos de un usuario.

    PROTEGIDO — solo el propio usuario (owner) o un admin pueden actualizar.

    Args:
        user_id: ID del usuario a actualizar.
        update_data: Campos a actualizar (todos opcionales).
        current_user: Usuario autenticado.

    Retorna:
        UserResponse con los datos actualizados.

    Raises:
        403: Si no es owner ni admin.
        404: Si el usuario no existe.
    """
    # Verificar permisos: solo owner o admin
    if current_user["id"] != user_id and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para actualizar este usuario.",
        )

    user = update_user(user_id, update_data)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {user_id} no encontrado.",
        )
    return user


# ─────────────────────────────────────────────────────────────
# DELETE /users/{user_id} — ELIMINAR (PROTEGIDO — owner o admin)
# ─────────────────────────────────────────────────────────────

@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user_endpoint(
    user_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Elimina un usuario y su perfil vinculado.

    PROTEGIDO — solo el propio usuario (owner) o un admin pueden eliminar.

    Args:
        user_id: ID del usuario a eliminar.
        current_user: Usuario autenticado.

    Retorna:
        Mensaje de confirmación.

    Raises:
        403: Si no es owner ni admin.
        404: Si el usuario no existe.
    """
    # Verificar permisos: solo owner o admin
    if current_user["id"] != user_id and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este usuario.",
        )

    deleted = delete_user(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {user_id} no encontrado.",
        )

    return MessageResponse(message="Usuario y perfil eliminados correctamente")