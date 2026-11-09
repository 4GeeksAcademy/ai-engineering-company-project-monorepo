"""Self-hosted scheduling entry point.

Registers `weekly_location_performance_flow` as a long-running deployment
on a self-hosted Prefect server and polls it for scheduled runs — no
work pool, no separate worker process, and no Prefect Cloud: `.serve()`
is a single process that is both the schedule and the executor, the
simplest self-hosted option for a pipeline this size (docs/PIPELINE_DESIGN.md
section 10 leaves "Cloud vs self-hosted" open; this is the self-hosted
answer).

Requires a Prefect server already running and `PREFECT_API_URL` pointing
to it (see ../../README.md "Self-hosted scheduling" section) — this
process is the scheduler/executor, not the server itself.

Cron: "0 5 * * 1" = every Monday at 05:00 UTC, matching
docs/company-briefing.md section 1's "fresco la mañana del lunes" and
PIPELINE_DESIGN.md section 3's week boundary convention (UTC, not each
country's local timezone).
"""

from __future__ import annotations

import _pathsetup  # noqa: F401

from flow import weekly_location_performance_flow

WEEKLY_CRON = "0 5 * * 1"


def main() -> None:
    weekly_location_performance_flow.serve(
        name="weekly-location-performance",
        cron=WEEKLY_CRON,
        parameters={"triggered_by": "schedule"},
        description=(
            "Weekly cost/waste report by location (docs/company-briefing.md). "
            "Scheduled every Monday 05:00 UTC; also runnable on demand via "
            "`prefect deployment run weekly_location_performance_flow/weekly-location-performance`."
        ),
        tags=["reporting", "weekly-location-performance"],
    )


if __name__ == "__main__":
    main()
