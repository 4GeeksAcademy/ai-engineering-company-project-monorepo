"""Load and analyze HealthCore incident CSV content."""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .constants import INVALID_RULE_ORDER, VALID_CATEGORIES
from .validate import classify_invalid_rules


@dataclass
class AnalysisResult:
    source_name: str
    total_records: int = 0
    valid_count: int = 0
    invalid_count: int = 0
    invalid_by_rule: dict[str, int] = field(default_factory=dict)
    category_counts: dict[str, int] = field(default_factory=dict)
    status_counts: dict[str, int] = field(default_factory=dict)
    country_counts: dict[str, int] = field(default_factory=dict)
    satisfaction_score_counts: dict[int, int] = field(default_factory=dict)
    satisfaction_scored_cases: int = 0
    satisfaction_closed_cases: int = 0
    satisfaction_average: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_name": self.source_name,
            "total_records": self.total_records,
            "valid_count": self.valid_count,
            "invalid_count": self.invalid_count,
            "invalid_by_rule": dict(self.invalid_by_rule),
            "category_counts": dict(self.category_counts),
            "status_counts": dict(self.status_counts),
            "country_counts": dict(self.country_counts),
            "satisfaction": {
                "closed_cases": self.satisfaction_closed_cases,
                "scored_cases": self.satisfaction_scored_cases,
                "average": self.satisfaction_average,
                "score_counts": {
                    str(score): count
                    for score, count in sorted(self.satisfaction_score_counts.items())
                },
            },
        }


class IncidentCsvError(ValueError):
    """Raised when the uploaded or local CSV cannot be analyzed."""


REQUIRED_COLUMNS = (
    "incident_id",
    "date",
    "clinic_id",
    "country",
    "category",
    "description",
    "status",
    "patient_id",
    "satisfaction_score",
)


def _empty_rule_counts() -> dict[str, int]:
    return {rule: 0 for rule in INVALID_RULE_ORDER}


def _empty_category_counts() -> dict[str, int]:
    return {category: 0 for category in VALID_CATEGORIES}


def _empty_status_counts() -> dict[str, int]:
    return {status: 0 for status in ("OPEN", "CLOSED", "DISCARDED")}


def analyze_rows(rows: list[dict[str, str]], source_name: str) -> AnalysisResult:
    result = AnalysisResult(
        source_name=source_name,
        invalid_by_rule=_empty_rule_counts(),
        category_counts=_empty_category_counts(),
        status_counts=_empty_status_counts(),
        country_counts={"US": 0, "UK": 0},
        satisfaction_score_counts={1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
    )

    score_total = 0
    valid_rows: list[dict[str, str]] = []

    for row in rows:
        result.total_records += 1
        rules = classify_invalid_rules(row)
        if rules:
            result.invalid_count += 1
            # Assign the first matching rule so each invalid record counts once.
            primary_rule = rules[0]
            result.invalid_by_rule[primary_rule] = (
                result.invalid_by_rule.get(primary_rule, 0) + 1
            )
            continue

        result.valid_count += 1
        valid_rows.append(row)

        category = row.get("category", "").strip()
        status = row.get("status", "").strip()
        country = row.get("country", "").strip()

        if category in result.category_counts:
            result.category_counts[category] += 1
        if status in result.status_counts:
            result.status_counts[status] += 1
        if country in result.country_counts:
            result.country_counts[country] += 1

        if status == "CLOSED":
            result.satisfaction_closed_cases += 1
            score = int(str(row.get("satisfaction_score", "")).strip())
            result.satisfaction_scored_cases += 1
            result.satisfaction_score_counts[score] = (
                result.satisfaction_score_counts.get(score, 0) + 1
            )
            score_total += score

    if result.satisfaction_scored_cases:
        result.satisfaction_average = round(
            score_total / result.satisfaction_scored_cases, 2
        )

    return result


def _parse_csv_text(text: str, source_name: str) -> AnalysisResult:
    if not text or not text.strip():
        raise IncidentCsvError("The CSV file is empty.")

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise IncidentCsvError("The CSV file has no header row.")

    normalized = [name.strip() for name in reader.fieldnames if name is not None]
    missing = [col for col in REQUIRED_COLUMNS if col not in normalized]
    if missing:
        raise IncidentCsvError(
            "Incorrect CSV format: missing required columns: "
            + ", ".join(missing)
        )

    # Rebuild reader with stripped headers mapped from original names.
    header_map = {
        (name.strip() if name else ""): name for name in reader.fieldnames if name
    }
    rows: list[dict[str, str]] = []
    for raw in reader:
        row = {
            field: (raw.get(header_map[field], "") or "").strip()
            for field in REQUIRED_COLUMNS
        }
        rows.append(row)

    if not rows:
        raise IncidentCsvError("The CSV file contains no data rows.")

    return analyze_rows(rows, source_name=source_name)


def analyze_csv_path(path: str | Path) -> AnalysisResult:
    csv_path = Path(path)
    if not csv_path.is_file():
        raise IncidentCsvError(f"File not found: {csv_path}")
    text = csv_path.read_text(encoding="utf-8")
    return _parse_csv_text(text, source_name=csv_path.name)


def analyze_csv_bytes(data: bytes, source_name: str = "upload.csv") -> AnalysisResult:
    if not data:
        raise IncidentCsvError("The CSV file is empty.")
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise IncidentCsvError(
            "Incorrect file format: file must be UTF-8 encoded CSV."
        ) from exc
    return _parse_csv_text(text, source_name=source_name)
