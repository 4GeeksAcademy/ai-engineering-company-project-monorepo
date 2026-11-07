"""User & Profile service layer over SQL (Postgres/Supabase).

Migrated from TinyDB — see app/models/user_storage.py (the table
definition) and
supabase/migrations/20261106120000_create_users_profiles_tokens_suppliers_incidents_records.sql
(the DDL). Every public function keeps the exact same name, signature,
and return shape it had over TinyDB, so the routers that call it
(app/routers/users.py, app/routers/auth.py) and app/core/deps.py did not
need to change.

Each function opens and closes its own `Session(engine)`, mirroring the
old `with _get_db() as db:` per-call pattern (TinyDB opened a fresh
client per call too) — a deliberate choice to avoid threading `db:
Session = Depends(get_db)` through every router signature just for this
migration; other SQL-backed routes in this app (inventory, telemetry) do
use the DI pattern, this module intentionally does not.

Stored user row (never contains name/phone/address):
    id, email, hashed_password, is_active, role, created_at
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, insert, select, update
from sqlmodel import Session

from app.core.database import engine
from app.core.security import hash_password, verify_password
from app.models.user import UserCreate, UserRole, UserUpdate
from app.models.user_storage import users_table
from app.services import profiles as profiles_service


def _get_session() -> Session:
    return Session(engine)


def _build_user_response(row, profile: dict | None) -> dict:
    """Assemble the public user payload (excludes hashed_password).

    `created_at` is formatted as an ISO string here (not left as a
    `datetime`) because `UserResponse.created_at` is typed `str` — same
    contract TinyDB already satisfied by storing an ISO string directly.
    """
    created_at = row.created_at
    return {
        "id": row.id,
        "email": row.email,
        "is_active": row.is_active,
        "role": row.role,
        "created_at": created_at.isoformat() if isinstance(created_at, datetime) else created_at,
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
    with _get_session() as db:
        existing = db.execute(select(users_table.c.id).where(users_table.c.email == payload.email)).first()
        if existing is not None:
            raise ValueError(f"A user with email '{payload.email}' already exists.")

        now = datetime.now(timezone.utc)
        result = db.execute(
            insert(users_table).values(
                email=payload.email,
                hashed_password=hash_password(payload.password),
                is_active=True,
                role=payload.role.value,
                created_at=now,
            )
        )
        db.commit()
        user_id = result.inserted_primary_key[0]

        # Linked profile — created in the same operation (one-to-one via
        # user_id). Name/phone/address live here, never on the user row.
        profiles_service.create_profile(
            user_id,
            name=payload.name,
            phone=payload.phone,
            address=payload.address,
        )

        row = db.execute(select(users_table).where(users_table.c.id == user_id)).one()
        profile = profiles_service.get_profile_by_user_id(user_id)
        return _build_user_response(row, profile)


def list_users() -> list[dict]:
    """Return every user with its linked profile."""
    with _get_session() as db:
        rows = db.execute(select(users_table)).all()
        return [_build_user_response(row, profiles_service.get_profile_by_user_id(row.id)) for row in rows]


def get_user_by_id(user_id: int) -> dict | None:
    """Return a single user (with profile) by id, or None."""
    with _get_session() as db:
        row = db.execute(select(users_table).where(users_table.c.id == user_id)).first()
        if row is None:
            return None
        profile = profiles_service.get_profile_by_user_id(user_id)
        return _build_user_response(row, profile)


def get_user_by_email(email: str) -> dict | None:
    """Return a single user (with profile) by email, or None."""
    with _get_session() as db:
        row = db.execute(select(users_table).where(users_table.c.email == email)).first()
        if row is None:
            return None
        profile = profiles_service.get_profile_by_user_id(row.id)
        return _build_user_response(row, profile)


def get_user_credentials(email: str) -> dict | None:
    """Return the raw stored user row (includes hashed_password) as a dict.

    Used by the login flow to verify credentials. Not exposed via REST.
    """
    with _get_session() as db:
        row = db.execute(select(users_table).where(users_table.c.email == email)).first()
        return dict(row._mapping) if row is not None else None


def update_user(user_id: int, payload: UserUpdate) -> dict | None:
    """Update credential fields (email, password, role, is_active).

    Only fields present in the payload are changed; a provided password is
    re-hashed before storage. Raises ValueError on duplicate email.
    Returns None if the user does not exist.
    """
    with _get_session() as db:
        existing = db.execute(select(users_table).where(users_table.c.id == user_id)).first()
        if existing is None:
            return None

        data = payload.model_dump(exclude_unset=True)

        if "role" in data and isinstance(data["role"], UserRole):
            data["role"] = data["role"].value

        if "email" in data and data["email"] != existing.email:
            dup = db.execute(
                select(users_table.c.id).where(users_table.c.email == data["email"])
            ).first()
            if dup is not None:
                raise ValueError(f"A user with email '{data['email']}' already exists.")

        if "password" in data and data["password"] is not None:
            data["hashed_password"] = hash_password(data.pop("password"))
        else:
            data.pop("password", None)

        if data:
            db.execute(update(users_table).where(users_table.c.id == user_id).values(**data))
            db.commit()

        new_row = db.execute(select(users_table).where(users_table.c.id == user_id)).one()
        profile = profiles_service.get_profile_by_user_id(user_id)
        return _build_user_response(new_row, profile)


def delete_user(user_id: int) -> bool:
    """Delete a user and its linked profile. Returns False if not found."""
    with _get_session() as db:
        existing = db.execute(select(users_table.c.id).where(users_table.c.id == user_id)).first()
        if existing is None:
            return False

        db.execute(delete(users_table).where(users_table.c.id == user_id))
        db.commit()
        # Cascade: also removed automatically by the FK's ON DELETE CASCADE
        # (profiles.user_id), but the service call is kept too so behavior
        # does not depend on that constraint existing in every environment
        # (e.g. the SQLite test engine mirrors it, but keeping this
        # explicit call matches the pre-migration contract exactly).
        profiles_service.delete_profile_by_user_id(user_id)
        return True


def authenticate(email: str, password: str) -> dict | None:
    """Verify email+password. Returns the raw user row (as a dict) on success."""
    doc = get_user_credentials(email)
    if doc is None:
        return None
    if not verify_password(password, doc["hashed_password"]):
        return None
    return doc
