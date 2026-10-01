"""Validation rule identifiers and the errors raised when a file cannot be read.

Rule labels are deliberately value-free: they name the rule that was broken and
never echo field content, so no patient identifier can reach any output.
"""

from __future__ import annotations

from typing import NamedTuple


class Rule(NamedTuple):
    key: str
    label: str


INVALID_CLINIC_ID = Rule("invalid_clinic_id", "Invalid or missing clinic_id")
COUNTRY_MISMATCH = Rule("country_mismatch", "Country/clinic mismatch")
INVALID_CATEGORY = Rule("invalid_category", "Invalid or missing category")
EMPTY_DESCRIPTION = Rule("empty_description", "Empty description")
MISSING_PATIENT_ID = Rule("missing_patient_id", "Missing patient_id")
CLOSED_WITHOUT_SCORE = Rule("closed_without_score", "Closed case, no score")
SCORE_OUT_OF_RANGE = Rule("score_out_of_range", "Satisfaction score out of range")
INVALID_INCIDENT_ID = Rule("invalid_incident_id", "Invalid or missing incident_id")
INVALID_DATE = Rule("invalid_date", "Invalid or missing date")
INVALID_STATUS = Rule("invalid_status", "Invalid or missing status")
DUPLICATE_INCIDENT_ID = Rule("duplicate_incident_id", "Duplicate incident_id")

# Order drives the reporting order of the invalid-records breakdown.
RULES: tuple[Rule, ...] = (
    INVALID_CLINIC_ID,
    COUNTRY_MISMATCH,
    INVALID_CATEGORY,
    EMPTY_DESCRIPTION,
    MISSING_PATIENT_ID,
    CLOSED_WITHOUT_SCORE,
    SCORE_OUT_OF_RANGE,
    INVALID_INCIDENT_ID,
    INVALID_DATE,
    INVALID_STATUS,
    DUPLICATE_INCIDENT_ID,
)

RULE_LABELS = {rule.key: rule.label for rule in RULES}


class IncidentFileError(Exception):
    """Base class for problems with the source file itself, not its records."""


class EmptyFileError(IncidentFileError):
    """The file has no bytes, or no header row."""


class InvalidFormatError(IncidentFileError):
    """The file is not readable as the expected incident CSV."""
