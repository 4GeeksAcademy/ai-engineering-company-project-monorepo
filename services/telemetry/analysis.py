from datetime import datetime
from typing import List, Dict, Any
import pandas as pd 
from sqlalchemy import text

from services.api.database import engine

def get_events_per_day(start_date:datetime, end_date:datetime) -> List[Dict[str,Any]]:
    query = text ("""
    SELECT timestamp, event_type
    FROM telemetry_events
    WHERE timestamp >= :start AND timestamp < :end
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"start": start_date, "end": end_date})
    if df.empty:
        return []

    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df["date"] = df["timestamp"].dt.strftime("%Y-%m-%d")

    grouped = (
        df.groupby(["date", "event_type"])
        .size()
        .reset_index(name="count")
    )
    return grouped.to_dict(orient="records")

def get_error_rate_by_type(start_date: datetime, end_date: datetime)-> List[Dict[str,Any]]:

    query = text("""
    SELECT timestamp, event_type
    FROM telemetry_events
    WHERE timestamp >= :start AND timestamp < :end
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"start": start_date, "end": end_date})
    
    if df.empty:
        return[]
    
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df["is_error"] = df["event_type"].str.contains("failed|error", case=False, regex=True)

    summary = (
        df.groupby("event_type")
        .agg(
            total_events=("event_type", "count"),
            error_count=("is_error", "sum")
        )
        .reset_index()
    )
    summary["error_rate"] = (summary["error_count"] / summary["total_events"]).round(4)
    return summary.to_dict(orient="records")


def get_auth_failure_rate(start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    query = text("""
        SELECT timestamp, event_type
        FROM telemetry_events
        WHERE timestamp >= :start 
          AND timestamp < :end
          AND event_type IN ('auth_login_failed', 'auth_login_succeeded', 'user_login_failed', 'user_login_succeeded')
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"start": start_date, "end": end_date})
    if df.empty:
        return []
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df["date"] = df["timestamp"].dt.strftime("%Y-%m-%d")
    df["is_failed"] = df["event_type"].isin(["auth_login_failed", "user_login_failed"]).astype(int)
    daily_auth = (
        df.groupby("date")
        .agg(
            total_attempts=("is_failed", "count"),
            failed_attempts=("is_failed", "sum")
        )
        .reset_index()
    )
    daily_auth["failure_rate"] = (
        daily_auth["failed_attempts"] / daily_auth["total_attempts"]
    ).round(4)
    return daily_auth.to_dict(orient="records")

def generate_telemetry_report(start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    return {
        "period": {
            "from": start_date.isoformat(),
            "to": end_date.isoformat()
        },
        "metrics": {
            "events_per_day": get_events_per_day(start_date, end_date),
            "error_rate_by_type": get_error_rate_by_type(start_date, end_date),
            "auth_failure_rate": get_auth_failure_rate(start_date, end_date)
        }
    }
