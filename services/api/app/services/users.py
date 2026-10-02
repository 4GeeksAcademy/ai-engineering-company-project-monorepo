"""User & Profile service layer over TinyDB.

All persistence logic for users and their linked profiles lives here.
Routers call these functions; they never touch TinyDB directly.

Stored user document (never contains name/phone/address):
    id (doc_id), email, hashed_password, is_active, role, created_at
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from tinydb import TinyDB, where

from app.core.security import hash_password, verify_password
from app.models.user import UserCreate, UserUpdate, UserRole
from app.services import profiles as profiles_service

# Shared TinyDB file (same db.json used by seed.py and the suppliers router)
_DB_PATH = Path(__file__).resolve().parent.parent.parent / "db.json"

USERS_TABLE = "users"


def _get_db() -> TinyDB:
    return TinyDB(_DB_PATH)


def _build_user_response(doc, profile: dict | None) -> dict:
    """Assemble the public user payload (excludes hashed_password)."""
    return {
        "id": doc.doc_id,
        "email": doc["email"],
        "is_active": doc.get("is_active", True),
        "role": doc["role"],
        "created_at": doc["created_at"],
        "profile": profile,
    }


def get_profile_by_user_id(user_id: int) -> dict | None:
    """Return the profile linked to a user, if any."""
    return profiles_service.get_profile_by_user_id(user_id)


def create_user(payload: UserCreate) -> dict:
    """Create a user (password hashed) plus the linked Profile.

    The role defaults to ``user`` (see UserCreate). Raises ValueError if
    the email is already registered.
    """
    db = _get_db()
    users = db.table(USERS_TABLE)

    if users.search(where("email") == payload.email):
        db.close()
        raise ValueError(f"A user with email '{payload.email}' already exists.")

    now = datetime.now(timezone.utc).isoformat()

    user_id = users.insert(
        {
            "email": payload.email,
            "hashed_password": hash_password(payload.password),
            "is_active": True,
            "role": payload.role.value,
            "created_at": now,
        }
    )

    # Linked profile — created in the same operation (one-to-one via
    # user_id). Name/phone/address live here, never on the user document.
    profiles_service.create_profile(
        user_id,
        name=payload.name,
        phone=payload.phone,
        address=payload.address,
    )

    doc = users.get(doc_id=user_id)
    profile = profiles_service.get_profile_by_user_id(user_id)
    db.close()
    return _build_user_response(doc, profile)


def list_users() -> list[dict]:
    """Return every user with its linked profile."""
    db = _get_db()
    users = db.table(USERS_TABLE)

    result = [
        _build_user_response(doc, profiles_service.get_profile_by_user_id(doc.doc_id))
        for doc in users.all()
    ]
    db.close()
    return result


def get_user_by_id(user_id: int) -> dict | None:
    """Return a single user (with profile) by id, or None."""
    db = _get_db()
    doc = db.table(USERS_TABLE).get(doc_id=user_id)
    if doc is None:
        db.close()
        return None
    profile = profiles_service.get_profile_by_user_id(user_id)
    db.close()
    return _build_user_response(doc, profile)


def get_user_by_email(email: str) -> dict | None:
    """Return a single user (with profile) by email, or None."""
    db = _get_db()
    doc = db.table(USERS_TABLE).get(where("email") == email)
    if doc is None:
        db.close()
        return None
    profile = profiles_service.get_profile_by_user_id(doc.doc_id)
    db.close()
    return _build_user_response(doc, profile)


def get_user_credentials(email: str) -> dict | None:
    """Return the raw stored user document (includes hashed_password).

    Used by the login flow to verify credentials. Not exposed via REST.
    """
    db = _get_db()
    doc = db.table(USERS_TABLE).get(where("email") == email)
    db.close()
    return doc


def update_user(user_id: int, payload: UserUpdate) -> dict | None:
    """Update credential fields (email, password, role, is_active).

    Only fields present in the payload are changed; a provided password is
    re-hashed before storage. Raises ValueError on duplicate email.
    Returns None if the user does not exist.
    """
    db = _get_db()
    users = db.table(USERS_TABLE)

    doc = users.get(doc_id=user_id)
    if doc is None:
        db.close()
        return None

    data = payload.model_dump(exclude_unset=True)

    # Enum → stored string value
    if "role" in data and isinstance(data["role"], UserRole):
        data["role"] = data["role"].value

    if "email" in data and data["email"] != doc["email"]:
        if users.search(where("email") == data["email"]):
            db.close()
            raise ValueError(f"A user with email '{data['email']}' already exists.")

    if "password" in data and data["password"] is not None:
        data["hashed_password"] = hash_password(data.pop("password"))

    users.update(data, doc_ids=[user_id])

    new_doc = users.get(doc_id=user_id)
    profile = profiles_service.get_profile_by_user_id(user_id)
    db.close()
    return _build_user_response(new_doc, profile)


def delete_user(user_id: int) -> bool:
    """Delete a user and its linked profile. Returns False if not found."""
    db = _get_db()
    users = db.table(USERS_TABLE)

    if users.get(doc_id=user_id) is None:
        db.close()
        return False

    users.remove(doc_ids=[user_id])
    # Cascade: remove the linked profile (one-to-one via user_id)
    profiles_service.delete_profile_by_user_id(user_id)
    db.close()
    return True


def authenticate(email: str, password: str) -> dict | None:
    """Verify email+password. Returns the raw user doc on success."""
    doc = get_user_credentials(email)
    if doc is None:
        return None
    if not verify_password(password, doc["hashed_password"]):
        return None
    return doc
