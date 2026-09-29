from dataclasses import replace
from uuid import uuid4

from tinydb import Query, TinyDB

from ai_engineering_company_project_monorepo.models.user import User, UserRole
from ai_engineering_company_project_monorepo.services.profile_service import delete_profile_by_user_id


def create_user(
    database: TinyDB,
    *,
    email: str,
    hashed_password: str,
    is_active: bool = True,
    role: str = UserRole.USER.value,
) -> User:
    user = User(
        id=str(uuid4()),
        email=email,
        hashed_password=hashed_password,
        is_active=is_active,
        role=role,
    )
    database.table("users").insert(user.to_document())
    return user


def get_user_by_id(database: TinyDB, user_id: str) -> User | None:
    record = database.table("users").get(Query().id == user_id)
    return User.from_document(record) if record is not None else None


def get_user_by_email(database: TinyDB, email: str) -> User | None:
    record = database.table("users").get(Query().email == email)
    return User.from_document(record) if record is not None else None


def update_user(
    database: TinyDB,
    user_id: str,
    *,
    email: str | None = None,
    hashed_password: str | None = None,
    is_active: bool | None = None,
    role: str | None = None,
) -> User | None:
    table = database.table("users")
    record = table.get(Query().id == user_id)
    if record is None:
        return None

    user = User.from_document(record)
    updates = {
        field: value
        for field, value in {
            "email": email,
            "hashed_password": hashed_password,
            "is_active": is_active,
            "role": role,
        }.items()
        if value is not None
    }
    updated_user = replace(user, **updates)
    table.update(updated_user.to_document(), doc_ids=[record.doc_id])
    return updated_user


def delete_user(database: TinyDB, user_id: str) -> bool:
    table = database.table("users")
    record = table.get(Query().id == user_id)
    if record is None:
        return False
    delete_profile_by_user_id(database, user_id)
    table.remove(doc_ids=[record.doc_id])
    return True