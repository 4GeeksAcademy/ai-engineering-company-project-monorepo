from __future__ import annotations

import csv
from collections import Counter
from dataclasses import dataclass
from io import StringIO
from pathlib import Path
from typing import Iterable

CSV_FIELDS = (
    "incident_id",
    "date",
    "location_id",
    "category",
    "description",
    "status",
    "customer_id",
    "satisfaction_score",
    "reporter_id",
)

VALID_CATEGORIES = (
    "CUSTOMER_COMPLAINT",
    "EQUIPMENT",
    "SUPPLY",
    "FOOD_QUALITY",
    "STAFF",
)

VALID_STATUSES = (
    "OPEN",
    "CLOSED",
    "DISCARDED",
)

VALID_LOCATION_IDS = tuple(
    [f"COL-{index:02d}" for index in range(1, 11)]
    + [f"FLA-{index:02d}" for index in range(1, 5)]
)

INVALID_REASON_LABELS = {
    "missing_location_id": "Missing location_id",
    "invalid_category": "Invalid or missing category",
    "empty_description": "Empty description",
    "missing_reporter_id": "Missing reporter_id",
    "closed_no_score": "Closed case, no score",
    "score_out_of_range": "Score out of range",
    "invalid_status": "Invalid status",
}

SCORE_LABELS = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
}


@dataclass(frozen=True)
class AnalysisResult:
    total_records: int
    valid_records: int
    invalid_records: int
    invalid_reasons: dict[str, int]
    category_counts: dict[str, int]
    status_counts: dict[str, int]
    scored_closed_cases: int
    total_closed_cases: int
    average_satisfaction: float
    score_counts: dict[int, int]


def analyze_csv_file(file_path: str | Path) -> AnalysisResult:
    path = Path(file_path)
    with path.open("r", encoding="utf-8", newline="") as handle:
        return analyze_csv_text(handle.read())


def analyze_csv_text(csv_text: str) -> AnalysisResult:
    reader = csv.DictReader(StringIO(csv_text))
    validate_headers(reader.fieldnames)
    return analyze_rows(reader)


def analyze_rows(rows: Iterable[dict[str, str]]) -> AnalysisResult:
    invalid_reasons = Counter({reason: 0 for reason in INVALID_REASON_LABELS})
    category_counts = Counter({category: 0 for category in VALID_CATEGORIES})
    status_counts = Counter({status: 0 for status in VALID_STATUSES})
    score_counts = Counter({score: 0 for score in SCORE_LABELS})

    total_records = 0
    valid_records = 0
    total_closed_cases = 0
    scored_closed_cases = 0
    weighted_score_sum = 0

    for row in rows:
        total_records += 1
        reasons, normalized_status, parsed_score = validate_row(row)
        if reasons:
            invalid_reasons.update(reasons)
            continue

        valid_records += 1
        category = normalize_cell(row.get("category"))
        status = normalized_status or ""
        category_counts[category] += 1
        status_counts[status] += 1

        if status == "CLOSED":
            total_closed_cases += 1
            if parsed_score is not None:
                scored_closed_cases += 1
                score_counts[parsed_score] += 1
                weighted_score_sum += parsed_score

    average_satisfaction = 0.0
    if scored_closed_cases:
        average_satisfaction = weighted_score_sum / scored_closed_cases

    return AnalysisResult(
        total_records=total_records,
        valid_records=valid_records,
        invalid_records=total_records - valid_records,
        invalid_reasons=dict(invalid_reasons),
        category_counts=dict(category_counts),
        status_counts=dict(status_counts),
        scored_closed_cases=scored_closed_cases,
        total_closed_cases=total_closed_cases,
        average_satisfaction=average_satisfaction,
        score_counts=dict(score_counts),
    )


def validate_row(row: dict[str, str]) -> tuple[list[str], str, int | None]:
    reasons: list[str] = []
    location_id = normalize_cell(row.get("location_id"))
    category = normalize_cell(row.get("category"))
    description = normalize_cell(row.get("description"))
    reporter_id = normalize_cell(row.get("reporter_id"))
    status = normalize_cell(row.get("status"))
    score_value = normalize_cell(row.get("satisfaction_score"))

    if location_id not in VALID_LOCATION_IDS:
        reasons.append("missing_location_id")

    if category not in VALID_CATEGORIES:
        reasons.append("invalid_category")

    if len(description) < 5:
        reasons.append("empty_description")

    if not reporter_id:
        reasons.append("missing_reporter_id")

    if status not in VALID_STATUSES:
        reasons.append("invalid_status")

    parsed_score: int | None = None
    if score_value:
        try:
            parsed_score = int(score_value)
        except ValueError:
            reasons.append("score_out_of_range")
        else:
            if parsed_score < 1 or parsed_score > 5:
                reasons.append("score_out_of_range")

    if status == "CLOSED" and not score_value:
        reasons.append("closed_no_score")

    return reasons, status, parsed_score


def render_console_report(result: AnalysisResult, source_file: str) -> str:
    lines = [
        "============================================================",
        "  BRASALAND - INCIDENT REPORT ANALYSIS",
        f"  Source file: {source_file}",
        "============================================================",
        "",
        f"TOTAL RECORDS IN FILE .......... {result.total_records}",
        f"  |- Valid records ................ {result.valid_records}",
        f"  '- Invalid / incomplete .......... {result.invalid_records}",
        "",
        "INVALID RECORDS BREAKDOWN",
    ]

    invalid_reason_keys = [
        "missing_location_id",
        "invalid_category",
        "empty_description",
        "missing_reporter_id",
        "closed_no_score",
        "score_out_of_range",
        "invalid_status",
    ]

    visible_invalid_reasons = [
        reason_key for reason_key in invalid_reason_keys if result.invalid_reasons.get(reason_key, 0) > 0
    ]

    for index, reason_key in enumerate(visible_invalid_reasons):
        branch = "  '-" if index == len(visible_invalid_reasons) - 1 else "  |-"
        label = INVALID_REASON_LABELS[reason_key]
        count = result.invalid_reasons[reason_key]
        lines.append(f"{branch} {label:.<28} {count}")

    lines.extend([
        "",
        "BREAKDOWN BY CATEGORY (valid records)",
    ])

    for index, category in enumerate(VALID_CATEGORIES):
        branch = "  '-" if index == len(VALID_CATEGORIES) - 1 else "  |-"
        count = result.category_counts[category]
        percentage = percentage_of(count, result.valid_records)
        lines.append(f"{branch} {category:.<29} {count:>2}  ({percentage:>4.1f}%)")

    lines.extend([
        "",
        "BREAKDOWN BY STATUS (valid records)",
    ])

    for index, status in enumerate(VALID_STATUSES):
        branch = "  '-" if index == len(VALID_STATUSES) - 1 else "  |-"
        count = result.status_counts[status]
        percentage = percentage_of(count, result.valid_records)
        lines.append(f"{branch} {status:.<35} {count:>2}  ({percentage:>4.1f}%)")

    lines.extend([
        "",
        "SATISFACTION INDEX (closed cases)",
        f"  Scored cases: {result.scored_closed_cases} of {result.total_closed_cases}",
        f"  Average score: {result.average_satisfaction:.2f} / 5.00",
    ])

    scores = list(SCORE_LABELS)
    for index, score in enumerate(scores):
        branch = "  '-" if index == len(scores) - 1 else "  |-"
        label = SCORE_LABELS[score]
        count = result.score_counts[score]
        lines.append(f"{branch} Score {score} ({label}) {'.' * max(1, 22 - len(label))} {count}")

    lines.append("")
    lines.append("============================================================")
    return "\n".join(lines)


def write_results_csv(result: AnalysisResult, output_path: str | Path) -> None:
    path = Path(output_path)
    rows = export_rows(result)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["metric", "value", "percentage"])
        writer.writeheader()
        writer.writerows(rows)


def export_rows(result: AnalysisResult) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    rows.extend(
        [
            csv_row("total_records", result.total_records),
            csv_row("valid_records", result.valid_records),
            csv_row("invalid_records", result.invalid_records),
        ]
    )

    for reason_key in INVALID_REASON_LABELS:
        rows.append(csv_row(f"invalid.{reason_key}", result.invalid_reasons[reason_key]))

    for category in VALID_CATEGORIES:
        rows.append(
            csv_row(
                f"category.{category}",
                result.category_counts[category],
                percentage_of(result.category_counts[category], result.valid_records),
            )
        )

    for status in VALID_STATUSES:
        rows.append(
            csv_row(
                f"status.{status}",
                result.status_counts[status],
                percentage_of(result.status_counts[status], result.valid_records),
            )
        )

    rows.extend(
        [
            csv_row("satisfaction.scored_closed_cases", result.scored_closed_cases),
            csv_row("satisfaction.total_closed_cases", result.total_closed_cases),
            csv_row("satisfaction.average_score", f"{result.average_satisfaction:.2f}"),
        ]
    )

    for score in SCORE_LABELS:
        rows.append(csv_row(f"satisfaction.score.{score}", result.score_counts[score]))

    return rows


def csv_row(metric: str, value: int | str, percentage: float | None = None) -> dict[str, str]:
    return {
        "metric": metric,
        "value": str(value),
        "percentage": "" if percentage is None else f"{percentage:.1f}",
    }


def percentage_of(count: int, total: int) -> float:
    if total == 0:
        return 0.0
    return (count / total) * 100


def normalize_cell(value: str | None) -> str:
    return (value or "").strip()


def validate_headers(fieldnames: list[str] | None) -> None:
    if fieldnames is None:
        raise ValueError("The CSV file is missing a header row.")

    normalized_fieldnames = [normalize_cell(fieldname) for fieldname in fieldnames]
    if tuple(normalized_fieldnames) != CSV_FIELDS:
        raise ValueError(
            "Invalid CSV headers. Expected: " + ", ".join(CSV_FIELDS)
        )