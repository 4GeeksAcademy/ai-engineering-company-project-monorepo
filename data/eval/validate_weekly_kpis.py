"""Offline validation helper for Brasaland weekly location KPIs.

Writes a report to ``data/eval/last_validation.json`` using fixtures in
``data/eval/weekly_location_performance_fixtures.json`` and the pure
transform in ``data/process/location_kpis.py``.

Run from the monorepo root::

    PYTHONPATH=. uv run python data/eval/validate_weekly_kpis.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import pandas as pd

from data.pipelines.pipeline import write_validation_output
from data.process.location_kpis import aggregate_location_kpis

_EVAL = _REPO_ROOT / "data" / "eval" / "weekly_location_performance_fixtures.json"


def main() -> int:
    fixtures = json.loads(_EVAL.read_text(encoding="utf-8"))
    events = []
    locations = []
    for loc in fixtures["locations"]:
        events.extend(loc["events"])
        locations.append(
            {
                "id": loc["location_id"],
                "country": loc["country"],
                "currency": loc["currency"],
            }
        )
    kpis = aggregate_location_kpis(
        pd.DataFrame(events),
        pd.DataFrame(locations),
        fixtures["week_start"],
    )
    report = write_validation_output(kpis, fixtures["week_start"])
    print(json.dumps({"passed": report["passed"], "row_count": report["row_count"]}, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
