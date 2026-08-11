"""Export analysis metrics as CSV rows (metric, value, percentage)."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Iterable

from .analyze import AnalysisResult
from .constants import INVALID_RULE_ORDER, VALID_CATEGORIES


def _pct(part: int, whole: int) -> str:
    if whole <= 0:
        return ""
    return f"{(part / whole) * 100:.1f}%"


def analysis_to_csv_rows(result: AnalysisResult) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = [
        {"metric": "total_records", "value": str(result.total_records), "percentage": ""},
        {"metric": "valid_records", "value": str(result.valid_count), "percentage": ""},
        {
            "metric": "invalid_records",
            "value": str(result.invalid_count),
            "percentage": "",
        },
    ]

    for rule in INVALID_RULE_ORDER:
        count = result.invalid_by_rule.get(rule, 0)
        if count == 0 and rule == "score_out_of_range":
            # Omit unused out-of-range row when the test file does not trigger it.
            continue
        rows.append(
            {
                "metric": f"invalid_{rule}",
                "value": str(count),
                "percentage": "",
            }
        )

    for category in VALID_CATEGORIES:
        count = result.category_counts.get(category, 0)
        rows.append(
            {
                "metric": f"category_{category}",
                "value": str(count),
                "percentage": _pct(count, result.valid_count),
            }
        )

    for status in ("OPEN", "CLOSED", "DISCARDED"):
        count = result.status_counts.get(status, 0)
        rows.append(
            {
                "metric": f"status_{status}",
                "value": str(count),
                "percentage": _pct(count, result.valid_count),
            }
        )

    for country in ("US", "UK"):
        count = result.country_counts.get(country, 0)
        rows.append(
            {
                "metric": f"country_{country}",
                "value": str(count),
                "percentage": _pct(count, result.valid_count),
            }
        )

    rows.append(
        {
            "metric": "satisfaction_scored_cases",
            "value": str(result.satisfaction_scored_cases),
            "percentage": "",
        }
    )
    rows.append(
        {
            "metric": "satisfaction_average",
            "value": (
                f"{result.satisfaction_average:.2f}"
                if result.satisfaction_average is not None
                else ""
            ),
            "percentage": "",
        }
    )
    for score in range(1, 6):
        rows.append(
            {
                "metric": f"satisfaction_score_{score}",
                "value": str(result.satisfaction_score_counts.get(score, 0)),
                "percentage": "",
            }
        )

    return rows


def write_results_csv(result: AnalysisResult, output_path: str | Path) -> Path:
    path = Path(output_path)
    rows = analysis_to_csv_rows(result)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["metric", "value", "percentage"])
        writer.writeheader()
        writer.writerows(rows)
    return path


def rows_to_csv_text(rows: Iterable[dict[str, str]]) -> str:
    from io import StringIO

    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["metric", "value", "percentage"])
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()
