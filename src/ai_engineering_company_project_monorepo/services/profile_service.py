from dataclasses import replace
from collections.abc import Mapping
from uuid import uuid4

from tinydb import Query, TinyDB

from ai_engineering_company_project_monorepo.models.profile import Profile


def create_profile(
    database: TinyDB,
    *,
    user_id: str,
    name: str | None = None,
    phone: str | None = None,
    address: str | None = None,
) -> Profile:
    profile = Profile(
        id=str(uuid4()),
        user_id=user_id,
        name=name,
        phone=phone,
        address=address,
    )
    database.table("profiles").insert(profile.to_document())
    return profile


def get_profile_by_user_id(database: TinyDB, user_id: str) -> Profile | None:
    record = database.table("profiles").get(Query().user_id == user_id)
    return Profile.from_document(record) if record is not None else None


def update_profile(
    database: TinyDB,
    user_id: str,
    updates: Mapping[str, str | None],
) -> Profile | None:
    allowed_fields = {"name", "phone", "address"}
    if not set(updates).issubset(allowed_fields):
        raise ValueError("Only name, phone, and address can be updated")

    table = database.table("profiles")
    record = table.get(Query().user_id == user_id)
    if record is None:
        return None

    profile = replace(Profile.from_document(record), **updates)
    table.update(profile.to_document(), doc_ids=[record.doc_id])
    return profile


def delete_profile_by_user_id(database: TinyDB, user_id: str) -> bool:
    removed = database.table("profiles").remove(Query().user_id == user_id)
    return bool(removed)