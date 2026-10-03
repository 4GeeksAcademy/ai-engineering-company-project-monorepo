"""Data access for the managed incidents: a TinyDB file, like the other domains.

Documents are the JSON dump of ``IncidentRecord`` and are keyed by ``id``.
A process-wide lock serialises writes so two requests cannot be given the same
incident id. It is a single-process guarantee (as is TinyDB itself); a second API
worker would need a real database.
"""

from __future__ import annotations

import re
import threading

from tinydb import Query, TinyDB

from core.config import get_incidents_db_path

_ID = re.compile(r"NXV-(\d{6})")
_db: TinyDB | None = None
lock = threading.RLock()


def get_db() -> TinyDB:
    global _db
    if _db is None:
        path = get_incidents_db_path()
        # A file with nothing but whitespace is an empty database (TinyDB only accepts a 0-byte one).
        if path.is_file() and not path.read_text(encoding="utf-8", errors="replace").strip():
            path.write_text("", encoding="utf-8")
        _db = TinyDB(path)
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
        numbers = [int(m.group(1)) for doc in get_db().all() if (m := _ID.fullmatch(str(doc.get("id", ""))))]
        return f"NXV-{max(numbers, default=0) + 1:06d}"


def next_incident_ids(count: int) -> list[str]:
    """The next ``count`` free ids, in order. Call and insert under ``lock``."""
    with lock:
        first = int(next_incident_id().split("-")[1])
        return [f"NXV-{first + i:06d}" for i in range(count)]


def truncate() -> None:
    """Remove every incident and the record of what the seed loaded."""
    with lock:
        get_db().drop_tables()


# What the seed already loaded, by the key of the source row (the CSV ``ticket_id``). It lives in its own table:
# the incident itself does not store it, but running the seed twice must not duplicate anything.
_IMPORTS = "seed_imports"


def imported_keys() -> set[str]:
    with lock:
        return {doc["key"] for doc in get_db().table(_IMPORTS).all()}


def record_imports(entries: list[tuple[str, str]]) -> None:
    """Remember ``(source key, incident id)`` pairs."""
    with lock:
        get_db().table(_IMPORTS).insert_multiple({"key": key, "incident_id": incident_id} for key, incident_id in entries)


def insert_many(docs: list[dict]) -> None:
    with lock:
        get_db().insert_multiple(docs)
