"""
validation.py — Brasaland · Incident input validation

Reusable validation functions shared by API, seed script and tests.
"""

from __future__ import annotations

from .constants import (
    CSV_STATUS_MAP,
    STATE_TRANSITIONS,
    VALID_BRANCHES,
    VALID_CATEGORIES,
    VALID_STATUSES_API,
)
from .errors import IncidentValidationError


def normalize_csv_status(raw: str) -> str:
    """Map a CSV status string (OPEN/CLOSED/DISCARDED) to API status."""
    upper = raw.strip().upper()
    if upper not in CSV_STATUS_MAP:
        raise IncidentValidationError(
            f"Invalid CSV status: {raw!r}. Expected one of: {', '.join(CSV_STATUS_MAP.keys())}",
            field="status",
        )
    return CSV_STATUS_MAP[upper]


def normalize_status(raw: str) -> str:
    """Normalize a status string to lowercase, validate it."""
    lower = raw.strip().lower()
    if lower not in VALID_STATUSES_API:
        raise IncidentValidationError(
            f"Invalid status: {raw!r}. Expected one of: {', '.join(VALID_STATUSES_API)}",
            field="status",
        )
    return lower


def validate_status_transition(current: str, target: str) -> None:
    """Validate that a status transition is allowed by the state machine."""
    allowed = STATE_TRANSITIONS.get(current, ())
    if target not in allowed:
        raise IncidentValidationError(
            f"Cannot transition from {current!r} to {target!r}. "
            f"Allowed transitions from {current!r}: {', '.join(allowed) if allowed else '(none — terminal state)'}",
            field="status",
        )


def validate_incident_input(
    *,
    title: str | None = None,
    description: str | None = None,
    category: str | None = None,
    branch: str | None = None,
) -> None:
    """Validate incident creation/update fields. Raises IncidentValidationError."""
    errors: list[tuple[str, str]] = []

    if title is not None:
        t = title.strip()
        if not t:
            errors.append(("title", "Title must not be empty."))
        elif len(t) < 3:
            errors.append(("title", "Title must be at least 3 characters."))
        elif len(t) > 200:
            errors.append(("title", "Title must be at most 200 characters."))

    if description is not None:
        d = description.strip()
        if not d:
            errors.append(("description", "Description must not be empty."))
        elif len(d) < 5:
            errors.append(("description", "Description must be at least 5 characters."))

    if category is not None:
        if category.strip().upper() not in VALID_CATEGORIES:
            errors.append(
                ("category", f"Invalid category: {category!r}. Expected one of: {', '.join(VALID_CATEGORIES)}")
            )

    if branch is not None:
        if branch.strip().upper() not in VALID_BRANCHES:
            errors.append(
                ("branch", f"Invalid branch: {branch!r}. Expected one of: {', '.join(VALID_BRANCHES)}")
            )

    if errors:
        # Combine all errors into a single message
        messages = [f"[{f}] {m}" for f, m in errors]
        raise IncidentValidationError("; ".join(messages))
