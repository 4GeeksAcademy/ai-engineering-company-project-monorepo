"""Incident service layer backed by TinyDB."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone

from tinydb import Query
from tinydb.table import Document

from src.database import get_incidents_table
from src.models.incident import (
    Incident,
    IncidentBranch,
    IncidentCategory,
    IncidentOrigin,
    IncidentStatus,
)

ALLOWED_STATUS_TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.OPEN: {IncidentStatus.IN_PROGRESS, IncidentStatus.DISCARDED},
    IncidentStatus.IN_PROGRESS: {IncidentStatus.RESOLVED, IncidentStatus.DISCARDED},
    IncidentStatus.RESOLVED: set(),
    IncidentStatus.DISCARDED: set(),
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_incident(document: Document) -> Incident:
    payload = dict(document)
    return Incident.model_validate(payload)


def create_incident(payload: dict[str, object]) -> Incident:
    incidents_table = get_incidents_table()
    incident = Incident(**payload)

    doc_id = incidents_table.insert(incident.model_dump(mode="json"))
    document = incidents_table.get(doc_id=doc_id)
    if document is None:
        raise RuntimeError("No se pudo crear la incidencia")

    return _to_incident(document)


def get_incident_by_id(incident_id: str) -> Incident | None:
    incidents_table = get_incidents_table()
    query = Query()
    document = incidents_table.get(query.id == incident_id)
    if document is None:
        return None
    return _to_incident(document)


def list_incidents(
    *,
    status: IncidentStatus | None = None,
    origin: IncidentOrigin | None = None,
    branch: IncidentBranch | None = None,
    category: IncidentCategory | None = None,
) -> list[Incident]:
    incidents_table = get_incidents_table()
    documents = incidents_table.all()

    if status is not None:
        documents = [document for document in documents if document.get("status") == status.value]

    if origin is not None:
        documents = [document for document in documents if document.get("origin") == origin.value]

    if branch is not None:
        documents = [document for document in documents if document.get("branch") == branch.value]

    if category is not None:
        documents = [document for document in documents if document.get("category") == category.value]

    return [_to_incident(document) for document in documents]


def can_transition_status(current: IncidentStatus, target: IncidentStatus) -> bool:
    if current == target:
        return True
    return target in ALLOWED_STATUS_TRANSITIONS[current]


def update_incident_status(incident_id: str, status: IncidentStatus) -> Incident | None:
    incidents_table = get_incidents_table()
    query = Query()
    document = incidents_table.get(query.id == incident_id)
    if document is None:
        return None

    incidents_table.update(
        {
            "status": status.value,
            "updated_at": _now_utc().isoformat(),
        },
        doc_ids=[document.doc_id],
    )

    updated_document = incidents_table.get(doc_id=document.doc_id)
    if updated_document is None:
        return None
    return _to_incident(updated_document)


def incidents_summary() -> dict[str, object]:
    incidents_table = get_incidents_table()
    documents = incidents_table.all()

    status_counter: Counter[str] = Counter({status.value: 0 for status in IncidentStatus})
    category_counter: Counter[str] = Counter({category.value: 0 for category in IncidentCategory})
    origin_counter: Counter[str] = Counter({origin.value: 0 for origin in IncidentOrigin})
    branch_counter: Counter[str] = Counter({branch.value: 0 for branch in IncidentBranch})

    for document in documents:
        status_value = str(document.get("status", ""))
        category_value = str(document.get("category", ""))
        origin_value = str(document.get("origin", ""))
        branch_value = str(document.get("branch", ""))

        if status_value in status_counter:
            status_counter[status_value] += 1

        if category_value in category_counter:
            category_counter[category_value] += 1

        if origin_value in origin_counter:
            origin_counter[origin_value] += 1

        if branch_value in branch_counter:
            branch_counter[branch_value] += 1

    return {
        "total": len(documents),
        "by_status": dict(status_counter),
        "by_category": dict(category_counter),
        "by_origin": dict(origin_counter),
        "by_branch": dict(branch_counter),
    }