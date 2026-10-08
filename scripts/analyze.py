#!/usr/bin/env python3
"""Validate and summarize TrackFlow incident CSV files without exposing PII."""

from __future__ import annotations

import argparse
import csv
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Iterable

FIELDS = (
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
)
COUNTRIES = ("US", "ES")
CUSTOMER_TYPES = ("B2B", "B2C")
STATUSES = ("OPEN", "CLOSED", "DISCARDED")
CATEGORIES = (
    "LOST_PARCEL",
    "DELAYED_DELIVERY",
    "WRONG_ADDRESS",
    "RETURN_REQUEST",
    "DAMAGE",
)
CARRIERS = {
    "US": {"UPS", "FEDEX", "DHL_US"},
    "ES": {"MRW", "SEUR", "DHL_ES", "LOCAL_ES"},
}
INVALID_REASONS = {
    "invalid_incident_id": "Invalid incident ID",
    "invalid_date": "Invalid or missing date",
    "invalid_country": "Invalid or missing country",
    "invalid_customer_type": "Invalid or missing customer type",
    "invalid_tracking_number": "Invalid tracking number",
    "invalid_carrier": "Carrier/country mismatch",
    "invalid_category": "Invalid or missing category",
    "invalid_description": "Invalid or missing description",
    "invalid_status": "Invalid or missing status",
    "invalid_email": "Invalid or missing email",
    "closed_without_score": "Closed incident, no score",
    "invalid_satisfaction_score": "Invalid satisfaction score",
}
INCIDENT_ID_PATTERN = re.compile(r"^TRF-\d{6}$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


@dataclass
class Analysis:
    total: int = 0
    valid: int = 0
    invalid: int = 0
    errors: Counter[str] = field(default_factory=Counter)
    categories: Counter[str] = field(default_factory=Counter)
    statuses: Counter[str] = field(default_factory=Counter)
    countries: Counter[str] = field(default_factory=Counter)
    satisfaction_scores: Counter[int] = field(default_factory=Counter)

    @property
    def closed_scored(self) -> int:
        return sum(self.satisfaction_scores.values())

    @property
    def average_satisfaction(self) -> float | None:
        if not self.closed_scored:
            return None
        return sum(score * count for score, count in self.satisfaction_scores.items()) / self.closed_scored

    def export_rows(self) -> Iterable[tuple[str, str]]:
        yield "Total records", str(self.total)
        yield "Valid records", str(self.valid)
        yield "Invalid records", str(self.invalid)
        for key, label in INVALID_REASONS.items():
            yield f"Invalid - {label}", str(self.errors[key])
        for category in CATEGORIES:
            yield f"Category - {category}", str(self.categories[category])
        for status in STATUSES:
            yield f"Status - {status}", str(self.statuses[status])
        for country in COUNTRIES:
            yield f"Country - {country}", str(self.countries[country])
        yield "Scored closed incidents", str(self.closed_scored)
        yield "Average satisfaction", (
            f"{self.average_satisfaction:.2f}" if self.average_satisfaction is not None else "N/A"
        )
        for score in range(1, 6):
            yield f"Satisfaction score - {score}", str(self.satisfaction_scores[score])


def _record_errors(row: dict[str, str | None]) -> tuple[list[str], int | None]:
    errors: list[str] = []
    incident_id = (row.get("incident_id") or "").strip()
    incident_date = (row.get("date") or "").strip()
    country = (row.get("country") or "").strip()
    customer_type = (row.get("customer_type") or "").strip()
    tracking_number = (row.get("tracking_number") or "").strip()
    carrier = (row.get("carrier") or "").strip()
    category = (row.get("category") or "").strip()
    description = (row.get("description") or "").strip()
    status = (row.get("status") or "").strip()
    email = (row.get("customer_email") or "").strip()
    score_text = (row.get("satisfaction_score") or "").strip()

    if not INCIDENT_ID_PATTERN.fullmatch(incident_id):
        errors.append("invalid_incident_id")
    if not DATE_PATTERN.fullmatch(incident_date):
        errors.append("invalid_date")
    else:
        try:
            date.fromisoformat(incident_date)
        except ValueError:
            errors.append("invalid_date")
    if country not in COUNTRIES:
        errors.append("invalid_country")
    if customer_type not in CUSTOMER_TYPES:
        errors.append("invalid_customer_type")
    if len(tracking_number) < 8:
        errors.append("invalid_tracking_number")
    if country not in CARRIERS or carrier not in CARRIERS[country]:
        errors.append("invalid_carrier")
    if category not in CATEGORIES:
        errors.append("invalid_category")
    if len(description) < 5:
        errors.append("invalid_description")
    if status not in STATUSES:
        errors.append("invalid_status")
    if not EMAIL_PATTERN.fullmatch(email):
        errors.append("invalid_email")

    score: int | None = None
    if status == "CLOSED" and not score_text:
        errors.append("closed_without_score")
    elif score_text:
        try:
            parsed_score = int(score_text)
        except ValueError:
            errors.append("invalid_satisfaction_score")
        else:
            if parsed_score < 1 or parsed_score > 5:
                errors.append("invalid_satisfaction_score")
            else:
                score = parsed_score

    return errors, score


def analyze_csv(path: Path) -> Analysis:
    analysis = Analysis()
    with path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None:
            raise ValueError("CSV is empty or has no header.")
        missing_columns = [field_name for field_name in FIELDS if field_name not in reader.fieldnames]
        if missing_columns:
            raise ValueError("Missing required columns: " + ", ".join(missing_columns))

        for row in reader:
            if None in row:
                raise ValueError(f"Row {reader.line_num} has more values than the header.")
            analysis.total += 1
            errors, score = _record_errors(row)
            if errors:
                analysis.invalid += 1
                analysis.errors.update(errors)
                continue

            analysis.valid += 1
            category = (row["category"] or "").strip()
            status = (row["status"] or "").strip()
            country = (row["country"] or "").strip()
            analysis.categories[category] += 1
            analysis.statuses[status] += 1
            analysis.countries[country] += 1
            if status == "CLOSED" and score is not None:
                analysis.satisfaction_scores[score] += 1

    return analysis


def _print_breakdown(title: str, counts: Counter, order: Iterable[str], total: int) -> None:
    print(f"\n{title}")
    for index, name in enumerate(order):
        count = counts[name]
        percentage = count / total * 100 if total else 0.0
        branch = "└─" if index == len(order) - 1 else "├─"
        print(f"  {branch} {name:<24} {count:>3}  ({percentage:>4.1f}%)")


def print_summary(analysis: Analysis, source_name: str) -> None:
    print("=" * 60)
    print("  TRACKFLOW — INCIDENT REPORT ANALYSIS")
    print(f"  Source file: {source_name}")
    print("=" * 60)
    print(f"\nTOTAL RECORDS IN FILE .......... {analysis.total:>3}")
    print(f"  ├─ Valid records .............. {analysis.valid:>3}")
    print(f"  └─ Invalid / incomplete ........ {analysis.invalid:>3}")

    print("\nINVALID RECORDS BREAKDOWN")
    visible_reasons = (
        "invalid_tracking_number",
        "invalid_carrier",
        "invalid_category",
        "invalid_email",
        "closed_without_score",
    )
    for index, key in enumerate(visible_reasons):
        branch = "└─" if index == len(visible_reasons) - 1 else "├─"
        label = INVALID_REASONS[key]
        print(f"  {branch} {label:<31} {analysis.errors[key]:>3}")
    for key, label in INVALID_REASONS.items():
        if key not in visible_reasons and analysis.errors[key]:
            print(f"  ├─ {label:<31} {analysis.errors[key]:>3}")

    _print_breakdown("BREAKDOWN BY CATEGORY (valid records)", analysis.categories, CATEGORIES, analysis.valid)
    _print_breakdown("BREAKDOWN BY STATUS (valid records)", analysis.statuses, STATUSES, analysis.valid)
    _print_breakdown("BREAKDOWN BY COUNTRY (valid records)", analysis.countries, COUNTRIES, analysis.valid)

    closed_count = analysis.statuses["CLOSED"]
    average = analysis.average_satisfaction
    print("\nSATISFACTION INDEX (closed incidents)")
    print(f"  Scored incidents: {analysis.closed_scored} of {closed_count}")
    print(f"  Average score: {average:.2f} / 5.00" if average is not None else "  Average score: N/A")
    score_labels = {
        1: "Very dissatisfied",
        2: "Dissatisfied",
        3: "Neutral",
        4: "Satisfied",
        5: "Very satisfied",
    }
    for score, label in score_labels.items():
        print(f"  ├─ Score {score} ({label}) ........ {analysis.satisfaction_scores[score]}")
    print("\n" + "=" * 60)


def export_csv(analysis: Analysis, path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(("metric", "value"))
        writer.writerows(analysis.export_rows())


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze TrackFlow incident records from CSV.")
    parser.add_argument("csv_path", type=Path, help="Path to the incident CSV")
    args = parser.parse_args()

    try:
        analysis = analyze_csv(args.csv_path)
    except (OSError, UnicodeError, csv.Error, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print_summary(analysis, args.csv_path.name)
    try:
        answer = input("¿Deseas exportar los resultados a CSV? [s / n] ").strip().lower()
    except EOFError:
        answer = "n"
    if answer in {"s", "y"}:
        output_path = Path("results.csv")
        try:
            export_csv(analysis, output_path)
        except OSError as error:
            print(f"Error exporting results: {error}", file=sys.stderr)
            return 1
        print(f"Results exported to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())