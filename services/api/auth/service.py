"""Business logic for the auth domain: the internal user store and login.

Users live in their own TinyDB file (``auth/db.json``), separate from the
business data, and are created by an admin (``POST /auth/users``), by the
``create-user`` CLI, or — on an empty store — bootstrapped from the
``AUTH_ADMIN_USERNAME`` / ``AUTH_ADMIN_PASSWORD`` env vars. There is no public
self-registration and no default password anywhere in the code.
"""

from __future__ import annotations

import logging
import os

from tinydb import Query, TinyDB

from core.config import get_auth_db_path

from .schemas import Role, UserCreate
from .security import hash_password, verify_password

logger = logging.getLogger(__name__)

_db: TinyDB | None = None

# Verified against when the username doesn't exist, so a login attempt takes
# about the same time either way and can't be used to enumerate usernames.
_DUMMY_HASH = hash_password("not-a-real-password")


class UsernameTakenError(Exception):
    def __init__(self, username: str):
        self.username = username
        super().__init__(f"User '{username}' already exists")


def get_db() -> TinyDB:
    global _db
    if _db is None:
        _db = TinyDB(get_auth_db_path())
    return _db


def get_user(username: str) -> dict | None:
    """Stored user document (includes the password hash) or ``None``."""
    return get_db().get(Query().username == username.strip().casefold())


def create_user(payload: UserCreate) -> dict:
    if get_user(payload.username) is not None:
        raise UsernameTakenError(payload.username)
    doc = {
        "username": payload.username,
        "password_hash": hash_password(payload.password),
        "role": payload.role.value,
        "disabled": False,
    }
    get_db().insert(doc)
    return doc


def authenticate(username: str, password: str) -> dict | None:
    """The user if the credentials are valid and the account is enabled."""
    user = get_user(username)
    password_ok = verify_password(password, user["password_hash"] if user else _DUMMY_HASH)
    if user is None or not password_ok or user.get("disabled"):
        return None
    return user


def bootstrap_admin() -> None:
    """Create the first admin from env vars when the user store is empty."""
    if len(get_db()) > 0:
        return
    password = os.environ.get("AUTH_ADMIN_PASSWORD")
    if not password:
        logger.warning(
            "No users exist and AUTH_ADMIN_PASSWORD is not set: nobody can log in. "
            "Set it (and optionally AUTH_ADMIN_USERNAME) or run `create-user`."
        )
        return
    username = os.environ.get("AUTH_ADMIN_USERNAME", "admin")
    create_user(UserCreate(username=username, password=password, role=Role.ADMIN))
    logger.info("Bootstrapped admin user '%s'", username)
