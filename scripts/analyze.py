"""Command-line interface for the Nexova incident report analyzer.

Usage: python analyze.py incidents-nexova.csv
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from incident_analysis import (
    CORE_RULES,
    PROBLEM_LABELS,
    RULE_LABELS,
    SCORE_LABELS,
    AnalysisResult,
    CsvFormatError,
    analyze_csv_file,
    write_results_csv,
)

WIDTH = 60
LABEL_WIDTH = 42
RESULTS_FILE = "results.csv"


def _pct(value: int, total: int) -> str:
    return f"{value / total * 100:.1f}%" if total else "0.0%"


def _branch(index: int, size: int) -> str:
    return "└─" if index == size - 1 else "├─"


def _line(index: int, size: int, label: str, value: object, suffix: str = "") -> str:
    dots = "." * max(3, LABEL_WIDTH - len(label))
    return f"  {_branch(index, size)} {label} {dots} {value:>3}{suffix}"


def _print_counts(title: str, counts: dict[str, int], total: int) -> None:
    print(f"\n{title}")
    for index, (key, count) in enumerate(counts.items()):
        print(_line(index, len(counts), key, count, f"  ({_pct(count, total)})"))


def print_report(result: AnalysisResult, source: str) -> None:
    print("=" * WIDTH)
    print("  NEXOVA — SUPPORT TICKET ANALYSIS")
    print(f"  Source file: {source}")
    print("=" * WIDTH)

    print(f"\nTOTAL RECORDS IN FILE .......... {result.total_records}")
    print(_line(0, 2, "Valid records", result.valid_records))
    print(_line(1, 2, "Invalid / incomplete", result.invalid_records))

    print("\nINVALID RECORDS BREAKDOWN")
    rules = {rule: result.invalid_breakdown.get(rule, 0) for rule in CORE_RULES}
    rules.update(result.invalid_breakdown)
    for index, (rule, count) in enumerate(rules.items()):
        print(_line(index, len(rules), RULE_LABELS[rule], count))

    if result.invalid_by_field:
        print("\nINVALID RECORDS BY FIELD AND PROBLEM TYPE")
        problems = [
            (f"{field}: {PROBLEM_LABELS[kind]}", count)
            for field, kinds in result.invalid_by_field.items()
            for kind, count in kinds.items()
        ]
        for index, (label, count) in enumerate(problems):
            print(_line(index, len(problems), label, count))
    print("  (Invalid records are excluded from the metrics below.)")

    _print_counts("BREAKDOWN BY CATEGORY (valid records)", result.by_category, result.valid_records)
    _print_counts("BREAKDOWN BY STATUS (valid records)", result.by_status, result.valid_records)

    print("\nSATISFACTION INDEX (closed tickets)")
    print(f"  Scored tickets: {result.scored_tickets} of {result.closed_tickets}")
    average = "N/A" if result.average_score is None else f"{result.average_score:.2f} / 5.00"
    print(f"  Average score: {average}")
    for index, (score, count) in enumerate(result.score_breakdown.items()):
        print(_line(index, len(SCORE_LABELS), f"Score {score} ({SCORE_LABELS[score]})", count))
    print("\n" + "=" * WIDTH)


def ask_export(result: AnalysisResult) -> None:
    try:
        answer = input("¿Deseas exportar los resultados a CSV? [s/n]: ").strip().lower()
    except EOFError:
        answer = ""
    if answer in {"s", "si", "sí", "y", "yes"}:
        with Path(RESULTS_FILE).open("w", encoding="utf-8", newline="") as target:
            write_results_csv(result, target)
        print(f"Resultados exportados a {Path(RESULTS_FILE).resolve()}")
    else:
        print("No se exportaron resultados.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze a Nexova support-ticket CSV")
    parser.add_argument("csv_path", help="Path to the incidents CSV (e.g. incidents-nexova.csv)")
    args = parser.parse_args()
    path = Path(args.csv_path)
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as source:
            result = analyze_csv_file(source)
    except FileNotFoundError:
        print(f"Error: file not found: {path}", file=sys.stderr)
        return 1
    except UnicodeDecodeError:
        print("Error: the CSV must be UTF-8 encoded", file=sys.stderr)
        return 1
    except (OSError, CsvFormatError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print_report(result, path.name)
    ask_export(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
