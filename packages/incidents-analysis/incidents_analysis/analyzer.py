"""Validation and aggregation of patient incident records.

This module is the single source of truth for the analysis: the CLI script and
the FastAPI service both call into it, so console output and API responses can
never drift apart.

Reading is done with the standard-library ``csv`` module only.
"""

from __future__ import annotations

import csv
import io
from datetime import date
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping, Sequence

from . import errors
from .errors import EmptyFileError, InvalidFormatError
from .schema import (
    CATEGORIES,
    CLINIC_COUNTRIES,
    COUNTRIES,
    DATE_PATTERN,
    INCIDENT_ID_PATTERN,
    MAX_SATISFACTION_SCORE,
    MIN_DESCRIPTION_LENGTH,
    MIN_SATISFACTION_SCORE,
    PATIENT_ID_PATTERN,
    REQUIRED_COLUMNS,
    STATUSES,
)


@dataclass(frozen=True)
class AnalysisResult:
    source_name: str
    total_records: int
    valid_records: int
    invalid_records: int
    invalid_by_rule: dict[str, int]
    by_category: dict[str, int]
    by_status: dict[str, int]
    by_country: dict[str, int]
    closed_records: int
    scored_closed_records: int
    average_satisfaction: float | None
    satisfaction_distribution: dict[int, int] = field(default_factory=dict)

    def percentage_of_valid(self, count: int) -> float:
        if self.valid_records == 0:
            return 0.0
        return round(count * 100 / self.valid_records, 1)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_name": self.source_name,
            "totals": {
                "total_records": self.total_records,
                "valid_records": self.valid_records,
                "invalid_records": self.invalid_records,
            },
            "invalid_by_rule": [
                {
                    "key": key,
                    "label": errors.RULE_LABELS[key],
                    "count": count,
                }
                for key, count in self.invalid_by_rule.items()
            ],
            "by_category": [
                {
                    "key": key,
                    "count": count,
                    "percentage": self.percentage_of_valid(count),
                }
                for key, count in self.by_category.items()
            ],
            "by_status": [
                {
                    "key": key,
                    "count": count,
                    "percentage": self.percentage_of_valid(count),
                }
                for key, count in self.by_status.items()
            ],
            "by_country": [
                {
                    "key": key,
                    "count": count,
                    "percentage": self.percentage_of_valid(count),
                }
                for key, count in self.by_country.items()
            ],
            "satisfaction": {
                "closed_records": self.closed_records,
                "scored_closed_records": self.scored_closed_records,
                "average_score": self.average_satisfaction,
                "distribution": [
                    {"score": score, "count": self.satisfaction_distribution.get(score, 0)}
                    for score in range(MIN_SATISFACTION_SCORE, MAX_SATISFACTION_SCORE + 1)
                ],
            },
        }


def _clean(row: Mapping[str, Any], column: str) -> str:
    value = row.get(column)
    if value is None:
        return ""
    return str(value).strip()


def _validate(row: Mapping[str, Any]) -> list[str]:
    """Return the keys of every rule the row breaks, in reporting order."""
    broken: list[str] = []

    clinic_id = _clean(row, "clinic_id")
    country = _clean(row, "country")
    expected_country = CLINIC_COUNTRIES.get(clinic_id)

    if expected_country is None:
        broken.append(errors.INVALID_CLINIC_ID.key)
    elif country not in COUNTRIES or country != expected_country:
        broken.append(errors.COUNTRY_MISMATCH.key)

    if not INCIDENT_ID_PATTERN.fullmatch(_clean(row, "incident_id")):
        broken.append(errors.INVALID_INCIDENT_ID.key)

    raw_date = _clean(row, "date")
    try:
        if not DATE_PATTERN.fullmatch(raw_date):
            raise ValueError
        year, month, day = (int(part) for part in raw_date.split("-"))
        date(year, month, day)
    except ValueError:
        broken.append(errors.INVALID_DATE.key)

    if _clean(row, "category") not in CATEGORIES:
        broken.append(errors.INVALID_CATEGORY.key)

    if len(_clean(row, "description")) < MIN_DESCRIPTION_LENGTH:
        broken.append(errors.EMPTY_DESCRIPTION.key)

    if not PATIENT_ID_PATTERN.match(_clean(row, "patient_id")):
        broken.append(errors.MISSING_PATIENT_ID.key)

    status = _clean(row, "status")
    if status not in STATUSES:
        broken.append(errors.INVALID_STATUS.key)
    raw_score = _clean(row, "satisfaction_score")

    if not raw_score:
        if status == "CLOSED":
            broken.append(errors.CLOSED_WITHOUT_SCORE.key)
    else:
        try:
            score = int(raw_score)
        except ValueError:
            broken.append(errors.SCORE_OUT_OF_RANGE.key)
        else:
            if not MIN_SATISFACTION_SCORE <= score <= MAX_SATISFACTION_SCORE:
                broken.append(errors.SCORE_OUT_OF_RANGE.key)

    return broken


def analyze_rows(rows: Iterable[Mapping[str, Any]], source_name: str = "incidents.csv") -> AnalysisResult:
    total = 0
    invalid = 0
    rule_counts: Counter[str] = Counter()
    categories: Counter[str] = Counter()
    statuses: Counter[str] = Counter()
    countries: Counter[str] = Counter()
    scores: Counter[int] = Counter()
    closed = 0
    scored_closed = 0

    for row in rows:
        total += 1
        broken = _validate(row)
        if broken:
            invalid += 1
            rule_counts.update(broken)
            continue

        categories[_clean(row, "category")] += 1
        status = _clean(row, "status")
        statuses[status] += 1
        countries[_clean(row, "country")] += 1

        if status == "CLOSED":
            closed += 1
            raw_score = _clean(row, "satisfaction_score")
            if raw_score:
                scored_closed += 1
                scores[int(raw_score)] += 1

    valid = total - invalid
    average = round(
        sum(score * count for score, count in scores.items()) / scored_closed, 2
    ) if scored_closed else None

    return AnalysisResult(
        source_name=source_name,
        total_records=total,
        valid_records=valid,
        invalid_records=invalid,
        invalid_by_rule={
            rule.key: rule_counts.get(rule.key, 0)
            for rule in errors.RULES
            if rule_counts.get(rule.key, 0) > 0
        },
        by_category={name: categories.get(name, 0) for name in CATEGORIES},
        by_status={name: statuses.get(name, 0) for name in STATUSES},
        by_country={name: countries.get(name, 0) for name in COUNTRIES},
        closed_records=closed,
        scored_closed_records=scored_closed,
        average_satisfaction=average,
        satisfaction_distribution=dict(scores),
    )


def analyze_text(text: str, source_name: str = "incidents.csv") -> AnalysisResult:
    """Analyze CSV content already decoded to text."""
    if not text.strip():
        raise EmptyFileError("The file is empty. Upload a CSV with a header row and at least one record.")

    reader = csv.DictReader(io.StringIO(text))
    header: Sequence[str] | None = reader.fieldnames
    if not header:
        raise EmptyFileError("The file has no header row.")

    missing = [column for column in REQUIRED_COLUMNS if column not in header]
    if missing:
        raise InvalidFormatError(
            "The file is not a valid incident CSV. Missing required columns: "
            + ", ".join(missing)
        )

    return analyze_rows(reader, source_name=source_name)


def analyze_bytes(data: bytes, source_name: str = "incidents.csv") -> AnalysisResult:
    if not data.strip():
        raise EmptyFileError("The file is empty. Upload a CSV with a header row and at least one record.")
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise InvalidFormatError("The file is not valid UTF-8 text. Export it as a UTF-8 CSV.") from exc
    return analyze_text(text, source_name=source_name)


def analyze_file(path: str) -> AnalysisResult:
    try:
        with open(path, "rb") as handle:
            data = handle.read()
    except FileNotFoundError as exc:
        raise InvalidFormatError("The specified CSV file could not be found.") from exc
    except IsADirectoryError as exc:
        raise InvalidFormatError("The specified path is not a file.") from exc

    # Never echo a user-controlled filename: names can accidentally contain PHI.
    return analyze_bytes(data, source_name="CSV input")
