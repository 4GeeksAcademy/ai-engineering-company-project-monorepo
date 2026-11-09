"""Project-root entry point for the weekly-location-performance pipeline.

Thin wrapper only — the actual flow/tasks live in
`data/pipelines/weekly-location-performance/` (extract.py, transform.py,
load.py, notify.py, run_log.py, flow.py — see that folder's README.md).
This file imports and calls `weekly_location_performance_flow`; it does
not redefine or duplicate any pipeline logic.

Run from the project root with the services/api virtualenv's Python
(the `app.*` package — DB settings, `telemetry_events` access — is
editable-installed there; a bare `python` not pointed at that venv will
fail on `import app...` regardless of this script):

    python data/pipelines/pipeline.py                  # most recently closed ISO week
    python data/pipelines/pipeline.py 2026-07-13        # a specific week (Monday, UTC)

Equivalently, with the venv's interpreter explicit (no activation needed):

    services/api/.venv/bin/python data/pipelines/pipeline.py

This is the EXECUTION COMMAND referenced in
docs/PIPELINE_DESIGN.md's periodicity section — see that document for the
business-intended weekly cadence (distinct from this command, which runs
the pipeline once, synchronously, for whichever week is resolved).
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

# Two things must be importable for this to work from the project root:
#   1. `app.*` (services/api) — resolved here explicitly so this script
#      doesn't depend on services/api's editable install being active for
#      the interpreter that runs it.
#   2. `flow` (and its sibling modules extract/transform/load/notify/
#      run_log/schema) — a plain module import, not a package import,
#      because the pipeline's own folder name is kebab-case (see that
#      folder's _pathsetup.py docstring for why).
_PIPELINE_ROOT = Path(__file__).resolve().parent
_REPO_ROOT = _PIPELINE_ROOT.parent
_SERVICES_API_DIR = _REPO_ROOT / "services" / "api"
_FLOW_DIR = _PIPELINE_ROOT / "weekly-location-performance"

for _path in (_SERVICES_API_DIR, _FLOW_DIR):
    if str(_path) not in sys.path:
        sys.path.insert(0, str(_path))

from flow import weekly_location_performance_flow  # noqa: E402


def main() -> None:
    cli_week_start = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else None
    result = weekly_location_performance_flow(week_start=cli_week_start, triggered_by="manual:cli")
    print(result)
    if result["status"] != "succeeded":
        # weekly_location_performance_flow already raises on a mandatory-
        # stage failure (see flow.py) before returning, so reaching this
        # branch would mean a non-"succeeded" result was returned without
        # raising — defensive, not expected in current behavior.
        sys.exit(1)


if __name__ == "__main__":
    main()
