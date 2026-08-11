"""HealthCore incident contract from incidents-healthcore CONTEXT."""

from __future__ import annotations

CLINIC_COUNTRY: dict[str, str] = {
    "US-TX-01": "US",
    "US-TX-02": "US",
    "US-TX-03": "US",
    "US-FL-01": "US",
    "US-FL-02": "US",
    "US-FL-03": "US",
    "US-GA-01": "US",
    "US-GA-02": "US",
    "US-GA-03": "US",
    "UK-LON-01": "UK",
    "UK-LON-02": "UK",
    "UK-MAN-01": "UK",
}

VALID_CLINIC_IDS = frozenset(CLINIC_COUNTRY)

VALID_CATEGORIES = (
    "APPOINTMENT",
    "BILLING",
    "CLINICAL_CARE",
    "ACCESSIBILITY",
    "ADMINISTRATIVE",
)

VALID_STATUSES = frozenset({"OPEN", "CLOSED", "DISCARDED"})

# Rule keys used for counting and console labels (order matches CONTEXT output).
INVALID_RULE_ORDER = (
    "invalid_clinic_id",
    "country_clinic_mismatch",
    "invalid_category",
    "empty_description",
    "missing_patient_id",
    "closed_without_score",
    "score_out_of_range",
)

INVALID_RULE_LABELS = {
    "invalid_clinic_id": "Invalid or missing clinic_id",
    "country_clinic_mismatch": "Country/clinic mismatch",
    "invalid_category": "Invalid or missing category",
    "empty_description": "Empty description",
    "missing_patient_id": "Missing patient_id",
    "closed_without_score": "Closed case, no score",
    "score_out_of_range": "Satisfaction score out of range",
}

SATISFACTION_LABELS = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
}

PATIENT_ID_PATTERN = r"^PAT-\d{6}$"
INCIDENT_ID_PATTERN = r"^HC-\d{6}$"
