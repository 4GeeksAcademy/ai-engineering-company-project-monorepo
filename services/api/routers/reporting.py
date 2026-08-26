"""Weekly location KPIs for the Brasaland leadership dashboard."""

from __future__ import annotations

from dashboard_seed import current_week_start, weekly_location_rows
from fastapi import APIRouter, Query
from supabase_store import LiveUnavailable, fetch_weekly_performance, use_seed_source

router = APIRouter(tags=["reporting"])


@router.get("/reporting/weekly-location-performance")
def get_weekly_performance(week_start: str | None = Query(default=None)) -> dict:
    if not use_seed_source():
        try:
            return fetch_weekly_performance(week_start)
        except LiveUnavailable as error:
            seed_error = str(error)
        except Exception as error:
            seed_error = str(error)
        else:
            seed_error = None
    else:
        seed_error = None
    week = week_start or current_week_start()
    payload = {"week_start": week, "locations": weekly_location_rows(week), "source": "seed"}
    if seed_error:
        payload["source_error"] = seed_error
    return payload
