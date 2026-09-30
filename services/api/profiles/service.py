"""Business logic for the profiles domain (name + contact data).

Stored in its own TinyDB file (``profiles/db.json``), one document per user
(see ``Profile`` in ``profiles.schemas``): ``{id, user_id, name, contact_email,
phone, address}``. The one-to-one relation with User is kept by construction:

* ``users.service`` creates the profile with the user and deletes it with the
  user, so there is no create/delete endpoint here;
* ``ensure_profile`` is get-or-create keyed on ``user_id``, so a second call
  can never produce a second profile, and it self-heals users whose profile
  insert failed;
* ``migrate_legacy_profiles`` upgrades documents written before this shape.
"""

from __future__ import annotations

import logging
from uuid import UUID, uuid4

from tinydb import Query, TinyDB

from core.config import get_profiles_db_path

from .fields import NAME_MAX
from .schemas import Profile, ProfileUpdate

logger = logging.getLogger(__name__)

_db: TinyDB | None = None


class ProfileNotFoundError(Exception):
    def __init__(self, user_id: UUID | str):
        self.user_id = user_id
        super().__init__(f"Profile of user {user_id} not found")


def get_db() -> TinyDB:
    global _db
    if _db is None:
        _db = TinyDB(get_profiles_db_path())
    return _db


def _get_doc(user_id: UUID | str):
    return get_db().get(Query().user_id == str(user_id))


def list_profiles() -> list[Profile]:
    return [_to_out(doc) for doc in get_db().all()]


def get_profile(user_id: UUID | str) -> Profile:
    doc = _get_doc(user_id)
    if doc is None:
        raise ProfileNotFoundError(user_id)
    return _to_out(doc)


def ensure_profile(
    user_id: UUID | str,
    email: str,
    *,
    name: str | None = None,
    phone: str | None = None,
    address: str | None = None,
) -> Profile:
    """The user's profile, created if missing (the optional arguments only apply then).

    Without a ``name`` the default is the local part of the login email
    (``ana@x.com`` -> ``ana``); the user then edits it, since it is not part of User.
    """
    doc = _get_doc(user_id)
    if doc is None:
        profile = Profile(
            user_id=user_id,
            name=name or email.split("@", 1)[0][:NAME_MAX] or "user",
            phone=phone,
            address=address,
        )
        doc = profile.model_dump(mode="json")
        get_db().upsert(doc, Query().user_id == str(user_id))
    return _to_out(doc)


def update_profile(user_id: UUID | str, payload: ProfileUpdate) -> Profile:
    doc = _get_doc(user_id)
    if doc is None:
        raise ProfileNotFoundError(user_id)
    changes = payload.model_dump(exclude_unset=True)
    if changes:
        get_db().update(changes, doc_ids=[doc.doc_id])
    return get_profile(user_id)


def delete_profile(user_id: UUID | str) -> None:
    """Remove the user's profile. Idempotent; called when the user is deleted."""
    get_db().remove(Query().user_id == str(user_id))


def profile_user_ids() -> set[str]:
    return {doc["user_id"] for doc in get_db().all()}


def migrate_legacy_profiles() -> None:
    """Upgrade documents written before ``{id, user_id, name, ...}``
    (``{user_uuid, display_name, contact_email, phone[, address]}``), at startup. Idempotent."""
    legacy = [doc for doc in get_db().all() if "user_id" not in doc]
    if not legacy:
        return

    def upgrade(doc):
        doc["id"] = str(uuid4())
        doc["user_id"] = doc.pop("user_uuid")
        doc["name"] = doc.pop("display_name")
        doc.setdefault("address", None)

    for doc in legacy:
        get_db().update(upgrade, doc_ids=[doc.doc_id])
    logger.info("Migrated %d legacy profile document(s) to the Profile model", len(legacy))


def _to_out(doc) -> Profile:
    return Profile.model_validate(doc)
