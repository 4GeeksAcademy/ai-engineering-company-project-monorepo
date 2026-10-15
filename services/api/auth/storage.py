import os
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from tinydb import TinyDB, Query

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "auth.json"
_lock = threading.RLock()


@contextmanager
def open_db():
    with _lock:
        path = Path(os.getenv("AUTH_DB_PATH", str(DB_PATH)))
        path.parent.mkdir(parents=True, exist_ok=True)
        db = TinyDB(path)
        try:
            yield db
        finally:
            db.close()


def as_dict(document):
    return {**document, "id": document.doc_id} if document else None


def create_user(email, hashed_password, name=None, phone=None, address=None):
    email = str(email).strip().lower()
    with open_db() as db:
        users = db.table("users")
        profiles = db.table("profiles")

        if users.contains(Query().email == email):
            raise ValueError("Email already registered")

        record = {
            "email": email,
            "hashed_password": hashed_password,
            "is_active": True,
            "role": "user",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        user_id = users.insert(record)
        try:
            profiles.insert({
                "user_id": user_id,
                "name": name,
                "phone": phone,
                "address": address,
            })
        except Exception:
            users.remove(doc_ids=[user_id])
            raise

        return {**record, "id": user_id}


def list_users():
    with open_db() as db:
        return [as_dict(doc) for doc in db.table("users").all()]


def get_user_by_id(user_id):
    with open_db() as db:
        return as_dict(db.table("users").get(doc_id=user_id))


def get_user_by_email(email):
    with open_db() as db:
        return as_dict(db.table("users").get(
            Query().email == str(email).strip().lower()
        ))


def update_user(user_id, changes):
    with open_db() as db:
        users = db.table("users")
        if not users.contains(doc_id=user_id):
            return None

        changes = dict(changes)
        if "email" in changes:
            email = str(changes["email"]).strip().lower()
            existing = users.get(Query().email == email)
            if existing and existing.doc_id != user_id:
                raise ValueError("Email already registered")
            changes["email"] = email

        users.update(changes, doc_ids=[user_id])
        return as_dict(users.get(doc_id=user_id))


def delete_user(user_id):
    with open_db() as db:
        users = db.table("users")
        if not users.contains(doc_id=user_id):
            return False

        db.table("profiles").remove(Query().user_id == user_id)
        users.remove(doc_ids=[user_id])
        return True


def get_profile_by_user_id(user_id):
    with open_db() as db:
        return as_dict(db.table("profiles").get(
            Query().user_id == user_id
        ))


def update_profile(user_id, changes):
    with open_db() as db:
        profiles = db.table("profiles")
        profile = profiles.get(Query().user_id == user_id)
        if not profile:
            return None

        profiles.update(changes, doc_ids=[profile.doc_id])
        return as_dict(profiles.get(doc_id=profile.doc_id))
