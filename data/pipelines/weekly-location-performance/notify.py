"""Optional, non-critical step.

Not part of docs/PIPELINE_DESIGN.md's extract -> transform -> load — this
is the "at least one optional, non-critical step" the Fase 1/2 requirements
ask for (a secondary export / evaluation snapshot). It writes a JSON
snapshot of the aggregated weekly result to disk for manual audit, and is
never allowed to affect `reporting.weekly_location_performance` or the main
pipeline's result: `flow.py` invokes this task with `return_state=True` and
only *records* a failure here (`optional_step_error` in
`reporting.pipeline_runs`) — it never re-raises it, unlike a failure in
extract/transform/load.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from prefect import task

SNAPSHOT_DIR = Path(__file__).resolve().parent / "snapshots"


# No retries: this is a best-effort, non-critical export. Spending retry
# budget on a step whose failure is explicitly allowed to be ignored would
# only slow the flow down for no benefit — unlike extract/transform/load,
# whose retries exist because *those* failures must not reach the flow at
# all if a transient blip can be absorbed first.
@task(name="write_weekly_evaluation_snapshot")
def write_weekly_evaluation_snapshot(aggregated: pd.DataFrame, week_start: date) -> str:
    """Write `aggregated` as a JSON snapshot file for this week; return its
    path. Raises on any filesystem error — the caller (flow.py) is the one
    responsible for catching it via `return_state=True`, never this task.
    """
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    path = SNAPSHOT_DIR / f"{week_start.isoformat()}.json"
    payload: dict[str, Any] = {
        "week_start": week_start.isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "locations": aggregated.to_dict(orient="records"),
    }
    path.write_text(json.dumps(payload, default=str, indent=2))
    return str(path)
