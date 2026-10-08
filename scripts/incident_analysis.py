"""Shared, privacy-safe incident CSV validation and analysis logic.

Used by both scripts/analyze.py (CLI) and services/api (FastAPI), so the
validation rules and metrics live in exactly one place. Field names, categories,
statuses and ranges come from CONTEXT-nexova.es.md.

Privacy: no function in this module returns, logs or exports field values
(in particular `customer_email`); only counts and field names leave it.
"""

from __future__ import annotations

import csv
import io
import re
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import date
from typing import Iterable, Mapping, NamedTuple, TextIO

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
ALL_FIELDS = REQUIRED_FIELDS + OPTIONAL_FIELDS
VALID_CATEGORIES = ("TECHNICAL", "BILLING", "ACCESS", "HR_QUERY", "COMPLAINT")
VALID_STATUSES = ("OPEN", "CLOSED", "DISCARDED")
SCORE_RANGE = range(1, 6)
SCORE_LABELS = {1: "Very dissatisfied", 2: "Dissatisfied", 3: "Neutral", 4: "Satisfied", 5: "Very satisfied"}

_TICKET_ID = re.compile(r"NXV-\d{6}")
_AGENT_ID = re.compile(r"AGT-\d{2}")
_MIN_DESCRIPTION = 5

# Invalid-record rules. The first seven are the rules listed in the CONTEXT;
# the last three cover the remaining required fields.
RULE_LABELS = {
    "missing_client_company": "Missing client_company",
    "invalid_category": "Invalid or missing category",
    "invalid_description": "Invalid or missing description",
    "invalid_agent_id": "Invalid or missing agent_id",
    "invalid_email": "Invalid or missing email",
    "closed_without_score": "Closed ticket, no score",
    "invalid_score": "Score out of range (1-5)",
    "invalid_status": "Invalid or missing status",
    "invalid_ticket_id": "Invalid or missing ticket_id",
    "invalid_date": "Invalid or missing date",
}
# Rules that the CONTEXT's expected output always lists, even at zero.
CORE_RULES = ("missing_client_company", "invalid_category", "invalid_email", "closed_without_score")

MISSING = "missing"
INVALID = "invalid"
PROBLEM_LABELS = {MISSING: "missing value", INVALID: "value not allowed"}


class Issue(NamedTuple):
    rule: str
    field: str
    kind: str  # MISSING or INVALID


@dataclass(frozen=True)
class AnalysisResult:
    total_records: int
    valid_records: int
    invalid_records: int
    invalid_breakdown: dict[str, int]
    invalid_by_field: dict[str, dict[str, int]]
    by_category: dict[str, int]
    by_status: dict[str, int]
    scored_tickets: int
    closed_tickets: int
    average_score: float | None
    score_breakdown: dict[int, int]

    def to_dict(self) -> dict:
        return asdict(self)


class CsvFormatError(ValueError):
    """The file cannot be analysed at all (no header, missing columns, malformed)."""


class EmptyCsvError(CsvFormatError):
    """The file has no content."""


def _text(row: Mapping[str, str | None], field: str) -> str:
    return (row.get(field) or "").strip()


def _check(row: Mapping[str, str | None], field: str, rule: str, is_valid) -> list[Issue]:
    value = _text(row, field)
    if not value:
        return [Issue(rule, field, MISSING)]
    if not is_valid(value):
        return [Issue(rule, field, INVALID)]
    return []


def _is_iso_date(value: str) -> bool:
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def _score_issues(row: Mapping[str, str | None]) -> list[Issue]:
    score = _text(row, "satisfaction_score")
    if not score:
        if _text(row, "status") == "CLOSED":
            return [Issue("closed_without_score", "satisfaction_score", MISSING)]
        return []
    if not score.isdigit() or int(score) not in SCORE_RANGE:
        return [Issue("invalid_score", "satisfaction_score", INVALID)]
    return []


def find_issues(row: Mapping[str, str | None]) -> list[Issue]:
    """Return every validation problem in a row (empty list means valid)."""
    return [
        *_check(row, "ticket_id", "invalid_ticket_id", _TICKET_ID.fullmatch),
        *_check(row, "date", "invalid_date", _is_iso_date),
        *_check(row, "client_company", "missing_client_company", bool),
        *_check(row, "category", "invalid_category", VALID_CATEGORIES.__contains__),
        *_check(row, "description", "invalid_description", lambda v: len(v) >= _MIN_DESCRIPTION),
        *_check(row, "agent_id", "invalid_agent_id", _AGENT_ID.fullmatch),
        *_check(row, "status", "invalid_status", VALID_STATUSES.__contains__),
        *_check(row, "customer_email", "invalid_email", lambda v: "@" in v),
        *_score_issues(row),
    ]


def analyze_rows(rows: Iterable[Mapping[str, str | None]]) -> AnalysisResult:
    total = 0
    valid: list[Mapping[str, str | None]] = []
    rule_counts: Counter[str] = Counter()
    field_counts: dict[str, Counter[str]] = {}
    for row in rows:
        total += 1
        issues = find_issues(row)
        if not issues:
            valid.append(row)
            continue
        for rule in {issue.rule for issue in issues}:
            rule_counts[rule] += 1
        for issue in set(issues):
            field_counts.setdefault(issue.field, Counter())[issue.kind] += 1

    by_category = Counter(_text(row, "category") for row in valid)
    by_status = Counter(_text(row, "status") for row in valid)
    scores = [int(_text(row, "satisfaction_score")) for row in valid if _text(row, "status") == "CLOSED"]
    score_counts = Counter(scores)
    return AnalysisResult(
        total_records=total,
        valid_records=len(valid),
        invalid_records=total - len(valid),
        invalid_breakdown={rule: rule_counts[rule] for rule in RULE_LABELS if rule_counts[rule]},
        invalid_by_field={
            field: {kind: field_counts[field][kind] for kind in PROBLEM_LABELS if field_counts[field][kind]}
            for field in ALL_FIELDS
            if field in field_counts
        },
        by_category={category: by_category[category] for category in VALID_CATEGORIES},
        by_status={status: by_status[status] for status in VALID_STATUSES},
        scored_tickets=len(scores),
        closed_tickets=by_status["CLOSED"],
        average_score=round(sum(scores) / len(scores), 2) if scores else None,
        score_breakdown={score: score_counts[score] for score in SCORE_RANGE},
    )


def analyze_csv_text(text: str) -> AnalysisResult:
    """Validate the header and analyse a CSV given as text.

    Raises EmptyCsvError if the file is empty, CsvFormatError if it has no data
    rows, lacks required columns or is not parseable CSV.
    """
    text = text.lstrip("﻿")
    if not text.strip():
        raise EmptyCsvError("The CSV file is empty")
    try:
        reader = csv.DictReader(io.StringIO(text, newline=""))
        header = [name.strip() for name in reader.fieldnames or []]
        missing = [field for field in ALL_FIELDS if field not in header]
        if missing:
            raise CsvFormatError(f"The CSV is missing required columns: {', '.join(missing)}")
        reader.fieldnames = header
        rows = list(reader)
    except csv.Error as error:
        raise CsvFormatError(f"The file is not a valid CSV: {error}") from error
    if not rows:
        raise CsvFormatError("The CSV has a header but no data rows")
    return analyze_rows(rows)


def analyze_csv_file(file: TextIO) -> AnalysisResult:
    return analyze_csv_text(file.read())


def export_rows(result: AnalysisResult) -> list[tuple[str, str, str]]:
    """One row per metric: (metric, value, description)."""
    rows = [
        ("total_records", str(result.total_records), "Records in file"),
        ("valid_records", str(result.valid_records), "Valid records"),
        ("invalid_records", str(result.invalid_records), "Invalid / incomplete records"),
    ]
    rows += [(f"rule_{rule}", str(count), RULE_LABELS[rule]) for rule, count in result.invalid_breakdown.items()]
    rows += [
        (f"invalid_field_{field}_{kind}", str(count), f"{field}: {PROBLEM_LABELS[kind]}")
        for field, kinds in result.invalid_by_field.items()
        for kind, count in kinds.items()
    ]
    rows += [(f"category_{key}", str(count), f"Valid records in category {key}") for key, count in result.by_category.items()]
    rows += [(f"status_{key}", str(count), f"Valid records with status {key}") for key, count in result.by_status.items()]
    rows += [
        ("closed_tickets", str(result.closed_tickets), "Valid closed tickets"),
        ("scored_tickets", str(result.scored_tickets), "Closed tickets with a satisfaction score"),
        (
            "average_score",
            "" if result.average_score is None else f"{result.average_score:.2f}",
            "Average satisfaction score of closed tickets (1-5)",
        ),
    ]
    rows += [(f"score_{score}", str(count), SCORE_LABELS[score]) for score, count in result.score_breakdown.items()]
    return rows


def write_results_csv(result: AnalysisResult, target: TextIO) -> None:
    writer = csv.writer(target)
    writer.writerow(("metric", "value", "description"))
    writer.writerows(export_rows(result))
