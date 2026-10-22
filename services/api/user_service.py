from datetime import datetime, timezone
from threading import RLock

from passlib.hash import bcrypt
from tinydb import TinyDB

from models import Profile, User, UserRole


def get_user_by_id(database: TinyDB, user_id: int) -> User | None:
    document = database.table("users").get(doc_id=user_id)
    return User.model_validate(document) if document is not None else None


def get_user_by_email(database: TinyDB, email: str) -> User | None:
    normalized_email = email.strip().lower()
    document = database.table("users").get(lambda item: item["email"] == normalized_email)
    return User.model_validate(document) if document is not None else None


def list_users(database: TinyDB) -> list[User]:
    return [User.model_validate(document) for document in database.table("users").all()]


def create_user(
    database: TinyDB,
    lock: RLock,
    email: str,
    password: str,
    profile_data: dict[str, str | None],
) -> User:
    users = database.table("users")
    profiles = database.table("profiles")
    normalized_email = email.strip().lower()
    with lock:
        if get_user_by_email(database, normalized_email) is not None:
            raise ValueError("email_exists")
        user_id = users.insert({
            "email": normalized_email,
            "hashed_password": bcrypt.hash(password),
            "is_active": True,
            "role": UserRole.user.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        profile_id = None
        try:
            users.update({"id": user_id}, doc_ids=[user_id])
            profile_id = profiles.insert({"user_id": user_id, **profile_data})
            profiles.update({"id": profile_id}, doc_ids=[profile_id])
        except Exception:
            if profile_id is not None:
                profiles.remove(doc_ids=[profile_id])
            users.remove(doc_ids=[user_id])
            raise
        return get_user_by_id(database, user_id)


def update_user(database: TinyDB, lock: RLock, user_id: int, changes: dict) -> User | None:
    users = database.table("users")
    with lock:
        current_user = get_user_by_id(database, user_id)
        if current_user is None:
            return None
        new_email = changes.get("email")
        if new_email is not None:
            normalized_email = str(new_email).strip().lower()
            existing = get_user_by_email(database, normalized_email)
            if existing is not None and existing.id != user_id:
                raise ValueError("email_exists")
            changes["email"] = normalized_email
        if "password" in changes:
            changes["hashed_password"] = bcrypt.hash(changes.pop("password"))
            changes["password_reset_hash"] = None
        if isinstance(changes.get("role"), UserRole):
            changes["role"] = changes["role"].value
        users.update(changes, doc_ids=[user_id])
        return get_user_by_id(database, user_id)


def delete_user(database: TinyDB, lock: RLock, user_id: int) -> bool:
    users = database.table("users")
    profiles = database.table("profiles")
    with lock:
        if get_user_by_id(database, user_id) is None:
            return False
        profile_ids = [profile.doc_id for profile in profiles.search(lambda item: item["user_id"] == user_id)]
        profiles.remove(doc_ids=profile_ids)
        users.remove(doc_ids=[user_id])
        return True


def get_profile_by_user_id(database: TinyDB, user_id: int) -> Profile | None:
    document = database.table("profiles").get(lambda item: item["user_id"] == user_id)
    return Profile.model_validate(document) if document is not None else None


def update_profile(database: TinyDB, lock: RLock, user_id: int, changes: dict) -> Profile | None:
    profiles = database.table("profiles")
    with lock:
        profile = get_profile_by_user_id(database, user_id)
        if profile is None:
            return None
        profiles.update(changes, doc_ids=[profile.id])
        return get_profile_by_user_id(database, user_id)