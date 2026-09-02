"""Validation rules for the historical TrackFlow incidents CSV.

This module adapts the validation logic recovered from the previous
``incidents-file-analyzer`` project (repo
``4GeeksAcademy/Trackflow-incidents-analysis-mathias``), plus a fix for a
validation rule that was missing from the recovered analyzer: ``carrier``
must be compatible with ``country``.

This is pure domain logic: no TinyDB, no FastAPI, no I/O side effects.
"""

import csv
import re
from collections import Counter
from datetime import datetime
from io import StringIO
from typing import TypedDict


EXPECTED_COLUMNS = [
    "incident_id",
    "date",
    "country",
    "customer_type",
    "tracking_number",
    "carrier",
    "category",
    "description",
    "status",
    "customer_email",
    "satisfaction_score",
]

VALID_COUNTRIES = ["ES", "US"]

VALID_CUSTOMER_TYPES = ["B2B", "B2C"]

VALID_CARRIERS = [
    "LOCAL_ES",
    "MRW",
    "UPS",
    "FEDEX",
    "SEUR",
    "DHL_ES",
    "DHL_US",
]

# Carrier must be compatible with the reporting country. This rule was
# missing from the recovered analyzer and is required to reproduce the
# confirmed historical result (95 valid / 5 invalid).
ES_CARRIERS = {"LOCAL_ES", "MRW", "SEUR", "DHL_ES"}
US_CARRIERS = {"UPS", "FEDEX", "DHL_US"}

VALID_CATEGORIES = [
    "RETURN_REQUEST",
    "DAMAGE",
    "DELAYED_DELIVERY",
    "WRONG_ADDRESS",
    "LOST_PARCEL",
]

VALID_STATUSES = ["OPEN", "CLOSED", "DISCARDED"]

INCIDENT_ID_PATTERN = re.compile(r"TRF-\d{6}")
TRACKING_NUMBER_PATTERN = re.compile(r"[A-Z0-9]{12}")
EMAIL_PATTERN = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


class ValidationError(TypedDict):
    field: str
    reason: str


def _clean(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _is_valid_date(value: str) -> bool:
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def validate_carrier_country(country: str, carrier: str) -> bool:
    """Return True if `carrier` is a valid choice for `country`'s region."""
    if country == "ES":
        return carrier in ES_CARRIERS
    if country == "US":
        return carrier in US_CARRIERS
    return False


def validate_historical_incident_row(row: dict) -> list[ValidationError]:
    """Validate a single historical CSV row.

    Returns a list of field/reason errors. Never includes field values
    (in particular, never includes the raw `customer_email` value) so
    callers can log/report safely.
    """
    errors: list[ValidationError] = []

    incident_id = _clean(row.get("incident_id"))
    if not incident_id:
        errors.append({"field": "incident_id", "reason": "missing_incident_id"})
    elif not INCIDENT_ID_PATTERN.fullmatch(incident_id):
        errors.append({"field": "incident_id", "reason": "invalid_incident_id"})

    date = _clean(row.get("date"))
    if not date:
        errors.append({"field": "date", "reason": "missing_date"})
    elif not _is_valid_date(date):
        errors.append({"field": "date", "reason": "invalid_date"})

    country = _clean(row.get("country"))
    if country not in VALID_COUNTRIES:
        errors.append({"field": "country", "reason": "invalid_country"})

    customer_type = _clean(row.get("customer_type"))
    if customer_type not in VALID_CUSTOMER_TYPES:
        errors.append({"field": "customer_type", "reason": "invalid_customer_type"})

    tracking_number = _clean(row.get("tracking_number"))
    if not TRACKING_NUMBER_PATTERN.fullmatch(tracking_number):
        errors.append({"field": "tracking_number", "reason": "invalid_tracking_number"})

    carrier = _clean(row.get("carrier"))
    if carrier not in VALID_CARRIERS:
        errors.append({"field": "carrier", "reason": "invalid_carrier"})
    elif country in VALID_COUNTRIES and not validate_carrier_country(country, carrier):
        errors.append({"field": "carrier", "reason": "carrier_country_mismatch"})

    category = _clean(row.get("category"))
    if category not in VALID_CATEGORIES:
        errors.append({"field": "category", "reason": "invalid_category"})

    description = _clean(row.get("description"))
    if len(description) < 5:
        errors.append({"field": "description", "reason": "invalid_description"})

    status = _clean(row.get("status"))
    if status not in VALID_STATUSES:
        errors.append({"field": "status", "reason": "invalid_status"})

    customer_email = _clean(row.get("customer_email"))
    if not EMAIL_PATTERN.fullmatch(customer_email):
        errors.append({"field": "customer_email", "reason": "invalid_customer_email"})

    score_text = _clean(row.get("satisfaction_score"))
    if status == "CLOSED" and not score_text:
        errors.append({"field": "satisfaction_score", "reason": "closed_missing_score"})

    if score_text:
        try:
            score = int(score_text)
        except ValueError:
            errors.append({"field": "satisfaction_score", "reason": "invalid_score"})
        else:
            if not 1 <= score <= 5:
                errors.append({"field": "satisfaction_score", "reason": "score_out_of_range"})

    return errors


class InvalidRecord(TypedDict):
    incident_id: str
    errors: list[ValidationError]


class HistoricalAnalysis(TypedDict):
    total: int
    valid: int
    invalid: int
    invalid_breakdown: dict[str, int]
    invalid_records: list[InvalidRecord]
    valid_rows: list[dict]


def analyze_historical_incidents(text: str) -> HistoricalAnalysis:
    """Parse and validate the historical incidents CSV text.

    Never surfaces PII (e.g. `customer_email` values) in the returned
    structure — only `incident_id`, field names and error reasons.
    """
    if not text or not text.strip():
        raise ValueError("CSV content is empty")

    reader = csv.DictReader(StringIO(text), strict=True)

    if not reader.fieldnames:
        raise ValueError("CSV has no header row")

    missing_columns = [
        column for column in EXPECTED_COLUMNS if column not in reader.fieldnames
    ]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    rows = list(reader)

    if not rows:
        raise ValueError("CSV has no data rows")

    valid_rows: list[dict] = []
    invalid_records: list[InvalidRecord] = []
    invalid_breakdown: Counter = Counter()

    for row in rows:
        errors = validate_historical_incident_row(row)

        if errors:
            invalid_records.append({
                "incident_id": _clean(row.get("incident_id")),
                "errors": errors,
            })
            invalid_breakdown.update(error["reason"] for error in errors)
        else:
            valid_rows.append(row)

    return {
        "total": len(rows),
        "valid": len(valid_rows),
        "invalid": len(invalid_records),
        "invalid_breakdown": dict(invalid_breakdown),
        "invalid_records": invalid_records,
        "valid_rows": valid_rows,
    }
