"""Shared, privacy-safe incident CSV validation and analysis logic."""

from __future__ import annotations

import csv
import io
import re
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import date
from typing import Iterable, Mapping, TextIO

REQUIRED_FIELDS = (
    "ticket_id",
    "date",
    "client_company",
    "category",
    "description",
    "agent_id",
    "status",
    "customer_email",
)
OPTIONAL_FIELDS = ("satisfaction_score",)
VALID_CATEGORIES = ("TECHNICAL", "BILLING", "ACCESS", "HR_QUERY", "COMPLAINT")
VALID_STATUSES = ("OPEN", "CLOSED", "DISCARDED")

_INVALID_LABELS = {
    "missing_required_field": "Missing required field",
    "missing_client_company": "Missing client_company",
    "invalid_category": "Invalid or missing category",
    "invalid_description": "Invalid description",
    "invalid_agent_id": "Invalid or missing agent_id",
    "invalid_email": "Invalid or missing email",
    "closed_without_score": "Closed ticket, no score",
    "invalid_score": "Invalid satisfaction_score",
    "invalid_status": "Invalid or missing status",
}


@dataclass(frozen=True)
class AnalysisResult:
    total_records: int
    valid_records: int
    invalid_records: int
    invalid_breakdown: dict[str, int]
    by_category: dict[str, int]
    by_status: dict[str, int]
    scored_tickets: int
    closed_tickets: int
    average_score: float | None
    score_breakdown: dict[int, int]

    def to_dict(self) -> dict:
        return asdict(self)


def _blank(value: object) -> bool:
    return value is None or not str(value).strip()


def _valid_date(value: str) -> bool:
    try:
        date.fromisoformat(value.strip())
        return True
    except (TypeError, ValueError):
        return False


def _issues(row: Mapping[str, str], fieldnames: set[str]) -> list[str]:
    issues: list[str] = []
    missing = [field for field in REQUIRED_FIELDS if field not in fieldnames]
    if missing:
        return ["missing_required_field"]
    if _blank(row.get("client_company")):
        issues.append("missing_client_company")
    if _blank(row.get("category")) or row.get("category", "").strip() not in VALID_CATEGORIES:
        issues.append("invalid_category")
    description = row.get("description", "").strip()
    if len(description) < 5:
        issues.append("invalid_description")
    if not re.fullmatch(r"AGT-\d{2}", row.get("agent_id", "").strip()):
        issues.append("invalid_agent_id")
    if _blank(row.get("customer_email")) or "@" not in row.get("customer_email", ""):
        issues.append("invalid_email")
    status = row.get("status", "").strip()
    if status not in VALID_STATUSES:
        issues.append("invalid_status")
    score_text = row.get("satisfaction_score", "").strip()
    if status == "CLOSED" and not score_text:
        issues.append("closed_without_score")
    elif score_text:
        try:
            score = int(score_text)
        except ValueError:
            score = 0
        if score not in range(1, 6):
            issues.append("invalid_score")
    # These required fields are checked without exposing their values.
    if _blank(row.get("ticket_id")) or not _valid_date(row.get("date", "")):
        issues.append("missing_required_field")
    return issues


def validate_rows(rows: Iterable[Mapping[str, str]], fieldnames: Iterable[str]) -> tuple[list[Mapping[str, str]], Counter[str]]:
    """Return valid rows and counts by validation rule; never logs sensitive data."""
    field_set = set(fieldnames)
    valid: list[Mapping[str, str]] = []
    invalid: Counter[str] = Counter()
    for row in rows:
        issues = _issues(row, field_set)
        if issues:
            for issue in set(issues):
                invalid[issue] += 1
        else:
            valid.append(row)
    return valid, invalid


def analyze_rows(rows: Iterable[Mapping[str, str]], fieldnames: Iterable[str]) -> AnalysisResult:
    rows_list = list(rows)
    valid, invalid = validate_rows(rows_list, fieldnames)
    by_category = Counter(row["category"].strip() for row in valid)
    by_status = Counter(row["status"].strip() for row in valid)
    closed_scores = [int(row["satisfaction_score"].strip()) for row in valid if row["status"].strip() == "CLOSED"]
    scores = Counter(closed_scores)
    return AnalysisResult(
        total_records=len(rows_list),
        valid_records=len(valid),
        invalid_records=len(rows_list) - len(valid),
        invalid_breakdown={key: invalid[key] for key in _INVALID_LABELS if invalid[key]},
        by_category={key: by_category[key] for key in VALID_CATEGORIES},
        by_status={key: by_status[key] for key in VALID_STATUSES},
        scored_tickets=len(closed_scores),
        closed_tickets=by_status["CLOSED"],
        average_score=round(sum(closed_scores) / len(closed_scores), 2) if closed_scores else None,
        score_breakdown={score: scores[score] for score in range(1, 6)},
    )


def analyze_csv_text(text: str) -> AnalysisResult:
    if not text.strip():
        raise ValueError("The CSV file is empty")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("The CSV has no header row")
    return analyze_rows(reader, reader.fieldnames)


def analyze_csv_file(file: TextIO) -> AnalysisResult:
    return analyze_csv_text(file.read())


def invalid_label(key: str) -> str:
    return _INVALID_LABELS[key]


def export_rows(result: AnalysisResult) -> list[tuple[str, str, str]]:
    rows = [
        ("total_records", str(result.total_records), ""),
        ("valid_records", str(result.valid_records), ""),
        ("invalid_records", str(result.invalid_records), ""),
    ]
    rows.extend((f"invalid_{key}", str(value), invalid_label(key)) for key, value in result.invalid_breakdown.items())
    rows.extend((f"category_{key}", str(value), "") for key, value in result.by_category.items())
    rows.extend((f"status_{key}", str(value), "") for key, value in result.by_status.items())
    rows.extend([
        ("closed_tickets", str(result.closed_tickets), ""),
        ("scored_tickets", str(result.scored_tickets), ""),
        ("average_score", "" if result.average_score is None else f"{result.average_score:.2f}", ""),
    ])
    rows.extend((f"score_{key}", str(value), "") for key, value in result.score_breakdown.items())
    return rows


def write_results_csv(result: AnalysisResult, target: TextIO) -> None:
    writer = csv.writer(target)
    writer.writerow(("metric", "value", "description"))
    writer.writerows(export_rows(result))
