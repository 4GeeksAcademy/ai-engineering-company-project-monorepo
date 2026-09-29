"""Business logic for the profiles domain (display name + contact data).

Stored in its own TinyDB file (``profiles/db.json``), one document per user:
``{user_uuid, display_name, contact_email, phone}``. The one-to-one relation
with User is kept by construction:

* ``users.service`` creates the profile with the user and deletes it with the
  user, so there is no create/delete endpoint here;
* ``ensure_profile`` is get-or-create keyed on ``user_uuid``, so a second call
  can never produce a second profile, and it self-heals users that predate
  this module or whose profile insert failed.
"""

from __future__ import annotations

from uuid import UUID

from tinydb import Query, TinyDB

from core.config import get_profiles_db_path

from .schemas import DISPLAY_NAME_MAX, ProfileOut, ProfileUpdate

_db: TinyDB | None = None


class ProfileNotFoundError(Exception):
    def __init__(self, user_uuid: UUID):
        self.user_uuid = user_uuid
        super().__init__(f"Profile of user {user_uuid} not found")


def get_db() -> TinyDB:
    global _db
    if _db is None:
        _db = TinyDB(get_profiles_db_path())
    return _db


def _get_doc(user_uuid: UUID | str):
    return get_db().get(Query().user_uuid == str(user_uuid))


def list_profiles() -> list[ProfileOut]:
    return [_to_out(doc) for doc in get_db().all()]


def get_profile(user_uuid: UUID) -> ProfileOut:
    doc = _get_doc(user_uuid)
    if doc is None:
        raise ProfileNotFoundError(user_uuid)
    return _to_out(doc)


def ensure_profile(user_uuid: UUID | str, email: str) -> ProfileOut:
    """The user's profile, created with a default display name if missing.

    The default is the local part of the login email (``ana@x.com`` -> ``ana``);
    the user then edits it, since the display name is not part of User.
    """
    doc = _get_doc(user_uuid)
    if doc is None:
        doc = {
            "user_uuid": str(user_uuid),
            "display_name": email.split("@", 1)[0][:DISPLAY_NAME_MAX] or "user",
            "contact_email": None,
            "phone": None,
        }
        get_db().upsert(doc, Query().user_uuid == str(user_uuid))
    return _to_out(doc)


def update_profile(user_uuid: UUID, payload: ProfileUpdate) -> ProfileOut:
    doc = _get_doc(user_uuid)
    if doc is None:
        raise ProfileNotFoundError(user_uuid)
    changes = payload.model_dump(exclude_unset=True)
    if changes:
        get_db().update(changes, doc_ids=[doc.doc_id])
    return get_profile(user_uuid)


def delete_profile(user_uuid: UUID | str) -> None:
    """Remove the user's profile. Idempotent; called when the user is deleted."""
    get_db().remove(Query().user_uuid == str(user_uuid))


def profile_owner_uuids() -> set[str]:
    return {doc["user_uuid"] for doc in get_db().all()}


def _to_out(doc) -> ProfileOut:
    return ProfileOut(
        user_uuid=doc["user_uuid"],
        display_name=doc["display_name"],
        contact_email=doc.get("contact_email"),
        phone=doc.get("phone"),
    )
