"""Incident lifecycle rules. Pure functions over stored documents: no I/O, no HTTP.

    open ──► in_progress ──► resolved      (satisfaction_score 1-5 is optional)
      │          │
      └──────────┴────────► discarded      (discard_reason is optional)

``resolved`` and ``discarded`` are final: nothing leaves them. Any other move
is refused; in particular an incident cannot be resolved without having been
worked on (open -> resolved), nor go back to open. Content can only be edited
while open or in progress. The table comes from the shared contract.
"""

from __future__ import annotations

from datetime import datetime

from incidents_analyzer.contract import EDITABLE_STATUSES, TRANSITIONS

from .incident_schemas import IncidentStatus, StatusChange


class LifecycleError(Exception):
    """Base class for refused lifecycle operations."""


class TransitionNotAllowedError(LifecycleError):
    def __init__(self, incident_id: str, current: str, target: str):
        self.allowed = allowed_transitions(current)
        if not self.allowed:
            message = f"Incident {incident_id} is {current}, a final status: it cannot change to {target}."
        elif current == target:
            message = f"Incident {incident_id} is already {current}."
        else:
            message = f"Incident {incident_id} cannot go from {current} to {target}. Allowed: {', '.join(self.allowed)}."
        super().__init__(message)


class IncidentLockedError(LifecycleError):
    def __init__(self, incident_id: str, current: str):
        super().__init__(
            f"Incident {incident_id} is {current}, a final status: it can no longer be edited."
        )


class FieldProblemError(LifecycleError):
    """A status change is missing (or has an extra) field: reported against that field (400)."""

    def __init__(self, field: str, message: str):
        self.field = field
        super().__init__(message)


def allowed_transitions(status: str) -> list[str]:
    return list(TRANSITIONS.get(str(status), ()))


def is_editable(status: str) -> bool:
    return str(status) in EDITABLE_STATUSES


def ensure_editable(doc: dict) -> None:
    if not is_editable(doc["status"]):
        raise IncidentLockedError(doc["id"], doc["status"])


def apply_status_change(doc: dict, change: StatusChange, *, actor: str, now: datetime) -> dict:
    """Return the incident document after moving it to ``change.status``.

    Raises ``TransitionNotAllowedError`` (409) or ``FieldProblemError`` (400).
    The input is not modified.
    """
    current, target = doc["status"], change.status.value
    if target not in allowed_transitions(current):
        raise TransitionNotAllowedError(doc["id"], current, target)

    score, reason = change.satisfaction_score, change.discard_reason
    if score is not None and target != IncidentStatus.resolved:
        raise FieldProblemError("satisfaction_score", "A satisfaction score only applies when resolving")
    if reason is not None and target != IncidentStatus.discarded:
        raise FieldProblemError("discard_reason", "A discard reason only applies when discarding")

    entry = {
        "at": now.isoformat(),
        "kind": "status_changed",
        "actor": actor,
        "from_status": current,
        "to_status": target,
        "fields": [],
        "note": reason,
    }
    return {
        **doc,
        "status": target,
        "satisfaction_score": score,
        "discard_reason": reason,
        "updated_at": now.isoformat(),
        "history": [*doc["history"], entry],
    }
