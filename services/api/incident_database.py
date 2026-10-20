
from typing import Any, Optional

from services.api import database


def incidents_table():
    return database.get_db().table("incidents")


def _with_id(doc) -> dict[str, Any]:
    return {"id": doc.doc_id, **dict(doc)}


def create_incident(
    data: dict[str, Any],
    created_at: Optional[str] = None,
) -> dict[str, Any]:
    with database._lock:
        timestamp = created_at or database.now_iso()
        record = {
            **data,
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        record.pop("id", None)
        doc_id = incidents_table().insert(record)
        return {"id": doc_id, **record}


def list_incidents() -> list[dict[str, Any]]:
    with database._lock:
        return [
            _with_id(doc)
            for doc in incidents_table().all()
        ]


def get_incident(
    incident_id: int,
) -> Optional[dict[str, Any]]:
    with database._lock:
        doc = incidents_table().get(doc_id=incident_id)
        return _with_id(doc) if doc else None


def update_incident_status(
    incident_id: int,
    new_status: str,
) -> Optional[dict[str, Any]]:
    with database._lock:
        table = incidents_table()

        if not table.contains(doc_id=incident_id):
            return None

        table.update(
            {
                "status": new_status,
                "updated_at": database.now_iso(),
            },
            doc_ids=[incident_id],
        )

        return _with_id(table.get(doc_id=incident_id))


def get_incidents_summary() -> dict[str, Any]:
    incidents = list_incidents()

    summary = {
        "total": len(incidents),
        "by_status": {},
        "by_category": {},
        "by_origin": {},
        "by_branch": {},
    }

    for incident in incidents:
        for field, key in [
            ("status", "by_status"),
            ("category", "by_category"),
            ("origin", "by_origin"),
            ("branch", "by_branch"),
        ]:
            value = incident[field]
            counts = summary[key]
            counts[value] = counts.get(value, 0) + 1

    return summary
