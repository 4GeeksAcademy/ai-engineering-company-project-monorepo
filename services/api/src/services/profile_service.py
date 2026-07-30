"""Profile service layer backed by TinyDB."""

from __future__ import annotations

from typing import Any

from tinydb import Query
from tinydb.table import Document

from src.database import get_profiles_table
from src.models.profile import Profile
from src.models.user import TinyDBId


def _normalize_user_id(user_id: TinyDBId) -> TinyDBId:
    if isinstance(user_id, str) and user_id.isdigit():
        return int(user_id)
    return user_id


def _serialize_profile(document: Document) -> Profile:
    payload = dict(document)
    payload["id"] = document.doc_id
    return Profile.model_validate(payload)


def _build_user_id_query(user_id: TinyDBId):
    profile_query = Query()
    normalized = _normalize_user_id(user_id)
    alternatives = {normalized}

    if isinstance(normalized, int):
        alternatives.add(str(normalized))
    elif isinstance(normalized, str) and normalized.isdigit():
        alternatives.add(int(normalized))

    return profile_query.user_id.one_of(list(alternatives))


def create_profile_for_user(
    user_id: TinyDBId,
    name: str,
    phone: str,
    address: str,
) -> Profile:
    """Create a profile record linked to a user."""

    profiles_table = get_profiles_table()
    payload = {
        "user_id": _normalize_user_id(user_id),
        "name": name,
        "phone": phone,
        "address": address,
    }
    doc_id = profiles_table.insert(payload)
    document = profiles_table.get(doc_id=doc_id)

    if document is None:
        raise RuntimeError("Failed to create user profile.")

    return _serialize_profile(document)


def get_profile_by_user_id(user_id: TinyDBId) -> Profile | None:
    """Return profile linked to user_id, if any."""

    profiles_table = get_profiles_table()
    query = _build_user_id_query(user_id)
    document = profiles_table.get(query)
    if document is None:
        return None

    return _serialize_profile(document)


def update_profile(user_id: TinyDBId, updates: dict[str, Any]) -> Profile | None:
    """Update profile fields for a user and return updated record."""

    allowed_fields = {"name", "phone", "address"}
    safe_updates = {key: value for key, value in updates.items() if key in allowed_fields}

    if not safe_updates:
        return get_profile_by_user_id(user_id)

    profiles_table = get_profiles_table()
    query = _build_user_id_query(user_id)
    updated_doc_ids = profiles_table.update(safe_updates, query)
    if not updated_doc_ids:
        return None

    updated_document = profiles_table.get(doc_id=updated_doc_ids[0])
    if updated_document is None:
        return None

    return _serialize_profile(updated_document)
