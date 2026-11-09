"""Load task — docs/PIPELINE_DESIGN.md section 8.

Transactional upsert into `reporting.weekly_location_performance`, keyed on
the exact `UNIQUE (location_id, week_start)` constraint from
docs/company-briefing.md section 5 — no other conflict key is used or
invented. All rows produced by one run are written inside a single
transaction: either every row of that week lands, or none does, so a
reader never observes a half-updated week.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

import pandas as pd
from prefect import task
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import Session

import _pathsetup  # noqa: F401

from app.core.database import engine
from schema import weekly_location_performance_table


@dataclass(frozen=True)
class LoadResult:
    records_loaded: int


# Retries: the only realistic transient failure for a single-transaction
# upsert is a write-time conflict/deadlock or a dropped connection mid-
# transaction — Postgres rolls the *entire* transaction back automatically
# in either case (see module docstring and docs/PIPELINE_DESIGN.md section
# 8), so retrying safely redoes the same deterministic upsert with no risk
# of a partial or duplicated write. 2 attempts / 20s is the value
# docs/PIPELINE_DESIGN.md section 10 proposed for this task. Missing or
# invalid DATABASE_URL credentials are a configuration error, not a
# transient one, and are not helped by retrying.
@task(
    name="load_weekly_location_performance",
    retries=2,
    retry_delay_seconds=20,
)
def load_weekly_location_performance(aggregated: pd.DataFrame) -> LoadResult:
    """Upsert every row of `aggregated` in one transaction.

    Idempotent by construction: re-running this with the same deterministic
    `aggregated` input (docs/PIPELINE_DESIGN.md section 8's "full recompute,
    not incremental") updates the same (location_id, week_start) rows to the
    same values — it never inserts a second row for a scope already loaded,
    and it never double-counts by adding to a previous value.
    """
    if aggregated.empty:
        return LoadResult(records_loaded=0)

    now = datetime.now(timezone.utc)
    rows = [
        {
            "id": uuid4(),
            "location_id": record["location_id"],
            "country": record["country"],
            "week_start": record["week_start"],
            "total_purchase_cost": record["total_purchase_cost"],
            "total_waste_cost": record["total_waste_cost"],
            "waste_ratio": record["waste_ratio"],
            "stockout_events_count": record["stockout_events_count"],
            "price_alert_events_count": record["price_alert_events_count"],
            "currency": record["currency"],
            "computed_at": now,
        }
        for record in aggregated.to_dict(orient="records")
    ]

    statement = pg_insert(weekly_location_performance_table).values(rows)
    statement = statement.on_conflict_do_update(
        index_elements=["location_id", "week_start"],
        set_={
            "country": statement.excluded.country,
            "total_purchase_cost": statement.excluded.total_purchase_cost,
            "total_waste_cost": statement.excluded.total_waste_cost,
            "waste_ratio": statement.excluded.waste_ratio,
            "stockout_events_count": statement.excluded.stockout_events_count,
            "price_alert_events_count": statement.excluded.price_alert_events_count,
            "currency": statement.excluded.currency,
            "computed_at": statement.excluded.computed_at,
        },
    )

    # Single transaction for every row of this run — committed together or
    # rolled back together (docs/PIPELINE_DESIGN.md section 8): a reader of
    # reporting.weekly_location_performance never sees some locations of
    # this week updated and others still on their previous values.
    with Session(engine) as db:
        db.execute(statement)
        db.commit()

    return LoadResult(records_loaded=len(rows))
