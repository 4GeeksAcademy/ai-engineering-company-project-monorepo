#!/usr/bin/env python3
"""HealthCore incident analyzer CLI: python analyze.py <path-to-csv>"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARED = ROOT / "shared"
if str(SHARED) not in sys.path:
    sys.path.insert(0, str(SHARED))

from incident_analyzer import AnalysisError, analyze_csv_path  # noqa: E402
from incident_analyzer.service import write_results_csv  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) != 1 or args[0] in {"-h", "--help"}:
        print("Usage: python analyze.py <path-to-csv>")
        print("Example: python analyze.py incidents-healthcore.csv")
        return 2

    csv_path = args[0]
    if not os.path.exists(csv_path):
        print(f"ERROR: File not found: {csv_path}", file=sys.stderr)
        return 1

    try:
        result = analyze_csv_path(csv_path)
    except AnalysisError as exc:
        print(f"ERROR: {exc.message}", file=sys.stderr)
        return 1

    print(result.format_console())

    try:
        if sys.stdin.isatty():
            answer = input("Export results to CSV? [y / n]: ").strip().lower()
        else:
            line = sys.stdin.readline()
            answer = line.strip().lower() if line else ""
            if not answer:
                return 0
    except EOFError:
        return 0

    if answer in {"y", "yes"}:
        results_path = os.path.join(os.getcwd(), "results.csv")
        write_results_csv(result, results_path)
        print(f"Saved {results_path}")
    else:
        print("Export skipped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
