from datetime import datetime, timezone

from tinydb import Query

from .db import get_db
from .security import hash_password


def create_user(email: str, password: str, role: str = "user"):
    db = get_db()

    existing = db.get(Query().email == email)
    if existing:
        db.close()
        return None

    user = {
        "email": email,
        "hashed_password": hash_password(password),
        "is_active": True,
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    user_id = db.insert(user)
    user["id"] = user_id
    db.update({"id": user_id}, doc_ids=[user_id])
    db.close()

    return user


def get_user_by_email(email: str):
    db = get_db()
    user = db.get(Query().email == email)
    db.close()
    return user


def get_user_by_id(user_id: int):
    db = get_db()
    user = db.get(Query().id == user_id)
    db.close()
    return user


def update_user(user_id: int, data: dict):
    db = get_db()
    user = db.get(Query().id == user_id)

    if not user:
        db.close()
        return None

    if "password" in data:
        data["hashed_password"] = hash_password(data.pop("password"))

    db.update(data, doc_ids=[user.doc_id])
    updated = db.get(doc_id=user.doc_id)
    db.close()

    return updated


def delete_user(user_id: int):
    db = get_db()
    user = db.get(Query().id == user_id)

    if not user:
        db.close()
        return False

    db.remove(doc_ids=[user.doc_id])
    db.close()
    return True
