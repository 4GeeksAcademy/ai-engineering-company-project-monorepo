"""User service layer backed by TinyDB."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from tinydb import Query
from tinydb.table import Document

from src.database import get_profiles_table, get_users_table
from src.models.user import TinyDBId, User, UserRole
from src.services.profile_service import create_profile_for_user
from src.services.security import hash_password


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_user_id(user_id: TinyDBId) -> TinyDBId:
    if isinstance(user_id, str) and user_id.isdigit():
        return int(user_id)
    return user_id


def _serialize_user(document: Document) -> User:
    payload = dict(document)
    payload["id"] = document.doc_id
    return User.model_validate(payload)


def _get_user_document_by_id(user_id: TinyDBId) -> Document | None:
    normalized = _normalize_user_id(user_id)
    if not isinstance(normalized, int) or normalized <= 0:
        return None

    users_table = get_users_table()
    return users_table.get(doc_id=normalized)


def create_user(
    email: str,
    password: str,
    role: UserRole | str | None = None,
    is_active: bool = True,
    name: str | None = None,
    phone: str | None = None,
    address: str | None = None,
) -> User:
    """Create a user in TinyDB with hashed password and optional linked profile."""

    users_table = get_users_table()
    user_query = Query()

    existing_user = users_table.get(user_query.email == email)
    if existing_user is not None:
        raise ValueError("User with this email already exists.")

    resolved_role = role if isinstance(role, UserRole) else UserRole(role or UserRole.USER.value)
    payload = {
        "email": email,
        "hashed_password": hash_password(password),
        "is_active": is_active,
        "role": resolved_role.value,
        "created_at": _now_iso(),
    }

    doc_id = users_table.insert(payload)
    document = users_table.get(doc_id=doc_id)
    if document is None:
        raise RuntimeError("Failed to create user.")

    created_user = _serialize_user(document)

    has_profile_data = any(field is not None for field in (name, phone, address))
    if has_profile_data:
        create_profile_for_user(
            user_id=created_user.id,
            name=name or "",
            phone=phone or "",
            address=address or "",
        )

    return created_user


def get_user_by_id(user_id: TinyDBId) -> User | None:
    """Return a user by TinyDB id."""

    document = _get_user_document_by_id(user_id)
    if document is None:
        return None

    return _serialize_user(document)


def get_user_by_email(email: str) -> User | None:
    """Return a user by email."""

    users_table = get_users_table()
    user_query = Query()
    document = users_table.get(user_query.email == email)
    if document is None:
        return None

    return _serialize_user(document)


def list_users() -> list[User]:
    """Return all users stored in TinyDB."""

    users_table = get_users_table()
    documents = users_table.all()
    return [_serialize_user(document) for document in documents]


def update_user(user_id: TinyDBId, updates: dict[str, Any]) -> User | None:
    """Update mutable user fields and return updated record."""

    document = _get_user_document_by_id(user_id)
    if document is None:
        return None

    mutable_fields = {"email", "is_active", "role", "password"}
    safe_updates = {key: value for key, value in updates.items() if key in mutable_fields}

    if "password" in safe_updates:
        safe_updates["hashed_password"] = hash_password(str(safe_updates.pop("password")))

    if "role" in safe_updates:
        role_value = safe_updates["role"]
        safe_updates["role"] = UserRole(role_value).value

    if "email" in safe_updates:
        users_table = get_users_table()
        user_query = Query()
        existing_user = users_table.get(user_query.email == safe_updates["email"])
        if existing_user is not None and existing_user.doc_id != document.doc_id:
            raise ValueError("User with this email already exists.")

    if not safe_updates:
        return _serialize_user(document)

    users_table = get_users_table()
    users_table.update(safe_updates, doc_ids=[document.doc_id])
    updated_document = users_table.get(doc_id=document.doc_id)
    if updated_document is None:
        return None

    return _serialize_user(updated_document)


def delete_user(user_id: TinyDBId) -> bool:
    """Delete user and linked profile records."""

    document = _get_user_document_by_id(user_id)
    if document is None:
        return False

    normalized_id = _normalize_user_id(user_id)

    users_table = get_users_table()
    users_table.remove(doc_ids=[document.doc_id])

    profiles_table = get_profiles_table()
    profile_query = Query()
    if isinstance(normalized_id, int):
        profiles_table.remove(profile_query.user_id.one_of([normalized_id, str(normalized_id)]))
    else:
        profiles_table.remove(profile_query.user_id == normalized_id)

    return True


def update_user_password(user_id: TinyDBId, password: str) -> User | None:
    """Update only the user password and return updated record."""

    document = _get_user_document_by_id(user_id)
    if document is None:
        return None

    users_table = get_users_table()
    users_table.update(
        {
            "hashed_password": hash_password(password),
        },
        doc_ids=[document.doc_id],
    )

    updated_document = users_table.get(doc_id=document.doc_id)
    if updated_document is None:
        return None

    return _serialize_user(updated_document)
