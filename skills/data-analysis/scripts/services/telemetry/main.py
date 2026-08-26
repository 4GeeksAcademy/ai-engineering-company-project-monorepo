import time
import os
import pandas as pd
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

# Import the analysis pipeline functions we built earlier
from services.telemetry.analysis import (
    get_events_per_day,
    get_error_rate_by_type,
    get_auth_failure_rate
)

router = APIRouter()

# Initialize Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Supabase credentials in environmental variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- In-Memory Cache Storage ---
# Key: (start_date_str, end_date_str) | Value: {"expiry": timestamp, "data": dict}
REPORT_CACHE = {}
CACHE_TTL_SECONDS = 60


# --- Pydantic Response Schemas ---
class PeriodSchema(BaseModel):
    text_from: str  # maps to JSON key "from" via serialization/dict mapping
    to: str

class MetricsSchema(BaseModel):
    events_per_day: list[dict]
    error_rate_by_type: list[dict]
    auth_failure_rate: list[dict]

class TelemetryReportResponse(BaseModel):
    period: dict
    metrics: MetricsSchema


def load_telemetry_from_supabase(start_date: str, end_date: str) -> pd.DataFrame:
    """
    SQL Layer: Fetches only rows the metric needs within the specific time boundary.
    Bounds are inclusive start, exclusive end in UTC.
    """
    try:
        # SQL-level push down filtering for date windows
        response = supabase.table("telemetry_events") \
            .select("id", "timestamp", "event_type", "tags") \
            .gte("timestamp", start_date) \
            .lt("timestamp", end_date) \
            .execute()
            
        # Convert raw JSON array directly to Pandas DataFrame
        return pd.DataFrame(response.data)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to load operational data from Supabase: {str(e)}"
        )


@router.get("/telemetry/report", response_model=TelemetryReportResponse)
async def get_telemetry_report(
    start_date: str | None = Query(None, description="ISO 8601 Start Date (inclusive)"),
    end_date: str | None = Query(None, description="ISO 8601 End Date (exclusive)")
):
    now = datetime.now(timezone.utc)
    
    # 1. Date window ownership: Compute defaults once at the API boundary
    if not start_date:
        start_date = (now - timedelta(days=7)).isoformat()
    if not end_date:
        end_date = now.isoformat()
        
    cache_key = (start_date, end_date)
    current_time = time.time()
    
    # 2. Check Cache layer: Serve immediately on cache hit
    if cache_key in REPORT_CACHE:
        cache_entry = REPORT_CACHE[cache_key]
        if current_time < cache_entry["expiry"]:
            return cache_entry["data"]
            
    # 3. Cache Miss: Load from database via SQL window bounds
    df = load_telemetry_from_supabase(start_date, end_date)
    
    # 4. Transform raw material into operational metrics via Pandas functions
    metrics_payload = {
        "events_per_day": get_events_per_day(df.copy()),
        "error_rate_by_type": get_error_rate_by_type(df.copy()),
        "auth_failure_rate": get_auth_failure_rate(df.copy())
    }
    
    # 5. Structure payload compliant with the syllabus specifications
    report_data = {
        "period": {
            "from": start_date,
            "to": end_date
        },
        "metrics": metrics_payload
    }
    
    # 6. Save calculation to in-memory cache with a 60-second TTL
    REPORT_CACHE[cache_key] = {
        "expiry": current_time + CACHE_TTL_SECONDS,
        "data": report_data
    }
    
    return report_data