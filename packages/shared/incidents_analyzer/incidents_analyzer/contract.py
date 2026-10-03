"""Domain rules shared with the TypeScript side, loaded from
``packages/shared/incidents/contract.json``.

The JSON file is the single source of truth: this module only exposes it as
Python constants, so the CLI script, the API and the backoffice cannot drift
apart. It is read from the repository tree, so the package must be installed
in editable mode (as ``services/api`` and ``scripts/analyze.py`` do).

Two status vocabularies coexist on purpose: ``CSV_STATUSES`` (OPEN / CLOSED /
DISCARDED) is what the helpdesk exports and what the CSV analysis validates;
``STATUSES`` (open / in_progress / resolved / discarded) is the lifecycle of
the incident manager. ``CSV_STATUS_MAP`` translates the first into the second, and
``CSV_CATEGORY_MAP`` the CSV categories (TECHNICAL, BILLING…) into the manager's
(technical_failure, process_error…).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "incidents" / "contract.json"

try:
    _contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
except FileNotFoundError as exc:  # pragma: no cover - only on a non-editable install
    raise RuntimeError(
        f"Shared incident contract not found at {CONTRACT_PATH}. "
        "Install incidents_analyzer in editable mode from packages/shared/incidents_analyzer."
    ) from exc

# Incident manager categories (exact values the manager accepts).
CATEGORIES: tuple[str, ...] = tuple(_contract["categories"])

# CSV export categories: what the CSV analysis validates. (`VALID_CATEGORIES` keeps the name the analysis uses.)
CSV_CATEGORIES: tuple[str, ...] = tuple(_contract["csvCategories"])
VALID_CATEGORIES = CSV_CATEGORIES

# CSV export vocabulary (CSV analysis).
CSV_STATUSES: tuple[str, ...] = tuple(_contract["csvStatuses"])
VALID_STATUSES = CSV_STATUSES  # name used by the CSV analysis
CSV_STATUS_MAP: dict[str, str] = dict(_contract["csvStatusMap"])
CSV_CATEGORY_MAP: dict[str, str] = dict(_contract["csvCategoryMap"])

# Incident manager vocabulary.
STATUSES: tuple[str, ...] = tuple(_contract["statuses"])
ORIGINS: tuple[str, ...] = tuple(_contract["origins"])
BRANCHES: tuple[str, ...] = tuple(branch["value"] for branch in _contract["branches"])
BRANCH_LABELS: dict[str, str] = {branch["value"]: branch["label"] for branch in _contract["branches"]}
DEFAULT_BRANCH: str = _contract["defaultBranch"]
TRANSITIONS: dict[str, tuple[str, ...]] = {
    status: tuple(targets) for status, targets in _contract["transitions"].items()
}
EDITABLE_STATUSES: tuple[str, ...] = tuple(_contract["editableStatuses"])

ID_PATTERN = re.compile(_contract["patterns"]["id"])
AGENT_ID_PATTERN = re.compile(_contract["patterns"]["agentId"])

_limits = _contract["limits"]
TITLE_MIN: int = _limits["titleMin"]
TITLE_MAX: int = _limits["titleMax"]
CLIENT_COMPANY_MAX: int = _limits["clientCompanyMax"]
DESCRIPTION_MIN: int = _limits["descriptionMin"]
DESCRIPTION_MAX: int = _limits["descriptionMax"]
DISCARD_REASON_MIN: int = _limits["discardReasonMin"]
DISCARD_REASON_MAX: int = _limits["discardReasonMax"]
SCORE_MIN: int = _limits["scoreMin"]
SCORE_MAX: int = _limits["scoreMax"]
