from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from services.safe_errors import public_error_text


def _fail(message: str) -> int:
    print(message, file=sys.stderr)
    return 1


def _load_incident_analyzer():
    api_root = Path(__file__).resolve().parents[1] / "services" / "api"
    if str(api_root) not in sys.path:
        sys.path.insert(0, str(api_root))
    from analyzer import IncidentAnalyzer

    return IncidentAnalyzer


def _resolve_path(repo: Path, value: str) -> Path:
    candidate = Path(value)
    return candidate if candidate.is_absolute() else (repo / candidate).resolve()


def _validate_input_csv(path: Path, display_name: str) -> str | None:
    if not path.exists():
        return f"Input CSV was not found: {display_name}"
    if not path.is_file():
        return f"Input path is not a file: {display_name}"
    try:
        empty = path.stat().st_size == 0
    except OSError:
        return f"Could not read the input CSV: {display_name}"
    if empty:
        return f"Input CSV is empty: {display_name}"
    if path.suffix.lower() != ".csv":
        return f"Input must be a .csv file: {display_name}"
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Phase 1 incident analysis script")
    parser.add_argument("input_csv", nargs="?", default="scripts/incidents-COMPANY.csv")
    parser.add_argument("--output", default="scripts/results.csv")
    parser.add_argument("--engine", default="native", choices=["native", "pandas"])
    args = parser.parse_args(argv)

    repo = _REPO_ROOT
    inp = _resolve_path(repo, args.input_csv)
    out = _resolve_path(repo, args.output)

    input_error = _validate_input_csv(inp, args.input_csv)
    if input_error:
        return _fail(input_error)

    try:
        analyzer = _load_incident_analyzer().from_file(inp, engine=args.engine)
    except FileNotFoundError:
        return _fail(f"Input CSV was not found: {args.input_csv}")
    except (OSError, UnicodeDecodeError, csv.Error) as error:
        return _fail(
            public_error_text(str(error), f"Could not read or parse the input CSV: {args.input_csv}")
        )
    except ValueError as error:
        return _fail(public_error_text(str(error), "Input CSV is missing a header row or required columns."))
    except ImportError:
        return _fail("The pandas engine is unavailable. Install pandas or use --engine native.")

    if not analyzer.records:
        return _fail(f"Input CSV has a header but no data rows: {args.input_csv}")

    try:
        analyzer.export_summary_to_csv(out)
    except OSError as error:
        return _fail(public_error_text(str(error), f"Could not write the output CSV: {args.output}"))

    print(analyzer.build_console_summary())
    print(f"Exported CSV: {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
