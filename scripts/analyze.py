#!/usr/bin/env python3
from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
API_DIR = ROOT_DIR / "services" / "api"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from analyzer import analyze_incidents, build_export_rows, parse_csv_file  # noqa: E402


def _line(label: str, value: str) -> str:
    dots = "." * max(2, 34 - len(label))
    return f"{label} {dots} {value}"


def _section_with_percent(label: str, count: int, pct: float) -> str:
    dots = "." * max(2, 32 - len(label))
    return f"  {label} {dots} {count:>3}  ({pct:>4.1f}%)"


def _print_report(source_file: str, result: dict) -> None:
    print("=" * 60)
    print("  TRACKFLOW - INCIDENT REPORT ANALYSIS")
    print(f"  Source file: {source_file}")
    print("=" * 60)
    print()

    print(_line("TOTAL RECORDS IN FILE", str(result["total_records"])))
    print(_line("  |- Valid records", str(result["valid_records"])))
    print(_line("  '- Invalid / incomplete", str(result["invalid_records"])))
    print()

    invalid = result["primary_invalid_breakdown"]
    print("INVALID RECORDS BREAKDOWN")
    print(_line("  |- Invalid tracking number", str(invalid["invalid_tracking"])))
    print(_line("  |- Carrier/country mismatch", str(invalid["carrier_country_mismatch"])))
    print(_line("  |- Invalid or missing category", str(invalid["invalid_category"])))
    print(_line("  |- Invalid or missing email", str(invalid["invalid_email"])))
    print(_line("  '- Closed incident, no score", str(invalid["closed_no_score"])))
    print()

    print("BREAKDOWN BY CATEGORY (valid records)")
    categories = [
        "LOST_PARCEL",
        "DELAYED_DELIVERY",
        "WRONG_ADDRESS",
        "RETURN_REQUEST",
        "DAMAGE",
    ]
    for index, category in enumerate(categories):
        branch = "|-" if index < len(categories) - 1 else "'-"
        label = f"{branch} {category}"
        print(
            _section_with_percent(
                label,
                result["by_category"][category],
                result["percentages"]["category"][category],
            )
        )
    print()

    print("BREAKDOWN BY STATUS (valid records)")
    statuses = ["OPEN", "CLOSED", "DISCARDED"]
    for index, status in enumerate(statuses):
        branch = "|-" if index < len(statuses) - 1 else "'-"
        label = f"{branch} {status}"
        print(
            _section_with_percent(
                label,
                result["by_status"][status],
                result["percentages"]["status"][status],
            )
        )
    print()

    print("BREAKDOWN BY COUNTRY (valid records)")
    countries = ["US", "ES"]
    for index, country in enumerate(countries):
        branch = "|-" if index < len(countries) - 1 else "'-"
        label = f"{branch} {country}"
        print(
            _section_with_percent(
                label,
                result["by_country"][country],
                result["percentages"]["country"][country],
            )
        )
    print()

    satisfaction = result["satisfaction"]
    distribution = satisfaction["distribution"]

    print("SATISFACTION INDEX (closed incidents)")
    print(f"  Scored incidents: {satisfaction['scored_incidents']} of {satisfaction['total_closed']}")
    print(f"  Average score: {satisfaction['average']:.2f} / 5.00")
    print(_line("  |- Score 1 (Very dissatisfied)", str(distribution["1"])))
    print(_line("  |- Score 2 (Dissatisfied)", str(distribution["2"])))
    print(_line("  |- Score 3 (Neutral)", str(distribution["3"])))
    print(_line("  |- Score 4 (Satisfied)", str(distribution["4"])))
    print(_line("  '- Score 5 (Very satisfied)", str(distribution["5"])))
    print()

    print("=" * 60)


def _export_results(result: dict, target_path: Path) -> None:
    rows = build_export_rows(result)
    with target_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerows(rows)


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/analyze.py <csv_file_path>")
        return 1

    source_path = Path(sys.argv[1])
    if not source_path.exists() or not source_path.is_file():
        print(f"Error: file not found -> {source_path}")
        return 1

    try:
        rows = parse_csv_file(str(source_path))
        result = analyze_incidents(rows)
    except Exception as exc:  # noqa: BLE001
        print(f"Error: {exc}")
        return 1

    _print_report(source_path.name, result)
    decision = input("Export results to CSV? [y / n]: ").strip().lower()

    if decision in {"y", "s"}:
        output_path = Path("results.csv")
        _export_results(result, output_path)
        print(f"Results exported to {output_path.resolve()}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
