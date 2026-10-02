"""Safe console and CSV rendering for incident analysis results."""

from __future__ import annotations

import csv
from io import StringIO
from typing import TextIO

from .analyzer import AnalysisResult
from .schema import SATISFACTION_LABELS


def _line(label: str, value: str | int, width: int = 31) -> str:
    return f"  {label:<{width}} {value}"


def render_summary(result: AnalysisResult) -> str:
    lines = [
        "=" * 60,
        "  HEALTHCORE — PATIENT INCIDENT REPORT ANALYSIS",
        f"  Source file: {result.source_name}",
        "=" * 60,
        "",
        _line("TOTAL RECORDS IN FILE", result.total_records),
        _line("├─ Valid records", result.valid_records),
        _line("└─ Invalid / incomplete", result.invalid_records),
        "",
        "INVALID RECORDS BREAKDOWN",
    ]
    if result.invalid_by_rule:
        for key, count in result.invalid_by_rule.items():
            from .errors import RULE_LABELS
            lines.append(_line(f"├─ {RULE_LABELS[key]}", count))
    else:
        lines.append(_line("No invalid records", 0))

    lines.extend(["", "BREAKDOWN BY CATEGORY (valid records)"])
    for category, count in result.by_category.items():
        lines.append(_line(f"├─ {category}", f"{count} ({result.percentage_of_valid(count):.1f}%)"))

    lines.extend(["", "BREAKDOWN BY STATUS (valid records)"])
    for status, count in result.by_status.items():
        lines.append(_line(f"├─ {status}", f"{count} ({result.percentage_of_valid(count):.1f}%)"))

    lines.extend(["", "BREAKDOWN BY COUNTRY (valid records)"])
    for country, count in result.by_country.items():
        lines.append(_line(f"├─ {country}", f"{count} ({result.percentage_of_valid(count):.1f}%)"))

    lines.extend([
        "",
        "SATISFACTION INDEX (closed cases)",
        _line("Scored cases", f"{result.scored_closed_records} of {result.closed_records}"),
        _line("Average score", f"{result.average_satisfaction:.2f} / 5.00" if result.average_satisfaction is not None else "N/A"),
    ])
    for score, label in SATISFACTION_LABELS.items():
        lines.append(_line(f"├─ Score {score} ({label})", result.satisfaction_distribution.get(score, 0)))
    lines.extend(["", "=" * 60])
    return "\n".join(lines)


def results_csv(result: AnalysisResult) -> str:
    """Return one row per metric with no source records or patient data."""
    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(("metric", "value", "percentage"))
    writer.writerow(("total_records", result.total_records, ""))
    writer.writerow(("valid_records", result.valid_records, ""))
    writer.writerow(("invalid_records", result.invalid_records, ""))
    for key, count in result.invalid_by_rule.items():
        writer.writerow((f"invalid:{key}", count, ""))
    for key, count in result.by_category.items():
        writer.writerow((f"category:{key}", count, f"{result.percentage_of_valid(count):.1f}%"))
    for key, count in result.by_status.items():
        writer.writerow((f"status:{key}", count, f"{result.percentage_of_valid(count):.1f}%"))
    for key, count in result.by_country.items():
        writer.writerow((f"country:{key}", count, f"{result.percentage_of_valid(count):.1f}%"))
    writer.writerow(("closed_cases", result.closed_records, ""))
    writer.writerow(("closed_cases_with_score", result.scored_closed_records, ""))
    writer.writerow(("average_satisfaction", "" if result.average_satisfaction is None else f"{result.average_satisfaction:.2f}", ""))
    for score, count in result.satisfaction_distribution.items():
        writer.writerow((f"satisfaction_score:{score}", count, ""))
    return output.getvalue()


def write_results_csv(result: AnalysisResult, destination: TextIO) -> None:
    destination.write(results_csv(result))
