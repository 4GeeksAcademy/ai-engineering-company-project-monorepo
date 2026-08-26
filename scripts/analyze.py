from __future__ import annotations
import argparse, sys
from pathlib import Path

def _load_incident_analyzer():
    api_root = Path(__file__).resolve().parents[1] / "services" / "api"
    if str(api_root) not in sys.path:
        sys.path.insert(0, str(api_root))
    from analyzer import IncidentAnalyzer
    return IncidentAnalyzer

def main() -> int:
    parser = argparse.ArgumentParser(description="Phase 1 incident analysis script")
    parser.add_argument("input_csv", nargs="?", default="scripts/incidents-COMPANY.csv")
    parser.add_argument("--output", default="scripts/results.csv")
    parser.add_argument("--engine", default="native", choices=["native", "pandas"])
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    inp = (repo / args.input_csv).resolve() if not Path(args.input_csv).is_absolute() else Path(args.input_csv)
    out = (repo / args.output).resolve() if not Path(args.output).is_absolute() else Path(args.output)
    analyzer = _load_incident_analyzer().from_file(inp, engine=args.engine)
    analyzer.export_summary_to_csv(out)
    print(analyzer.build_console_summary())
    print(f"Exported CSV: {out}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
