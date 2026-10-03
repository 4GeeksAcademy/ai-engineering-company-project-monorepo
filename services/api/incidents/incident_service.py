"""Business logic for the managed incidents: create, edit, move through the
lifecycle, list with filters and summarise."""

from __future__ import annotations

import logging
import math
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Literal

from pydantic import ValidationError

from incidents_analyzer.contract import DEFAULT_BRANCH

from . import incident_lifecycle as lifecycle
from . import incident_store as store
from .incident_lifecycle import FieldProblemError, IncidentLockedError, TransitionNotAllowedError
from .incident_schemas import (
    REQUIRED_FIELDS,
    CountItem,
    IncidentCategory,
    IncidentCreate,
    IncidentFacets,
    IncidentListItem,
    IncidentOrigin,
    IncidentOut,
    IncidentPage,
    IncidentRecord,
    IncidentStatus,
    IncidentSummary,
    IncidentUpdate,
    StatusChange,
    mask_email,
)

__all__ = [
    "FieldProblemError",
    "IncidentFilters",
    "IncidentLockedError",
    "IncidentNotFoundError",
    "InvalidIncidentUpdateError",
    "TransitionNotAllowedError",
]

logger = logging.getLogger(__name__)

SortField = Literal["created_at", "id", "updated_at"]
SortOrder = Literal["asc", "desc"]
TOP_N = 5
_CONTENT_FIELDS = (*REQUIRED_FIELDS, "client_company", "agent_id", "customer_email")


class IncidentNotFoundError(Exception):
    def __init__(self, incident_id: str):
        self.incident_id = incident_id
        super().__init__(f"Incident {incident_id} not found")


class InvalidIncidentUpdateError(Exception):
    """The update would leave the incident in an invalid state."""

    def __init__(self, errors: list):
        self.errors = errors
        super().__init__("Update would produce an invalid incident")


@dataclass(frozen=True)
class IncidentFilters:
    statuses: tuple[str, ...] = ()
    categories: tuple[str, ...] = ()
    origins: tuple[str, ...] = ()
    branch: str | None = None  # case-insensitive, exact
    agent_id: str | None = None
    client_company: str | None = None  # case-insensitive "contains"
    q: str | None = None  # case-insensitive "contains" over id, title, description, client and branch
    date_from: date | None = None  # on the day the incident was created
    date_to: date | None = None

    def matches(self, doc: dict) -> bool:
        if self.statuses and doc["status"] not in self.statuses:
            return False
        if self.categories and doc["category"] not in self.categories:
            return False
        if self.origins and doc["origin"] not in self.origins:
            return False
        if self.branch and doc["branch"].casefold() != self.branch.casefold():
            return False
        if self.agent_id and doc["agent_id"] != self.agent_id:
            return False
        if self.client_company and self.client_company.casefold() not in (doc["client_company"] or "").casefold():
            return False
        created_day = doc["created_at"][:10]
        if self.date_from and created_day < self.date_from.isoformat():
            return False
        if self.date_to and created_day > self.date_to.isoformat():
            return False
        if self.q:
            # The customer's email is deliberately not searchable.
            haystack = " ".join(
                (doc["id"], doc["title"], doc["description"], doc["client_company"] or "", doc["branch"])
            ).casefold()
            if self.q.casefold() not in haystack:
                return False
        return True


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _view(doc: dict) -> dict:
    return {
        **{key: doc[key] for key in ("id", "title", "description", "category", "status", "origin", "branch")},
        "client_company": doc.get("client_company"),
        "agent_id": doc.get("agent_id"),
        "satisfaction_score": doc.get("satisfaction_score"),
        "discard_reason": doc.get("discard_reason"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
        "allowed_transitions": lifecycle.allowed_transitions(doc["status"]),
        "editable": lifecycle.is_editable(doc["status"]),
    }


def _to_out(doc: dict) -> IncidentOut:
    return IncidentOut(**_view(doc), customer_email=doc.get("customer_email"), history=doc["history"])


def _to_list_item(doc: dict) -> IncidentListItem:
    email = doc.get("customer_email")
    return IncidentListItem(**_view(doc), customer_email_masked=mask_email(email) if email else None)


def _is_readable(doc: dict) -> bool:
    """A stored document this version can read. Anything else (e.g. left by an older data model)
    is skipped and logged instead of breaking every read."""
    try:
        IncidentRecord.model_validate(doc)
    except ValidationError:
        logger.warning("Skipping unreadable incident document %r", doc.get("id", "(no id)"))
        return False
    return True


def _readable_docs() -> list[dict]:
    return [doc for doc in store.all_docs() if _is_readable(doc)]


def _require(incident_id: str) -> dict:
    doc = store.get(incident_id)
    if doc is None or not _is_readable(doc):
        raise IncidentNotFoundError(incident_id)
    return doc


def get_incident(incident_id: str) -> IncidentOut:
    return _to_out(_require(incident_id))


def create_incident(payload: IncidentCreate, *, actor: str) -> IncidentOut:
    now = _now()
    with store.lock:
        record = IncidentRecord(
            id=store.next_incident_id(),
            **payload.model_dump(),
            status=IncidentStatus.open,
            created_at=now,
            updated_at=now,
            history=[{"at": now, "kind": "created", "actor": actor, "to_status": IncidentStatus.open}],
        )
        doc = record.model_dump(mode="json")
        store.insert(doc)
    return _to_out(doc)


def update_incident(incident_id: str, payload: IncidentUpdate, *, actor: str) -> IncidentOut:
    with store.lock:
        doc = _require(incident_id)
        lifecycle.ensure_editable(doc)

        changes = payload.model_dump(mode="json", exclude_unset=True)
        changed = sorted(name for name, value in changes.items() if doc.get(name) != value)
        if not changed:
            return _to_out(doc)

        now = _now()
        entry = {"at": now.isoformat(), "kind": "edited", "actor": actor, "fields": changed}
        try:
            # Re-validate the merged record so cross-field rules (origin vs. branch) hold
            # even when only one of the two fields is being changed.
            record = IncidentRecord(
                **{**doc, **changes, "updated_at": now.isoformat(), "history": [*doc["history"], entry]}
            )
        except ValidationError as exc:
            raise InvalidIncidentUpdateError(exc.errors(include_url=False, include_input=False)) from exc
        new_doc = record.model_dump(mode="json")
        store.replace(incident_id, new_doc)
    return _to_out(new_doc)


def change_status(incident_id: str, change: StatusChange, *, actor: str) -> IncidentOut:
    with store.lock:
        doc = _require(incident_id)
        new_doc = lifecycle.apply_status_change(doc, change, actor=actor, now=_now())
        new_doc = IncidentRecord(**new_doc).model_dump(mode="json")
        store.replace(incident_id, new_doc)
    return _to_out(new_doc)


def _filtered(filters: IncidentFilters) -> list[dict]:
    return [doc for doc in _readable_docs() if filters.matches(doc)]


def list_incidents(
    filters: IncidentFilters,
    *,
    sort: SortField = "created_at",
    order: SortOrder = "desc",
    page: int = 1,
    page_size: int = 20,
) -> IncidentPage:
    docs = _filtered(filters)
    # id breaks ties so pagination is stable.
    docs.sort(key=lambda d: (d[sort], d["id"]), reverse=order == "desc")
    total = len(docs)
    start = (page - 1) * page_size
    return IncidentPage(
        items=[_to_list_item(doc) for doc in docs[start : start + page_size]],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size),
    )


def _percentages(counts: dict[str, int], total: int) -> dict[str, float]:
    return {key: round(value / total * 100, 1) if total else 0.0 for key, value in counts.items()}


def _top(docs: list[dict], field: str) -> list[CountItem]:
    counts = Counter(doc[field] for doc in docs if doc.get(field))
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:TOP_N]
    return [CountItem(name=name, count=count) for name, count in ranked]


def summarize(filters: IncidentFilters) -> IncidentSummary:
    docs = _filtered(filters)
    total = len(docs)
    status_counts = {s.value: 0 for s in IncidentStatus} | Counter(d["status"] for d in docs)
    category_counts = {c.value: 0 for c in IncidentCategory} | Counter(d["category"] for d in docs)
    origin_counts = {o.value: 0 for o in IncidentOrigin} | Counter(d["origin"] for d in docs)
    branch_counts = {DEFAULT_BRANCH: 0} | dict(sorted(Counter(d["branch"] for d in docs).items(), key=lambda item: (-item[1], item[0])))
    active = Counter(d["category"] for d in docs if d["status"] in (IncidentStatus.open, IncidentStatus.in_progress))
    scores = [d["satisfaction_score"] for d in docs if d.get("satisfaction_score") is not None]
    distribution = Counter(scores)
    return IncidentSummary(
        total=total,
        status_counts=status_counts,
        status_percentages=_percentages(status_counts, total),
        category_counts=category_counts,
        category_percentages=_percentages(category_counts, total),
        origin_counts=origin_counts,
        branch_counts=branch_counts,
        branch_percentages=_percentages(branch_counts, total),
        active_by_category={c.value: active.get(c.value, 0) for c in IncidentCategory},
        satisfaction_average=round(sum(scores) / len(scores), 2) if scores else None,
        satisfaction_scored=len(scores),
        satisfaction_distribution={str(n): distribution.get(n, 0) for n in range(1, 6)},
        top_branches=_top(docs, "branch"),
        top_clients=_top(docs, "client_company"),
    )


def facets() -> IncidentFacets:
    docs = _readable_docs()

    def distinct(field: str) -> list[str]:
        return sorted({doc[field] for doc in docs if doc.get(field)}, key=str.casefold)

    return IncidentFacets(branches=distinct("branch"), clients=distinct("client_company"), agents=distinct("agent_id"))
