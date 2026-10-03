"""Data access for the managed incidents: a TinyDB file, like the other domains.

Documents are the JSON dump of ``IncidentRecord`` and are keyed by ``id``.
A process-wide lock serialises writes so two requests cannot be given the same
incident id. It is a single-process guarantee (as is TinyDB itself); a second API
worker would need a real database.
"""

from __future__ import annotations

import threading

from tinydb import Query, TinyDB

from core.config import get_incidents_db_path

_db: TinyDB | None = None
lock = threading.RLock()


def get_db() -> TinyDB:
    global _db
    if _db is None:
        _db = TinyDB(get_incidents_db_path())
    return _db


def all_docs() -> list[dict]:
    with lock:
        return [dict(doc) for doc in get_db().all()]


def get(incident_id: str) -> dict | None:
    with lock:
        doc = get_db().get(Query().id == incident_id)
        return dict(doc) if doc is not None else None


def insert(doc: dict) -> None:
    with lock:
        get_db().insert(doc)


def replace(incident_id: str, doc: dict) -> None:
    with lock:
        # Every key is present in ``doc``, so TinyDB's merge-update is a full replacement.
        get_db().update(doc, Query().id == incident_id)


def next_incident_id() -> str:
    """``NXV-`` + the highest number in use + 1. Call and insert under ``lock``."""
    with lock:
        numbers = [int(doc["id"].split("-")[1]) for doc in get_db().all()]
        return f"NXV-{max(numbers, default=0) + 1:06d}"


def truncate() -> None:
    with lock:
        get_db().truncate()


def insert_many(docs: list[dict]) -> None:
    with lock:
        get_db().insert_multiple(docs)
