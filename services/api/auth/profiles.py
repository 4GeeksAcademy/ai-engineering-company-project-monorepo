from pathlib import Path
from tinydb import TinyDB, Query

BASE_DIR = Path(__file__).resolve().parents[3]
DB_FILE = BASE_DIR / "services" / "api" / "auth" / "profiles.json"


def get_profiles_db():
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    return TinyDB(DB_FILE)


def get_profile_by_user_id(user_id: int):
    db = get_profiles_db()
    profile = db.get(Query().user_id == user_id)
    db.close()
    return profile


def create_profile(user_id: int, name: str, phone: str | None = None, address: str | None = None):
    db = get_profiles_db()

    profile = {
        "user_id": user_id,
        "name": name,
        "phone": phone,
        "address": address,
    }

    profile_id = db.insert(profile)
    profile["id"] = profile_id
    db.update({"id": profile_id}, doc_ids=[profile_id])
    db.close()

    return profile


def update_profile(user_id: int, data: dict):
    db = get_profiles_db()
    profile = db.get(Query().user_id == user_id)

    if not profile:
        db.close()
        return None

    db.update(data, doc_ids=[profile.doc_id])
    updated = db.get(doc_id=profile.doc_id)
    db.close()

    return updated
