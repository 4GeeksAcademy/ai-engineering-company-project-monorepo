"""Record validation for HealthCore incident CSV rows.

Never include patient_id (or other PHI) in returned messages — only rule keys.
"""

from __future__ import annotations

import re
from typing import Any

from .constants import (
    CLINIC_COUNTRY,
    PATIENT_ID_PATTERN,
    VALID_CATEGORIES,
    VALID_CLINIC_IDS,
)

_PATIENT_ID_RE = re.compile(PATIENT_ID_PATTERN)


def _cell(row: dict[str, Any], field: str) -> str:
    raw = row.get(field, "")
    if raw is None:
        return ""
    return str(raw).strip()


def classify_invalid_rules(row: dict[str, Any]) -> list[str]:
    """Return ordered list of invalid-rule keys for one CSV row.

    A record is invalid if any rule triggers. Multiple rules may apply; each is
    counted when reporting problem-type totals. PHI values are never returned.
    """
    rules: list[str] = []

    clinic_id = _cell(row, "clinic_id")
    country = _cell(row, "country")
    category = _cell(row, "category")
    description = _cell(row, "description")
    status = _cell(row, "status")
    patient_id = _cell(row, "patient_id")
    score_raw = _cell(row, "satisfaction_score")

    if not clinic_id or clinic_id not in VALID_CLINIC_IDS:
        rules.append("invalid_clinic_id")
    elif country and clinic_id in CLINIC_COUNTRY and country != CLINIC_COUNTRY[clinic_id]:
        rules.append("country_clinic_mismatch")

    if not category or category not in VALID_CATEGORIES:
        rules.append("invalid_category")

    if len(description) < 5:
        rules.append("empty_description")

    if not patient_id or not _PATIENT_ID_RE.fullmatch(patient_id):
        rules.append("missing_patient_id")

    if status == "CLOSED" and score_raw == "":
        rules.append("closed_without_score")

    if score_raw != "":
        try:
            score = int(score_raw)
        except ValueError:
            rules.append("score_out_of_range")
        else:
            if score < 1 or score > 5:
                rules.append("score_out_of_range")

    return rules
