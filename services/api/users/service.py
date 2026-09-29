"""Business logic for the users domain: the internal user store (CRUD).

Users live in their own TinyDB file (``users/db.json``), separate from the
business data. Each document holds ``user_uuid`` (the identifier that goes in
the JWT), ``email`` and ``password_hash`` (bcrypt) — the plain password is
never stored. Users are created by an already logged-in user
(``POST /users``), by the ``create-user`` CLI, or — on an empty store —
bootstrapped from the ``AUTH_INITIAL_EMAIL`` / ``AUTH_INITIAL_PASSWORD`` env
vars. There is no public sign-up and no default password anywhere in the code.

Invariant: the store is never left empty, so the API can't lock itself out.
Each user has exactly one Profile (``profiles`` domain, display name and contact
data), created and deleted together with the user.
"""

from __future__ import annotations

import logging
import os
from uuid import UUID, uuid4

from tinydb import Query, TinyDB

from auth.security import hash_password, verify_password
from core.config import get_users_db_path
from profiles import service as profiles_service

from .schemas import UserCreate, UserOut, UserUpdate

logger = logging.getLogger(__name__)

_db: TinyDB | None = None


class UserNotFoundError(Exception):
    def __init__(self, user_uuid: UUID):
        self.user_uuid = user_uuid
        super().__init__(f"User {user_uuid} not found")


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


def get_db() -> TinyDB:
    global _db
    if _db is None:
        _db = TinyDB(get_users_db_path())
    return _db


def get_doc(user_uuid: UUID):
    """Stored user document (includes the password hash) or ``None``."""
    return get_db().get(Query().user_uuid == str(user_uuid))


def get_doc_by_email(email: str):
    return get_db().get(Query().email == email.strip().casefold())


def list_users() -> list[UserOut]:
    return [_to_out(doc) for doc in get_db().all()]


def get_user(user_uuid: UUID) -> UserOut:
    doc = get_doc(user_uuid)
    if doc is None:
        raise UserNotFoundError(user_uuid)
    return _to_out(doc)


def create_user(payload: UserCreate) -> UserOut:
    if get_doc_by_email(payload.email) is not None:
        raise EmailTakenError(payload.email)
    doc = {
        "user_uuid": str(uuid4()),
        "email": payload.email,
        "password_hash": hash_password(payload.password),
    }
    doc_id = get_db().insert(doc)
    try:
        # One-to-one: a user never exists without its Profile.
        profiles_service.ensure_profile(doc["user_uuid"], doc["email"])
    except Exception:
        get_db().remove(doc_ids=[doc_id])
        raise
    return UserOut(user_uuid=doc["user_uuid"], email=doc["email"])


def update_user(user_uuid: UUID, payload: UserUpdate) -> UserOut:
    doc = get_doc(user_uuid)
    if doc is None:
        raise UserNotFoundError(user_uuid)

    changes = payload.model_dump(exclude_unset=True, exclude={"current_password"})
    if not changes:
        return _to_out(doc)

    if not verify_password(payload.current_password or "", doc["password_hash"]):
        raise WrongPasswordError()

    stored: dict = {}
    if "email" in changes and changes["email"] != doc["email"]:
        if get_doc_by_email(changes["email"]) is not None:
            raise EmailTakenError(changes["email"])
        stored["email"] = changes["email"]
    if "password" in changes:
        stored["password_hash"] = hash_password(changes["password"])
    if stored:
        get_db().update(stored, doc_ids=[doc.doc_id])
    return get_user(user_uuid)


def delete_user(user_uuid: UUID) -> None:
    doc = get_doc(user_uuid)
    if doc is None:
        raise UserNotFoundError(user_uuid)
    if len(get_db()) <= 1:
        raise LastUserError()
    get_db().remove(doc_ids=[doc.doc_id])
    profiles_service.delete_profile(user_uuid)  # cascade


def sync_profiles() -> None:
    """Enforce the one-to-one relation across the two stores, at startup:
    give a Profile to every user that lacks one (users created before profiles
    existed) and drop profiles whose user is gone."""
    users = {doc["user_uuid"]: doc["email"] for doc in get_db().all()}
    for user_uuid, email in users.items():
        profiles_service.ensure_profile(user_uuid, email)
    for orphan in profiles_service.profile_owner_uuids() - users.keys():
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
    user = create_user(UserCreate(email=email, password=password))
    logger.info("Bootstrapped first user %s", user.email)


def _to_out(doc) -> UserOut:
    return UserOut(user_uuid=doc["user_uuid"], email=doc["email"])
