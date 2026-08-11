#!/usr/bin/env python3
"""TrackFlow incident CSV analyzer (Phase 1)."""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

EXPECTED_COLUMNS = [
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

VALID_COUNTRIES = {"US", "ES"}
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

CATEGORY_ORDER = [
    "LOST_PARCEL",
    "DELAYED_DELIVERY",
    "WRONG_ADDRESS",
    "RETURN_REQUEST",
    "DAMAGE",
]
STATUS_ORDER = ["OPEN", "CLOSED", "DISCARDED"]
COUNTRY_ORDER = ["US", "ES"]
SATISFACTION_ORDER = [1, 2, 3, 4, 5]

ERROR_KEYS_ORDER = [
    "tracking_number faltante o invalido",
    "carrier invalido para el pais",
    "category faltante o invalida",
    "email faltante o invalido",
    "CLOSED sin satisfaction_score",
    "country faltante o invalido",
    "description vacia o invalida",
    "status faltante o invalido",
    "satisfaction_score fuera de rango",
]


@dataclass
class AnalysisResult:
    source_file: str
    total_records: int
    valid_records: int
    invalid_records: int
    invalid_breakdown: Dict[str, int]
    category_counts: Dict[str, int]
    status_counts: Dict[str, int]
    country_counts: Dict[str, int]
    satisfaction_counts: Dict[int, int]
    satisfaction_average: float
    closed_valid_total: int
    closed_scored_total: int


class CsvValidationError(Exception):
    """Raised when CSV-level validation fails before row processing."""


def load_csv_rows(csv_path: Path) -> Tuple[List[str], List[Dict[str, str]]]:
    if not csv_path.exists() or not csv_path.is_file():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        header = reader.fieldnames
        if not header:
            raise CsvValidationError("CSV is empty or missing header.")
        if header != EXPECTED_COLUMNS:
            raise CsvValidationError("CSV columns do not match expected schema.")

        rows = []
        for row in reader:
            normalized = {k: (v.strip() if isinstance(v, str) else "") for k, v in row.items()}
            rows.append(normalized)

    return header, rows


def _validate_satisfaction(raw_score: str, status: str) -> Tuple[bool, int | None, str | None]:
    if status == "CLOSED" and raw_score == "":
        return False, None, "CLOSED sin satisfaction_score"

    if raw_score == "":
        return True, None, None

    try:
        value = int(raw_score)
    except ValueError:
        return False, None, "satisfaction_score fuera de rango"

    if value < 1 or value > 5:
        return False, None, "satisfaction_score fuera de rango"

    return True, value, None


def validate_record(row: Dict[str, str]) -> Tuple[bool, str | None, int | None]:
    country = row["country"]
    carrier = row["carrier"]
    category = row["category"]
    status = row["status"]
    tracking_number = row["tracking_number"]
    description = row["description"]
    customer_email = row["customer_email"]
    raw_score = row["satisfaction_score"]

    if country not in VALID_COUNTRIES:
        return False, "country faltante o invalido", None

    if carrier == "" or carrier not in VALID_CARRIERS_BY_COUNTRY[country]:
        return False, "carrier invalido para el pais", None

    if tracking_number == "" or len(tracking_number) < 8:
        return False, "tracking_number faltante o invalido", None

    if category not in VALID_CATEGORIES:
        return False, "category faltante o invalida", None

    if description == "" or len(description) < 5:
        return False, "description vacia o invalida", None

    if customer_email == "" or "@" not in customer_email:
        return False, "email faltante o invalido", None

    if status not in VALID_STATUSES:
        return False, "status faltante o invalido", None

    ok_score, parsed_score, score_error = _validate_satisfaction(raw_score, status)
    if not ok_score:
        return False, score_error, None

    return True, None, parsed_score


def analyze_rows(rows: List[Dict[str, str]], source_file: str) -> AnalysisResult:
    invalid_breakdown = {k: 0 for k in ERROR_KEYS_ORDER}
    category_counts = {k: 0 for k in CATEGORY_ORDER}
    status_counts = {k: 0 for k in STATUS_ORDER}
    country_counts = {k: 0 for k in COUNTRY_ORDER}
    satisfaction_counts = {k: 0 for k in SATISFACTION_ORDER}

    valid_records = 0
    invalid_records = 0
    closed_valid_total = 0
    closed_scored_total = 0
    score_sum = 0

    for row in rows:
        is_valid, error_key, parsed_score = validate_record(row)
        if not is_valid:
            invalid_records += 1
            if error_key is not None:
                invalid_breakdown[error_key] = invalid_breakdown.get(error_key, 0) + 1
            continue

        valid_records += 1

        category_counts[row["category"]] += 1
        status_counts[row["status"]] += 1
        country_counts[row["country"]] += 1

        if row["status"] == "CLOSED":
            closed_valid_total += 1
            if parsed_score is not None:
                closed_scored_total += 1
                satisfaction_counts[parsed_score] += 1
                score_sum += parsed_score

    avg = (score_sum / closed_scored_total) if closed_scored_total else 0.0

    return AnalysisResult(
        source_file=source_file,
        total_records=len(rows),
        valid_records=valid_records,
        invalid_records=invalid_records,
        invalid_breakdown=invalid_breakdown,
        category_counts=category_counts,
        status_counts=status_counts,
        country_counts=country_counts,
        satisfaction_counts=satisfaction_counts,
        satisfaction_average=avg,
        closed_valid_total=closed_valid_total,
        closed_scored_total=closed_scored_total,
    )


def _pct(count: int, total: int) -> float:
    return (count / total * 100) if total else 0.0


def build_report_lines(result: AnalysisResult) -> List[str]:
    lines: List[str] = []
    lines.append("=" * 60)
    lines.append("  TRACKFLOW - INCIDENT REPORT ANALYSIS")
    lines.append(f"  Source file: {result.source_file}")
    lines.append("=" * 60)
    lines.append("")
    lines.append(f"TOTAL RECORDS IN FILE .......... {result.total_records}")
    lines.append(f"  - Valid records .............. {result.valid_records}")
    lines.append(f"  - Invalid / incomplete ....... {result.invalid_records}")
    lines.append("")
    lines.append("INVALID RECORDS BREAKDOWN")
    lines.append(
        f"  - Invalid tracking number ..... {result.invalid_breakdown.get('tracking_number faltante o invalido', 0)}"
    )
    lines.append(
        f"  - Carrier/country mismatch .... {result.invalid_breakdown.get('carrier invalido para el pais', 0)}"
    )
    lines.append(
        f"  - Invalid/missing category .... {result.invalid_breakdown.get('category faltante o invalida', 0)}"
    )
    lines.append(
        f"  - Invalid/missing email ....... {result.invalid_breakdown.get('email faltante o invalido', 0)}"
    )
    lines.append(
        f"  - Closed incident, no score ... {result.invalid_breakdown.get('CLOSED sin satisfaction_score', 0)}"
    )

    extra_invalid = [
        "country faltante o invalido",
        "description vacia o invalida",
        "status faltante o invalido",
        "satisfaction_score fuera de rango",
    ]
    if any(result.invalid_breakdown.get(k, 0) > 0 for k in extra_invalid):
        lines.append(
            f"  - Country missing/invalid ..... {result.invalid_breakdown.get('country faltante o invalido', 0)}"
        )
        lines.append(
            f"  - Description invalid ......... {result.invalid_breakdown.get('description vacia o invalida', 0)}"
        )
        lines.append(
            f"  - Status missing/invalid ...... {result.invalid_breakdown.get('status faltante o invalido', 0)}"
        )
        lines.append(
            f"  - Score out of range .......... {result.invalid_breakdown.get('satisfaction_score fuera de rango', 0)}"
        )

    lines.append("")
    lines.append("BREAKDOWN BY CATEGORY (valid records)")
    for category in CATEGORY_ORDER:
        count = result.category_counts[category]
        lines.append(
            f"  - {category:<20} {count:>3}  ({_pct(count, result.valid_records):>4.1f}%)"
        )

    lines.append("")
    lines.append("BREAKDOWN BY STATUS (valid records)")
    for status in STATUS_ORDER:
        count = result.status_counts[status]
        lines.append(
            f"  - {status:<20} {count:>3}  ({_pct(count, result.valid_records):>4.1f}%)"
        )

    lines.append("")
    lines.append("BREAKDOWN BY COUNTRY (valid records)")
    for country in COUNTRY_ORDER:
        count = result.country_counts[country]
        lines.append(
            f"  - {country:<20} {count:>3}  ({_pct(count, result.valid_records):>4.1f}%)"
        )

    lines.append("")
    lines.append("SATISFACTION INDEX (closed incidents)")
    lines.append(
        f"  Scored incidents: {result.closed_scored_total} of {result.closed_valid_total}"
    )
    lines.append(f"  Average score: {result.satisfaction_average:.2f} / 5.00")
    for score in SATISFACTION_ORDER:
        lines.append(f"  - Score {score} ................. {result.satisfaction_counts[score]}")

    lines.append("")
    lines.append("=" * 60)
    return lines


def print_report(result: AnalysisResult) -> None:
    for line in build_report_lines(result):
        print(line)


def build_results_rows(result: AnalysisResult) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []

    rows.append({"section": "total", "metric": "total_records", "value": str(result.total_records), "percentage": ""})
    rows.append({"section": "total", "metric": "valid_records", "value": str(result.valid_records), "percentage": ""})
    rows.append({"section": "total", "metric": "invalid_records", "value": str(result.invalid_records), "percentage": ""})

    for key in ERROR_KEYS_ORDER:
        if result.invalid_breakdown.get(key, 0) > 0:
            rows.append({
                "section": "invalid_breakdown",
                "metric": key,
                "value": str(result.invalid_breakdown[key]),
                "percentage": "",
            })

    for category in CATEGORY_ORDER:
        count = result.category_counts[category]
        rows.append({
            "section": "category",
            "metric": category,
            "value": str(count),
            "percentage": f"{_pct(count, result.valid_records):.1f}",
        })

    for status in STATUS_ORDER:
        count = result.status_counts[status]
        rows.append({
            "section": "status",
            "metric": status,
            "value": str(count),
            "percentage": f"{_pct(count, result.valid_records):.1f}",
        })

    for country in COUNTRY_ORDER:
        count = result.country_counts[country]
        rows.append({
            "section": "country",
            "metric": country,
            "value": str(count),
            "percentage": f"{_pct(count, result.valid_records):.1f}",
        })

    rows.append({
        "section": "satisfaction",
        "metric": "scored_incidents",
        "value": str(result.closed_scored_total),
        "percentage": "",
    })
    rows.append({
        "section": "satisfaction",
        "metric": "closed_valid_total",
        "value": str(result.closed_valid_total),
        "percentage": "",
    })
    rows.append({
        "section": "satisfaction",
        "metric": "average_score",
        "value": f"{result.satisfaction_average:.2f}",
        "percentage": "",
    })

    for score in SATISFACTION_ORDER:
        rows.append({
            "section": "satisfaction_distribution",
            "metric": f"score_{score}",
            "value": str(result.satisfaction_counts[score]),
            "percentage": "",
        })

    return rows


def export_results_csv(result: AnalysisResult, output_path: Path) -> None:
    rows = build_results_rows(result)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["section", "metric", "value", "percentage"])
        writer.writeheader()
        writer.writerows(rows)


def run_analysis(csv_path: Path) -> AnalysisResult:
    _, rows = load_csv_rows(csv_path)
    return analyze_rows(rows=rows, source_file=csv_path.name)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze TrackFlow incidents CSV")
    parser.add_argument("csv_path", help="Path to incidents CSV file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    csv_path = Path(args.csv_path)

    try:
        result = run_analysis(csv_path)
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}")
        return 1
    except CsvValidationError as exc:
        print(f"ERROR: {exc}")
        return 1
    except UnicodeDecodeError:
        print("ERROR: CSV file is not valid UTF-8.")
        return 1

    print_report(result)
    answer = input("Export results to CSV? [y / n]: ").strip().lower()
    if answer == "y":
        export_results_csv(result, Path("results.csv"))
        print("results.csv exported.")
    else:
        print("Export skipped.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
