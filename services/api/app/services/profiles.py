"""Profile service layer over TinyDB.

The ``profiles`` table holds one document per user, linked via the unique
``user_id`` field (one-to-one with the ``users`` table).
"""

from __future__ import annotations

from pathlib import Path

from tinydb import TinyDB, where

from app.models.profile import ProfileUpdate

# Shared TinyDB file (same db.json used by seed.py and the suppliers router)
_DB_PATH = Path(__file__).resolve().parent.parent.parent / "db.json"

PROFILES_TABLE = "profiles"


def _get_db() -> TinyDB:
    return TinyDB(_DB_PATH)


def _build_profile_response(doc) -> dict:
    return {"id": doc.doc_id, **dict(doc)}


def create_profile(
    user_id: int,
    *,
    name: str | None = None,
    phone: str | None = None,
    address: str | None = None,
) -> dict:
    """Create the profile linked to a user (one-to-one via user_id).

    Raises ValueError if the user already has a profile.
    """
    db = _get_db()
    table = db.table(PROFILES_TABLE)

    if table.get(where("user_id") == user_id) is not None:
        db.close()
        raise ValueError(f"User {user_id} already has a profile")

    doc_id = table.insert(
        {
            "user_id": user_id,
            "name": name,
            "phone": phone,
            "address": address,
        }
    )
    doc = table.get(doc_id=doc_id)
    db.close()
    return _build_profile_response(doc)


def get_profile_by_user_id(user_id: int) -> dict | None:
    """Return the profile owned by ``user_id``, or None."""
    db = _get_db()
    profile = db.table(PROFILES_TABLE).get(where("user_id") == user_id)
    db.close()
    return _build_profile_response(profile) if profile is not None else None


def update_profile(user_id: int, payload: ProfileUpdate) -> dict | None:
    """Update name/phone/address of the profile owned by ``user_id``.

    Partial update: only fields present in the payload are changed.
    Returns None if the user has no profile.
    """
    db = _get_db()
    table = db.table(PROFILES_TABLE)

    profile = table.get(where("user_id") == user_id)
    if profile is None:
        db.close()
        return None

    data = payload.model_dump(exclude_unset=True)
    table.update(data, doc_ids=[profile.doc_id])

    updated = table.get(doc_id=profile.doc_id)
    db.close()
    return _build_profile_response(updated)


def delete_profile_by_user_id(user_id: int) -> bool:
    """Delete the profile owned by ``user_id``. Returns False if absent."""
    db = _get_db()
    table = db.table(PROFILES_TABLE)

    profile = table.get(where("user_id") == user_id)
    if profile is None:
        db.close()
        return False

    table.remove(doc_ids=[profile.doc_id])
    db.close()
    return True
