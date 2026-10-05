"""
user_service.py — Servicios CRUD para User y Profile

Todas las operaciones de base de datos para usuarios y perfiles.
NO son endpoints — son funciones llamadas desde los routers.

Funciones:
- create_user(db_data, profile_data) → crea User + Profile
- get_user_by_id(user_id) → User o None
- get_user_by_email(email) → User o None
- get_all_users() → lista de Users
- update_user(user_id, update_data) → User actualizado
- delete_user(user_id) → elimina User + Profile vinculado
- get_profile_by_user_id(user_id) → Profile o None
- update_profile(user_id, profile_data) → Profile actualizado
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from database import profiles_table, users_table, User as UserQuery
from models.profile_models import ProfileCreate, ProfileUpdate, ProfileResponse
from models.user_models import UserCreate, UserUpdate, UserResponse
from services.auth_service import hash_password


def create_user(user_data: UserCreate, profile_data: Optional[ProfileCreate] = None) -> UserResponse:
    """
    Crea un nuevo usuario y su perfil vinculado.

    1. Verifica que el email NO exista ya (unicidad).
    2. Hashea la contraseña con bcrypt.
    3. Inserta en users_table.
    4. Inserta perfil vinculado en profiles_table.
    5. Devuelve el usuario SIN el hashed_password.

    Args:
        user_data: Datos del usuario (email, password, role).
        profile_data: Datos opcionales del perfil (name, phone, address).

    Retorna:
        Dict con el usuario creado (sin hashed_password).

    Raises:
        ValueError: Si el email ya está registrado.
    """
    # Verificar unicidad de email
    existing = get_user_by_email(user_data.email)
    if existing:
        raise ValueError(f"El email '{user_data.email}' ya está registrado.")

    # Hashear contraseña
    hashed_pw = hash_password(user_data.password)

    # Preparar datos del usuario
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "email": user_data.email,
        "hashed_password": hashed_pw,
        "role": user_data.role.value if hasattr(user_data.role, "value") else user_data.role,
        "is_active": user_data.is_active,
        "created_at": now,
    }

    user_id = users_table.insert(user_doc)

    # Crear perfil vinculado
    profile_doc = {
        "user_id": user_id,
        "name": profile_data.name if profile_data else None,
        "phone": profile_data.phone if profile_data else None,
        "address": profile_data.address if profile_data else None,
    }
    profiles_table.insert(profile_doc)

    # Devolver sin hashed_password
    user_dict = {"id": user_id, **user_doc}
    del user_dict["hashed_password"]
    return UserResponse(**user_dict)


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Obtiene un usuario por su ID. Devuelve None si no existe.
    NOTA: Devuelve dict con hashed_password incluido.
          Usado internamente por auth y servicios.
    """
    doc = users_table.get(doc_id=user_id)
    if doc is None:
        return None
    return {"id": user_id, **dict(doc)}


def get_user_by_email(email: str) -> Optional[dict]:
    """Obtiene un usuario por su email. Devuelve None si no existe.
    NOTA: Devuelve dict con hashed_password incluido.
          Usado internamente por auth y servicios.
    """
    docs = users_table.search(UserQuery.email == email)
    if not docs:
        return None
    doc = docs[0]
    return {"id": doc.doc_id, **dict(doc)}


def get_all_users() -> list[UserResponse]:
    """Devuelve todos los usuarios (sin hashed_password)."""
    all_docs = users_table.all()
    users = []
    for doc in all_docs:
        user_dict = {"id": doc.doc_id, **dict(doc)}
        user_dict.pop("hashed_password", None)
        users.append(UserResponse(**user_dict))
    return users


def update_user(user_id: int, update_data: UserUpdate) -> Optional[UserResponse]:
    """
    Actualiza los campos de un usuario.

    Solo actualiza los campos que NO son None en update_data.
    Si se proporciona password, la hashea antes de guardar.

    Retorna el usuario actualizado (sin hashed_password) o None si no existe.
    """
    existing = get_user_by_id(user_id)
    if existing is None:
        return None

    update_dict = {}
    if update_data.email is not None:
        update_dict["email"] = update_data.email
    if update_data.password is not None:
        update_dict["hashed_password"] = hash_password(update_data.password)
    if update_data.role is not None:
        update_dict["role"] = update_data.role.value if hasattr(update_data.role, "value") else update_data.role
    if update_data.is_active is not None:
        update_dict["is_active"] = update_data.is_active

    if update_dict:
        users_table.update(update_dict, doc_ids=[user_id])

    # get_user_by_id devuelve dict (con hashed_password), convertimos a UserResponse
    user_dict = get_user_by_id(user_id)
    if user_dict is None:
        return None
    user_dict.pop("hashed_password", None)
    return UserResponse(**user_dict)


def delete_user(user_id: int) -> bool:
    """
    Elimina un usuario y su perfil vinculado.

    Retorna True si se eliminó correctamente, False si no existía.
    """
    existing = get_user_by_id(user_id)
    if existing is None:
        return False

    # Eliminar perfil vinculado
    profiles = profiles_table.search(UserQuery.user_id == user_id)
    for profile in profiles:
        profiles_table.remove(doc_ids=[profile.doc_id])

    # Eliminar usuario
    users_table.remove(doc_ids=[user_id])
    return True


def get_profile_by_user_id(user_id: int) -> Optional[ProfileResponse]:
    """Obtiene el perfil vinculado a un user_id."""
    docs = profiles_table.search(UserQuery.user_id == user_id)
    if not docs:
        return None
    doc = docs[0]
    return ProfileResponse(id=doc.doc_id, **dict(doc))


def update_profile(user_id: int, profile_data: ProfileUpdate) -> Optional[ProfileResponse]:
    """
    Actualiza el perfil vinculado a un usuario.

    Solo actualiza los campos que NO son None.
    Retorna el perfil actualizado o None si no existe.
    """
    profile = get_profile_by_user_id(user_id)
    if profile is None:
        return None

    update_dict = {}
    if profile_data.name is not None:
        update_dict["name"] = profile_data.name
    if profile_data.phone is not None:
        update_dict["phone"] = profile_data.phone
    if profile_data.address is not None:
        update_dict["address"] = profile_data.address

    if update_dict:
        profiles_table.update(update_dict, doc_ids=[profile.id])

    return get_profile_by_user_id(user_id)