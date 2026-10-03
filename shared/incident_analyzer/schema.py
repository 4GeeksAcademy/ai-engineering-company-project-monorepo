"""Official HealthCore incident CSV contract (CONTEXT-healthcore)."""

from __future__ import annotations

import re

COMPANY = "HealthCore"
SAMPLE_CSV_FILENAME = "incidents-healthcore.csv"

REQUIRED_FIELDS = (
    "incident_id",
    "date",
    "clinic_id",
    "country",
    "category",
    "description",
    "status",
    "patient_id",
)

OPTIONAL_FIELDS = ("satisfaction_score",)

CLINICS: dict[str, tuple[str, str]] = {
    "US-TX-01": ("US", "Austin, TX — Main"),
    "US-TX-02": ("US", "Austin, TX — North"),
    "US-TX-03": ("US", "Houston, TX"),
    "US-FL-01": ("US", "Miami, FL"),
    "US-FL-02": ("US", "Orlando, FL"),
    "US-FL-03": ("US", "Tampa, FL"),
    "US-GA-01": ("US", "Atlanta, GA — Midtown"),
    "US-GA-02": ("US", "Atlanta, GA — Buckhead"),
    "US-GA-03": ("US", "Savannah, GA"),
    "UK-LON-01": ("UK", "London — Canary Wharf"),
    "UK-LON-02": ("UK", "London — Kensington"),
    "UK-MAN-01": ("UK", "Manchester"),
}

VALID_CLINIC_IDS = frozenset(CLINICS)
VALID_COUNTRIES = frozenset({"US", "UK"})
VALID_CATEGORIES = frozenset(
    {
        "APPOINTMENT",
        "BILLING",
        "CLINICAL_CARE",
        "ACCESSIBILITY",
        "ADMINISTRATIVE",
    }
)
VALID_STATUSES = frozenset({"OPEN", "CLOSED", "DISCARDED"})

CLOSED_STATUS = "CLOSED"

CATEGORY_ORDER = (
    "APPOINTMENT",
    "BILLING",
    "CLINICAL_CARE",
    "ACCESSIBILITY",
    "ADMINISTRATIVE",
)
STATUS_ORDER = ("OPEN", "CLOSED", "DISCARDED")
COUNTRY_ORDER = ("US", "UK")
SCORE_ORDER = (1, 2, 3, 4, 5)

SCORE_LABELS = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
}

REASON_INVALID_CLINIC_ID = "invalid_clinic_id"
REASON_COUNTRY_MISMATCH = "country_clinic_mismatch"
REASON_INVALID_CATEGORY = "invalid_category"
REASON_EMPTY_DESCRIPTION = "empty_description"
REASON_MISSING_PATIENT_ID = "missing_patient_id"
REASON_CLOSED_NO_SCORE = "closed_no_score"
REASON_SCORE_OUT_OF_RANGE = "score_out_of_range"
REASON_INVALID_STATUS = "invalid_status"
REASON_INVALID_INCIDENT_ID = "invalid_incident_id"
REASON_INVALID_DATE = "invalid_date"
REASON_INVALID_COUNTRY = "invalid_country"

INVALID_REASON_ORDER = (
    REASON_INVALID_CLINIC_ID,
    REASON_COUNTRY_MISMATCH,
    REASON_INVALID_CATEGORY,
    REASON_EMPTY_DESCRIPTION,
    REASON_MISSING_PATIENT_ID,
    REASON_CLOSED_NO_SCORE,
    REASON_SCORE_OUT_OF_RANGE,
    REASON_INVALID_STATUS,
    REASON_INVALID_INCIDENT_ID,
    REASON_INVALID_DATE,
    REASON_INVALID_COUNTRY,
)

INVALID_REASON_LABELS = {
    REASON_INVALID_CLINIC_ID: "Invalid or missing clinic_id",
    REASON_COUNTRY_MISMATCH: "Country/clinic mismatch",
    REASON_INVALID_CATEGORY: "Invalid or missing category",
    REASON_EMPTY_DESCRIPTION: "Empty description",
    REASON_MISSING_PATIENT_ID: "Missing patient_id",
    REASON_CLOSED_NO_SCORE: "Closed case, no score",
    REASON_SCORE_OUT_OF_RANGE: "Satisfaction score out of range",
    REASON_INVALID_STATUS: "Invalid or missing status",
    REASON_INVALID_INCIDENT_ID: "Invalid or missing incident_id",
    REASON_INVALID_DATE: "Invalid or missing date",
    REASON_INVALID_COUNTRY: "Invalid or missing country",
}

PATIENT_ID_PATTERN = re.compile(r"^PAT-\d{6}$")
INCIDENT_ID_PATTERN = re.compile(r"^HC-\d{6}$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
PHI_VALUE_PATTERN = re.compile(r"PAT-\d{6}", re.IGNORECASE)

# Locked against scripts/incidents-healthcore.csv (100 rows).
EXPECTED_SAMPLE_METRICS = {
    "total_rows": 100,
    "valid_count": 94,
    "invalid_count": 6,
    "by_category": {
        "APPOINTMENT": 30,
        "BILLING": 20,
        "CLINICAL_CARE": 14,
        "ACCESSIBILITY": 17,
        "ADMINISTRATIVE": 13,
    },
    "by_status": {
        "OPEN": 28,
        "CLOSED": 52,
        "DISCARDED": 14,
    },
    "by_country": {
        "US": 61,
        "UK": 33,
    },
    "invalid_by_reason": {
        REASON_INVALID_CLINIC_ID: 1,
        REASON_COUNTRY_MISMATCH: 1,
        REASON_INVALID_CATEGORY: 1,
        REASON_EMPTY_DESCRIPTION: 1,
        REASON_MISSING_PATIENT_ID: 1,
        REASON_CLOSED_NO_SCORE: 1,
    },
    "satisfaction_by_score": {
        1: 3,
        2: 5,
        3: 12,
        4: 23,
        5: 9,
    },
    "avg_satisfaction_closed": 3.58,
    "satisfaction_sample_size": 52,
}
