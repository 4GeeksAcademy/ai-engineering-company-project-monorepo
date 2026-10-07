from __future__ import annotations
from dataclasses import dataclass
from constants import MIN_DESCRIPTION_LENGTH, VALID_CATEGORIES, VALID_STATUSES

@dataclass(frozen=True)
class ValidationResult:
    is_valid: bool
    reasons: list[str]

def _parse_score(raw_value: str) -> int | None:
    value = (raw_value or "").strip()
    if not value: return None
    try: score = int(value)
    except ValueError: return None
    return score if 1 <= score <= 5 else None

def validate_record(record: dict[str, str]) -> ValidationResult:
    reasons: list[str] = []
    if not (record.get("incident_id") or "").strip(): reasons.append("missing incident_id")
    if not (record.get("date") or "").strip(): reasons.append("missing date")
    if not (record.get("location_id") or "").strip(): reasons.append("missing location_id")
    if (record.get("category") or "").strip().upper() not in VALID_CATEGORIES: reasons.append("invalid category")
    if len((record.get("description") or "").strip()) < MIN_DESCRIPTION_LENGTH: reasons.append("description too short")
    status = (record.get("status") or "").strip().upper()
    if status not in VALID_STATUSES: reasons.append("invalid status")
    if status == "CERRADO" and _parse_score(record.get("satisfaction_score", "")) is None:
        reasons.append("closed incident missing satisfaction_score")
    return ValidationResult(is_valid=not reasons, reasons=reasons)
