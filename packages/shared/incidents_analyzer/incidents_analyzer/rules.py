"""Pure rules of the incident domain that more than one consumer needs.

Standard library only (like the rest of this package): the API, the scripts
and the tests use these, and none of them has to own a copy. The tables
(transitions, branches) come from ``contract.py``.
"""

from __future__ import annotations

from .contract import BRANCH_LABELS, BRANCHES, EDITABLE_STATUSES, TRANSITIONS


def allowed_transitions(status: str) -> list[str]:
    """The statuses an incident in ``status`` may move to (empty for a final status)."""
    return list(TRANSITIONS.get(str(status), ()))


def is_editable(status: str) -> bool:
    """Whether the content of an incident in ``status`` can still be edited."""
    return str(status) in EDITABLE_STATUSES


def branch_value(text: str) -> str | None:
    """The branch a free text refers to, by its value (``miami_office``) or its display name
    (``Miami Office``), ignoring case and surrounding spaces; ``None`` if it is not one of Nexova's."""
    wanted = " ".join(str(text).split()).casefold()
    for value in BRANCHES:
        if wanted in (value.casefold(), BRANCH_LABELS[value].casefold()):
            return value
    return None
