"""Pure rules of the incident domain that more than one consumer needs.

Standard library only (like the rest of this package): the API, the scripts
and the tests use these, and none of them has to own a copy. The table of
transitions and the default branch come from ``contract.py``.
"""

from __future__ import annotations

from .contract import DEFAULT_BRANCH, EDITABLE_STATUSES, TRANSITIONS


def allowed_transitions(status: str) -> list[str]:
    """The statuses an incident in ``status`` may move to (empty for a final status)."""
    return list(TRANSITIONS.get(str(status), ()))


def is_editable(status: str) -> bool:
    """Whether the content of an incident in ``status`` can still be edited."""
    return str(status) in EDITABLE_STATUSES


def normalize_branch(branch: str, origin: str | None) -> str:
    """``Central`` and ``central`` are the same place; and an incident that comes from a
    branch has to say which one (``central`` is for "does not apply").

    Raises ``ValueError`` with a message meant for people.
    """
    if branch.casefold() == DEFAULT_BRANCH:
        branch = DEFAULT_BRANCH
    if origin == "branch" and branch == DEFAULT_BRANCH:
        raise ValueError(
            f"An incident that comes from a branch must name it ('{DEFAULT_BRANCH}' is for when it does not apply)"
        )
    return branch
