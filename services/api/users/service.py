"""Business logic for the users domain: the internal user store (CRUD).

Public functions: ``create_user``, ``get_user`` (by id), ``get_user_by_email``,
``update_user``, ``delete_user`` (plus ``list_users``). They return ``UserOut``
and raise the domain errors below; routers translate those into HTTP codes.
``get_doc`` / ``get_doc_by_email`` return the raw stored document (with the
hash) and exist for the auth layer only.

Users live in their own TinyDB file (``users/db.json``), separate from the
business data. Each document is a ``User`` (see ``users.schemas``): ``id`` (the
identifier that goes in the JWT), ``email``, ``hashed_password`` (bcrypt),
``is_active``, ``role`` and ``created_at`` — the plain password is never stored.
Users are created by anyone through the public sign-up (``POST /users``, always
with the ``user`` role), by the ``create-user`` CLI, or — on an empty store —
bootstrapped as ``admin`` from the ``AUTH_INITIAL_EMAIL`` / ``AUTH_INITIAL_PASSWORD``
env vars. There is no default password anywhere in the code.

Invariant: the store is never left empty, so the API can't lock itself out.
Each user has exactly one Profile (``profiles`` domain, display name and contact
data), created and deleted together with the user.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from uuid import UUID

from tinydb import Query, TinyDB

from auth.security import hash_password, verify_password
from core.config import get_users_db_path
from profiles import service as profiles_service

from .schemas import DirectoryEntry, Role, User, UserCreate, UserOut, UserUpdate

logger = logging.getLogger(__name__)

_db: TinyDB | None = None


class UserNotFoundError(Exception):
    def __init__(self, identifier: UUID | str):
        """``identifier`` is the id or the email that was looked up."""
        self.identifier = identifier
        super().__init__(f"User {identifier} not found")


class EmailTakenError(Exception):
    def __init__(self, email: str):
        self.email = email
        super().__init__(f"A user with email '{email}' already exists")


class LastUserError(Exception):
    def __init__(self):
        super().__init__("Cannot delete the last remaining user")


class WrongPasswordError(Exception):
    def __init__(self):
        super().__init__("Current password is incorrect")


class CurrentPasswordRequiredError(Exception):
    def __init__(self):
        super().__init__("current_password is required to change your own email or password")


class LastAdminError(Exception):
    def __init__(self):
        super().__init__("Cannot demote, deactivate or delete the last active admin")


def get_db() -> TinyDB:
    global _db
    if _db is None:
        _db = TinyDB(get_users_db_path())
    return _db


def get_doc(user_uuid: UUID):
    """Stored user document (includes the password hash) or ``None``."""
    return get_db().get(Query().id == str(user_uuid))


def get_doc_by_email(email: str):
    return get_db().get(Query().email == email.strip().casefold())


def list_users() -> list[UserOut]:
    return [_to_out(doc) for doc in get_db().all()]


def list_directory() -> list[DirectoryEntry]:
    """Active users with their profile name, sorted by name. Deactivated
    accounts are left out, and so is everything but the name."""
    names = {p.user_id: p.name for p in profiles_service.list_profiles()}
    entries = [
        DirectoryEntry(user_id=doc["id"], name=names[UUID(doc["id"])])
        for doc in get_db().all()
        if doc["is_active"] and UUID(doc["id"]) in names
    ]
    return sorted(entries, key=lambda e: e.name.casefold())


def get_user(user_uuid: UUID) -> UserOut:
    doc = get_doc(user_uuid)
    if doc is None:
        raise UserNotFoundError(user_uuid)
    return _to_out(doc)


def get_user_by_email(email: str) -> UserOut:
    """Public counterpart of ``get_doc_by_email``: no hash in the result."""
    doc = get_doc_by_email(email)
    if doc is None:
        raise UserNotFoundError(email.strip().casefold())
    return _to_out(doc)


def create_user(payload: UserCreate, role: Role = Role.user, is_active: bool = True) -> UserOut:
    """Create the user and its linked Profile in one operation.

    ``role`` is not part of ``UserCreate`` on purpose: the API can't grant it.
    ``is_active=False`` creates an account that can't sign in until an admin
    activates it (the public sign-up creates active accounts).
    The optional ``name`` / ``phone`` / ``address`` go to the Profile, never to User.
    """
    if get_doc_by_email(payload.email) is not None:
        raise EmailTakenError(payload.email)
    user = User(
        email=payload.email, hashed_password=hash_password(payload.password), role=role, is_active=is_active
    )
    doc = user.model_dump(mode="json")
    doc_id = get_db().insert(doc)
    try:
        # One-to-one: a user never exists without its Profile.
        profiles_service.ensure_profile(
            doc["id"], doc["email"], name=payload.name, phone=payload.phone, address=payload.address
        )
    except Exception:
        get_db().remove(doc_ids=[doc_id])
        raise
    return _to_out(doc)


def _active_admin_count() -> int:
    return get_db().count((Query().role == Role.admin.value) & (Query().is_active == True))  # noqa: E712 (TinyDB query)


def _is_active_admin(doc) -> bool:
    return doc["role"] == Role.admin and doc["is_active"]


def update_user(user_uuid: UUID, payload: UserUpdate, *, check_password: bool = True) -> UserOut:
    """Apply the fields present in ``payload``.

    ``check_password`` is True when the owner edits their own account: then
    changing the email or the password needs their ``current_password``. An
    admin editing someone else passes False (they don't know that password).
    Who may change what is enforced by the router before this is called.
    """
    doc = get_doc(user_uuid)
    if doc is None:
        raise UserNotFoundError(user_uuid)

    changes = payload.model_dump(exclude_unset=True, exclude={"current_password"})
    if not changes:
        return _to_out(doc)

    if check_password and ("email" in changes or "password" in changes):
        if not payload.current_password:
            raise CurrentPasswordRequiredError()
        if not verify_password(payload.current_password, doc["hashed_password"]):
            raise WrongPasswordError()

    stored: dict = {}
    if "email" in changes and changes["email"] != doc["email"]:
        if get_doc_by_email(changes["email"]) is not None:
            raise EmailTakenError(changes["email"])
        stored["email"] = changes["email"]
    if "password" in changes:
        stored["hashed_password"] = hash_password(changes["password"])
    new_role = changes.get("role", doc["role"])
    new_active = changes.get("is_active", doc["is_active"])
    if _is_active_admin(doc) and not (new_role == Role.admin and new_active) and _active_admin_count() <= 1:
        raise LastAdminError()  # the API must never be left without an active admin
    if "role" in changes and new_role != doc["role"]:
        stored["role"] = new_role.value
    if "is_active" in changes and new_active != doc["is_active"]:
        stored["is_active"] = new_active
    if stored:
        get_db().update(stored, doc_ids=[doc.doc_id])
    return get_user(user_uuid)


def delete_user(user_uuid: UUID) -> None:
    doc = get_doc(user_uuid)
    if doc is None:
        raise UserNotFoundError(user_uuid)
    if len(get_db()) <= 1:
        raise LastUserError()
    if _is_active_admin(doc) and _active_admin_count() <= 1:
        raise LastAdminError()
    get_db().remove(doc_ids=[doc.doc_id])
    profiles_service.delete_profile(user_uuid)  # cascade


def sync_profiles() -> None:
    """Enforce the one-to-one relation across the two stores, at startup:
    give a Profile to every user that lacks one (users created before profiles
    existed) and drop profiles whose user is gone."""
    users = {doc["id"]: doc["email"] for doc in get_db().all()}
    for user_uuid, email in users.items():
        profiles_service.ensure_profile(user_uuid, email)
    for orphan in profiles_service.profile_user_ids() - users.keys():
        profiles_service.delete_profile(orphan)


def bootstrap_first_user() -> None:
    """Create the first user from env vars when the user store is empty."""
    if len(get_db()) > 0:
        return
    email = os.environ.get("AUTH_INITIAL_EMAIL")
    password = os.environ.get("AUTH_INITIAL_PASSWORD")
    if not (email and password):
        logger.warning(
            "No users exist and AUTH_INITIAL_EMAIL / AUTH_INITIAL_PASSWORD are not set: "
            "nobody can log in. Set them or run `create-user`."
        )
        return
    user = create_user(UserCreate(email=email, password=password), role=Role.admin)
    logger.info("Bootstrapped first user %s", user.email)


def migrate_legacy_users() -> None:
    """Upgrade documents written before the User model existed
    (``{user_uuid, email, password_hash}``) to ``{id, email, hashed_password,
    is_active, role, created_at}``, at startup. Idempotent. The oldest legacy
    user becomes ``admin`` if nobody else is, so the store is never admin-less."""
    legacy = [doc for doc in get_db().all() if "id" not in doc]
    if not legacy:
        return
    has_admin = any(doc.get("role") == Role.admin for doc in get_db().all())
    now = datetime.now(timezone.utc).isoformat()

    def upgrade(role: Role):
        def transform(doc):
            doc["id"] = doc.pop("user_uuid")
            doc["hashed_password"] = doc.pop("password_hash")
            doc.update(is_active=True, role=role.value, created_at=now)
        return transform

    for doc in legacy:
        role = Role.user if has_admin else Role.admin
        get_db().update(upgrade(role), doc_ids=[doc.doc_id])
        has_admin = True
    logger.info("Migrated %d legacy user document(s) to the User model", len(legacy))


def _to_out(doc) -> UserOut:
    return UserOut.model_validate(doc)  # extra keys (hashed_password) are dropped
