"""Profile service layer over SQL (Postgres/Supabase).

Migrated from TinyDB — see app/models/profile_storage.py. The
``profiles`` table holds one row per user, linked via the ``user_id``
column, which is now a real `UNIQUE ... REFERENCES users(id)` constraint
(one-to-one with ``users``) instead of an application-level-only check.

Same per-call session pattern as app/services/users.py — see that
module's docstring for why.
"""

from __future__ import annotations

from sqlalchemy import delete, insert, select, update
from sqlmodel import Session

from app.core.database import engine
from app.models.profile import ProfileUpdate
from app.models.profile_storage import profiles_table


def _get_session() -> Session:
    return Session(engine)


def _build_profile_response(row) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "name": row.name,
        "phone": row.phone,
        "address": row.address,
    }


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
    with _get_session() as db:
        existing = db.execute(select(profiles_table.c.id).where(profiles_table.c.user_id == user_id)).first()
        if existing is not None:
            raise ValueError(f"User {user_id} already has a profile")

        result = db.execute(
            insert(profiles_table).values(user_id=user_id, name=name, phone=phone, address=address)
        )
        db.commit()
        profile_id = result.inserted_primary_key[0]

        row = db.execute(select(profiles_table).where(profiles_table.c.id == profile_id)).one()
        return _build_profile_response(row)


def get_profile_by_user_id(user_id: int) -> dict | None:
    """Return the profile owned by ``user_id``, or None."""
    with _get_session() as db:
        row = db.execute(select(profiles_table).where(profiles_table.c.user_id == user_id)).first()
        return _build_profile_response(row) if row is not None else None


def update_profile(user_id: int, payload: ProfileUpdate) -> dict | None:
    """Update name/phone/address of the profile owned by ``user_id``.

    Partial update: only fields present in the payload are changed.
    Returns None if the user has no profile.
    """
    with _get_session() as db:
        row = db.execute(select(profiles_table).where(profiles_table.c.user_id == user_id)).first()
        if row is None:
            return None

        data = payload.model_dump(exclude_unset=True)
        if data:
            db.execute(update(profiles_table).where(profiles_table.c.id == row.id).values(**data))
            db.commit()

        updated = db.execute(select(profiles_table).where(profiles_table.c.id == row.id)).one()
        return _build_profile_response(updated)


def delete_profile_by_user_id(user_id: int) -> bool:
    """Delete the profile owned by ``user_id``. Returns False if absent."""
    with _get_session() as db:
        row = db.execute(select(profiles_table.c.id).where(profiles_table.c.user_id == user_id)).first()
        if row is None:
            return False

        db.execute(delete(profiles_table).where(profiles_table.c.user_id == user_id))
        db.commit()
        return True
