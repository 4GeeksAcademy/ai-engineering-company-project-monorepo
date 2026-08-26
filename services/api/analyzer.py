from __future__ import annotations

import csv
from io import StringIO
from typing import Any

VALID_CARRIERS_BY_COUNTRY = {
    "US": {"UPS", "FEDEX", "DHL_US"},
    "ES": {"MRW", "SEUR", "DHL_ES", "LOCAL_ES"},
}

VALID_CATEGORIES = {
    "LOST_PARCEL",
    "DELAYED_DELIVERY",
    "WRONG_ADDRESS",
    "RETURN_REQUEST",
    "DAMAGE",
}

VALID_STATUSES = {"OPEN", "CLOSED", "DISCARDED"}
VALID_COUNTRIES = set(VALID_CARRIERS_BY_COUNTRY.keys())

REQUIRED_COLUMNS = [
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

INVALID_RULE_LABELS = {
    "INVALID_TRACKING": "invalid_tracking",
    "CARRIER_COUNTRY_MISMATCH": "carrier_country_mismatch",
    "INVALID_CATEGORY": "invalid_category",
    "INVALID_EMAIL": "invalid_email",
    "CLOSED_NO_SCORE": "closed_no_score",
    "SCORE_OUT_OF_RANGE": "score_out_of_range",
    "INVALID_COUNTRY": "invalid_country",
    "SHORT_DESCRIPTION": "short_description",
}

PRIMARY_INVALID_KEYS = [
    "invalid_tracking",
    "carrier_country_mismatch",
    "invalid_category",
    "invalid_email",
    "closed_no_score",
]


def _norm(row: dict[str, Any], key: str) -> str:
    value = row.get(key)
    if value is None:
        return ""
    return str(value).strip()


def ensure_required_columns(fieldnames: list[str] | None) -> None:
    if not fieldnames:
        raise ValueError("CSV header is missing or empty")

    missing = [name for name in REQUIRED_COLUMNS if name not in fieldnames]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")


def validate_record(row: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    tracking_number = _norm(row, "tracking_number")
    country = _norm(row, "country")
    carrier = _norm(row, "carrier")
    category = _norm(row, "category")
    description = _norm(row, "description")
    status = _norm(row, "status")
    email = _norm(row, "customer_email")
    satisfaction_raw = _norm(row, "satisfaction_score")

    if len(tracking_number) < 8:
        errors.append("INVALID_TRACKING")

    if country not in VALID_COUNTRIES:
        errors.append("INVALID_COUNTRY")
    else:
        if carrier not in VALID_CARRIERS_BY_COUNTRY[country]:
            errors.append("CARRIER_COUNTRY_MISMATCH")

    if category not in VALID_CATEGORIES:
        errors.append("INVALID_CATEGORY")

    if len(description) < 5:
        errors.append("SHORT_DESCRIPTION")

    if "@" not in email:
        errors.append("INVALID_EMAIL")

    if status == "CLOSED" and not satisfaction_raw:
        errors.append("CLOSED_NO_SCORE")

    if satisfaction_raw:
        try:
            score = int(satisfaction_raw)
            if score < 1 or score > 5:
                errors.append("SCORE_OUT_OF_RANGE")
        except ValueError:
            errors.append("SCORE_OUT_OF_RANGE")

    if status and status not in VALID_STATUSES:
        # Status no es una regla del enunciado, pero se trata como invalido para no aceptar datos corruptos.
        errors.append("INVALID_STATUS")

    return errors


def _safe_percentage(count: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round((count / total) * 100, 1)


def analyze_incidents(rows: list[dict[str, Any]]) -> dict[str, Any]:
    total_records = len(rows)

    invalid_rule_counts = {value: 0 for value in INVALID_RULE_LABELS.values()}
    invalid_rule_counts["invalid_status"] = 0

    by_category = {category: 0 for category in sorted(VALID_CATEGORIES)}
    by_status = {status: 0 for status in ["OPEN", "CLOSED", "DISCARDED"]}
    by_country = {country: 0 for country in ["US", "ES"]}

    score_distribution = {str(score): 0 for score in range(1, 6)}
    scored_incidents = 0
    total_score = 0

    valid_records = 0
    invalid_records = 0

    for row in rows:
        errors = validate_record(row)
        if errors:
            invalid_records += 1
            for code in set(errors):
                key = INVALID_RULE_LABELS.get(code)
                if key:
                    invalid_rule_counts[key] += 1
                elif code == "INVALID_STATUS":
                    invalid_rule_counts["invalid_status"] += 1
            continue

        valid_records += 1

        category = _norm(row, "category")
        status = _norm(row, "status")
        country = _norm(row, "country")

        by_category[category] += 1
        by_status[status] += 1
        by_country[country] += 1

        if status == "CLOSED":
            score = int(_norm(row, "satisfaction_score"))
            score_distribution[str(score)] += 1
            total_score += score
            scored_incidents += 1

    total_closed = by_status["CLOSED"]
    average = round(total_score / scored_incidents, 2) if scored_incidents else 0.0

    result = {
        "total_records": total_records,
        "valid_records": valid_records,
        "invalid_records": invalid_records,
        "invalid_breakdown": invalid_rule_counts,
        "primary_invalid_breakdown": {
            key: invalid_rule_counts.get(key, 0) for key in PRIMARY_INVALID_KEYS
        },
        "by_category": by_category,
        "by_status": by_status,
        "by_country": by_country,
        "satisfaction": {
            "scored_incidents": scored_incidents,
            "total_closed": total_closed,
            "average": average,
            "distribution": score_distribution,
        },
        "percentages": {
            "category": {k: _safe_percentage(v, valid_records) for k, v in by_category.items()},
            "status": {k: _safe_percentage(v, valid_records) for k, v in by_status.items()},
            "country": {k: _safe_percentage(v, valid_records) for k, v in by_country.items()},
        },
    }

    return result


def parse_csv_text(content: str) -> list[dict[str, Any]]:
    stream = StringIO(content)
    reader = csv.DictReader(stream)
    ensure_required_columns(reader.fieldnames)
    return [row for row in reader]


def parse_csv_file(file_path: str) -> list[dict[str, Any]]:
    with open(file_path, "r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        ensure_required_columns(reader.fieldnames)
        return [row for row in reader]


def build_export_rows(result: dict[str, Any]) -> list[tuple[str, str]]:
    satisfaction = result["satisfaction"]

    rows: list[tuple[str, str]] = [
        ("metric", "value"),
        ("total_records", str(result["total_records"])),
        ("valid_records", str(result["valid_records"])),
        ("invalid_records", str(result["invalid_records"])),
        (
            "invalid_tracking",
            str(result["primary_invalid_breakdown"]["invalid_tracking"]),
        ),
        (
            "carrier_country_mismatch",
            str(result["primary_invalid_breakdown"]["carrier_country_mismatch"]),
        ),
        (
            "invalid_category",
            str(result["primary_invalid_breakdown"]["invalid_category"]),
        ),
        (
            "invalid_email",
            str(result["primary_invalid_breakdown"]["invalid_email"]),
        ),
        (
            "closed_no_score",
            str(result["primary_invalid_breakdown"]["closed_no_score"]),
        ),
    ]

    for category in [
        "LOST_PARCEL",
        "DELAYED_DELIVERY",
        "WRONG_ADDRESS",
        "RETURN_REQUEST",
        "DAMAGE",
    ]:
        rows.append((f"category_{category}", str(result["by_category"][category])))

    for status in ["OPEN", "CLOSED", "DISCARDED"]:
        rows.append((f"status_{status}", str(result["by_status"][status])))

    for country in ["US", "ES"]:
        rows.append((f"country_{country}", str(result["by_country"][country])))

    rows.append(("avg_satisfaction", f"{satisfaction['average']:.2f}"))

    for score in ["1", "2", "3", "4", "5"]:
        rows.append((f"score_{score}", str(satisfaction["distribution"][score])))

    return rows
