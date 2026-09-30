"""Incident CSV schema as defined in CONTEXT-healthcore.en.md."""

from __future__ import annotations

import re
from types import MappingProxyType

# Clinic code -> country, per the 12 valid clinic codes in the context document.
CLINIC_COUNTRIES = MappingProxyType(
    {
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
)

CATEGORIES = (
    "APPOINTMENT",
    "BILLING",
    "CLINICAL_CARE",
    "ACCESSIBILITY",
    "ADMINISTRATIVE",
)

STATUSES = ("OPEN", "CLOSED", "DISCARDED")

COUNTRIES = ("US", "UK")

REQUIRED_COLUMNS = (
    "incident_id",
    "date",
    "clinic_id",
    "country",
    "category",
    "description",
    "status",
    "patient_id",
)

OPTIONAL_COLUMNS = ("satisfaction_score",)

MIN_DESCRIPTION_LENGTH = 5
MIN_SATISFACTION_SCORE = 1
MAX_SATISFACTION_SCORE = 5

PATIENT_ID_PATTERN = re.compile(r"^PAT-\d{6}$")
INCIDENT_ID_PATTERN = re.compile(r"^HC-\d{6}$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

SATISFACTION_LABELS = MappingProxyType(
    {
        1: "Very dissatisfied",
        2: "Dissatisfied",
        3: "Neutral",
        4: "Satisfied",
        5: "Very satisfied",
    }
)
