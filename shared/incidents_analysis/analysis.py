from __future__ import annotations

import csv
from dataclasses import dataclass
from io import StringIO
from pathlib import Path
from typing import Any

VALID_COUNTRIES = {"US", "ES"}
VALID_CARRIERS_BY_COUNTRY = {
    "US": {"UPS", "FEDEX", "DHL_US"},
    "ES": {"MRW", "SEUR", "DHL_ES", "LOCAL_ES"},
}
VALID_CATEGORIES = [
    "LOST_PARCEL",
    "DELAYED_DELIVERY",
    "WRONG_ADDRESS",
    "RETURN_REQUEST",
    "DAMAGE",
]
VALID_STATUS = ["OPEN", "CLOSED", "DISCARDED"]

INVALID_REASON_ORDER = [
    "invalid_country",
    "invalid_carrier",
    "invalid_tracking_number",
    "invalid_category",
    "invalid_description",
    "invalid_email",
    "closed_without_score",
    "invalid_score_range",
    "invalid_status",
]

INVALID_REASON_LABELS = {
    "invalid_country": "Invalid country",
    "invalid_carrier": "Carrier/country mismatch",
    "invalid_tracking_number": "Invalid tracking number",
    "invalid_category": "Invalid or missing category",
    "invalid_description": "Invalid or missing description",
    "invalid_email": "Invalid or missing email",
    "closed_without_score": "Closed incident, no score",
    "invalid_score_range": "Satisfaction score out of range",
    "invalid_status": "Invalid status",
}

STATUS_ORDER = ["OPEN", "CLOSED", "DISCARDED"]
COUNTRY_ORDER = ["US", "ES"]

SCORE_LABELS = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
}


@dataclass
class AnalysisResult:
    total_records: int
    valid_records: int
    invalid_records: int
    invalid_breakdown: dict[str, int]
    category_breakdown: dict[str, int]
    status_breakdown: dict[str, int]
    country_breakdown: dict[str, int]
    satisfaction_breakdown: dict[int, int]
    satisfaction_average: float
    scored_closed_incidents: int
    closed_incidents: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_records": self.total_records,
            "valid_records": self.valid_records,
            "invalid_records": self.invalid_records,
            "invalid_breakdown": self.invalid_breakdown,
            "category_breakdown": self.category_breakdown,
            "status_breakdown": self.status_breakdown,
            "country_breakdown": self.country_breakdown,
            "satisfaction_breakdown": self.satisfaction_breakdown,
            "satisfaction_average": self.satisfaction_average,
            "scored_closed_incidents": self.scored_closed_incidents,
            "closed_incidents": self.closed_incidents,
        }


def _clean(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip()


def _safe_int(value: str | None) -> int | None:
    raw = _clean(value)
    if raw == "":
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def _validate_row(row: dict[str, str]) -> list[str]:
    reasons: list[str] = []

    country = _clean(row.get("country"))
    carrier = _clean(row.get("carrier"))
    tracking_number = _clean(row.get("tracking_number"))
    category = _clean(row.get("category"))
    description = _clean(row.get("description"))
    status = _clean(row.get("status"))
    customer_email = _clean(row.get("customer_email"))
    satisfaction_score = _safe_int(row.get("satisfaction_score"))

    if country not in VALID_COUNTRIES:
        reasons.append("invalid_country")

    if carrier == "":
        reasons.append("invalid_carrier")
    elif country in VALID_COUNTRIES and carrier not in VALID_CARRIERS_BY_COUNTRY[country]:
        reasons.append("invalid_carrier")
    elif country not in VALID_COUNTRIES:
        reasons.append("invalid_carrier")

    if len(tracking_number) < 8:
        reasons.append("invalid_tracking_number")

    if category not in VALID_CATEGORIES:
        reasons.append("invalid_category")

    if len(description) < 5:
        reasons.append("invalid_description")

    if "@" not in customer_email:
        reasons.append("invalid_email")

    if status not in VALID_STATUS:
        reasons.append("invalid_status")

    if status == "CLOSED" and satisfaction_score is None:
        reasons.append("closed_without_score")

    if satisfaction_score is not None and not (1 <= satisfaction_score <= 5):
        reasons.append("invalid_score_range")

    return reasons


def _base_counters() -> tuple[dict[str, int], dict[str, int], dict[str, int], dict[int, int]]:
    invalid_breakdown = {key: 0 for key in INVALID_REASON_ORDER}
    category_breakdown = {key: 0 for key in VALID_CATEGORIES}
    status_breakdown = {key: 0 for key in STATUS_ORDER}
    country_breakdown = {key: 0 for key in COUNTRY_ORDER}
    satisfaction_breakdown = {score: 0 for score in range(1, 6)}
    return invalid_breakdown, category_breakdown, status_breakdown, country_breakdown, satisfaction_breakdown


def analyze_incidents_rows(rows: list[dict[str, str]]) -> AnalysisResult:
    (
        invalid_breakdown,
        category_breakdown,
        status_breakdown,
        country_breakdown,
        satisfaction_breakdown,
    ) = _base_counters()

    total_records = 0
    valid_records = 0
    closed_incidents = 0
    scored_closed_incidents = 0

    for row in rows:
        total_records += 1
        reasons = _validate_row(row)

        for reason in reasons:
            invalid_breakdown[reason] = invalid_breakdown.get(reason, 0) + 1

        if reasons:
            continue

        valid_records += 1

        category = _clean(row.get("category"))
        status = _clean(row.get("status"))
        country = _clean(row.get("country"))
        score = _safe_int(row.get("satisfaction_score"))

        if category in category_breakdown:
            category_breakdown[category] += 1
        if status in status_breakdown:
            status_breakdown[status] += 1
        if country in country_breakdown:
            country_breakdown[country] += 1

        if status == "CLOSED":
            closed_incidents += 1
            if score is not None and 1 <= score <= 5:
                scored_closed_incidents += 1
                satisfaction_breakdown[score] += 1

    invalid_records = total_records - valid_records

    weighted_total = sum(score * count for score, count in satisfaction_breakdown.items())
    satisfaction_average = 0.0
    if scored_closed_incidents > 0:
        satisfaction_average = weighted_total / scored_closed_incidents

    return AnalysisResult(
        total_records=total_records,
        valid_records=valid_records,
        invalid_records=invalid_records,
        invalid_breakdown=invalid_breakdown,
        category_breakdown=category_breakdown,
        status_breakdown=status_breakdown,
        country_breakdown=country_breakdown,
        satisfaction_breakdown=satisfaction_breakdown,
        satisfaction_average=satisfaction_average,
        scored_closed_incidents=scored_closed_incidents,
        closed_incidents=closed_incidents,
    )


def _load_rows_from_text(csv_text: str) -> list[dict[str, str]]:
    reader = csv.DictReader(StringIO(csv_text))
    rows: list[dict[str, str]] = []
    for row in reader:
        rows.append({k: (v or "") for k, v in row.items()})
    return rows


def analyze_incidents_text(csv_text: str) -> AnalysisResult:
    rows = _load_rows_from_text(csv_text)
    return analyze_incidents_rows(rows)


def analyze_incidents_file(file_path: str | Path) -> AnalysisResult:
    path = Path(file_path)
    csv_text = path.read_text(encoding="utf-8")
    return analyze_incidents_text(csv_text)


def _pct(count: int, total: int) -> str:
    if total == 0:
        return "0.0%"
    return f"{(count / total) * 100:.1f}%"


def _line(label: str, value: str) -> str:
    dots = "." * max(1, 34 - len(label))
    return f"  {label} {dots} {value}"


def format_console_report(result: AnalysisResult, source_file: str) -> str:
    lines: list[str] = []
    lines.append("=" * 60)
    lines.append("  TRACKFLOW - INCIDENT REPORT ANALYSIS")
    lines.append(f"  Source file: {source_file}")
    lines.append("=" * 60)
    lines.append("")
    lines.append(_line("TOTAL RECORDS IN FILE", str(result.total_records)))
    lines.append(_line("Valid records", str(result.valid_records)))
    lines.append(_line("Invalid / incomplete", str(result.invalid_records)))
    lines.append("")
    lines.append("INVALID RECORDS BREAKDOWN")

    for idx, key in enumerate(INVALID_REASON_ORDER):
        count = result.invalid_breakdown.get(key, 0)
        prefix = "|-" if idx < len(INVALID_REASON_ORDER) - 1 else "`-"
        lines.append(f"  {prefix} {INVALID_REASON_LABELS[key]:<30} {count}")

    lines.append("")
    lines.append("BREAKDOWN BY CATEGORY (valid records)")
    for idx, category in enumerate(VALID_CATEGORIES):
        count = result.category_breakdown.get(category, 0)
        prefix = "|-" if idx < len(VALID_CATEGORIES) - 1 else "`-"
        lines.append(
            f"  {prefix} {category:<29} {count:>3}  ({_pct(count, result.valid_records)})"
        )

    lines.append("")
    lines.append("BREAKDOWN BY STATUS (valid records)")
    for idx, status in enumerate(STATUS_ORDER):
        count = result.status_breakdown.get(status, 0)
        prefix = "|-" if idx < len(STATUS_ORDER) - 1 else "`-"
        lines.append(
            f"  {prefix} {status:<29} {count:>3}  ({_pct(count, result.valid_records)})"
        )

    lines.append("")
    lines.append("BREAKDOWN BY COUNTRY (valid records) - recommended")
    for idx, country in enumerate(COUNTRY_ORDER):
        count = result.country_breakdown.get(country, 0)
        prefix = "|-" if idx < len(COUNTRY_ORDER) - 1 else "`-"
        lines.append(
            f"  {prefix} {country:<29} {count:>3}  ({_pct(count, result.valid_records)})"
        )

    lines.append("")
    lines.append("SATISFACTION INDEX (closed incidents)")
    lines.append(
        f"  Scored incidents: {result.scored_closed_incidents} of {result.closed_incidents}"
    )
    lines.append(f"  Average score: {result.satisfaction_average:.2f} / 5.00")

    for idx, score in enumerate(range(1, 6)):
        count = result.satisfaction_breakdown.get(score, 0)
        prefix = "|-" if idx < 4 else "`-"
        lines.append(
            f"  {prefix} Score {score} ({SCORE_LABELS[score]:<17}) {count:>3}"
        )

    lines.append("")
    lines.append("=" * 60)

    return "\n".join(lines)


def build_export_rows(result: AnalysisResult) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    rows.append({"section": "totals", "metric": "total_records", "value": result.total_records, "percentage": ""})
    rows.append({"section": "totals", "metric": "valid_records", "value": result.valid_records, "percentage": ""})
    rows.append({"section": "totals", "metric": "invalid_records", "value": result.invalid_records, "percentage": ""})

    for key in INVALID_REASON_ORDER:
        rows.append(
            {
                "section": "invalid_breakdown",
                "metric": key,
                "value": result.invalid_breakdown.get(key, 0),
                "percentage": "",
            }
        )

    for category in VALID_CATEGORIES:
        count = result.category_breakdown.get(category, 0)
        rows.append(
            {
                "section": "category_breakdown",
                "metric": category,
                "value": count,
                "percentage": _pct(count, result.valid_records),
            }
        )

    for status in STATUS_ORDER:
        count = result.status_breakdown.get(status, 0)
        rows.append(
            {
                "section": "status_breakdown",
                "metric": status,
                "value": count,
                "percentage": _pct(count, result.valid_records),
            }
        )

    for country in COUNTRY_ORDER:
        count = result.country_breakdown.get(country, 0)
        rows.append(
            {
                "section": "country_breakdown",
                "metric": country,
                "value": count,
                "percentage": _pct(count, result.valid_records),
            }
        )

    rows.append(
        {
            "section": "satisfaction",
            "metric": "average_score",
            "value": f"{result.satisfaction_average:.2f}",
            "percentage": "",
        }
    )

    rows.append(
        {
            "section": "satisfaction",
            "metric": "scored_closed_incidents",
            "value": result.scored_closed_incidents,
            "percentage": "",
        }
    )

    rows.append(
        {
            "section": "satisfaction",
            "metric": "closed_incidents",
            "value": result.closed_incidents,
            "percentage": "",
        }
    )

    for score in range(1, 6):
        rows.append(
            {
                "section": "satisfaction_score_breakdown",
                "metric": f"score_{score}",
                "value": result.satisfaction_breakdown.get(score, 0),
                "percentage": "",
            }
        )

    return rows
