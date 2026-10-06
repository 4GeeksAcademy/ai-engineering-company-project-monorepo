from __future__ import annotations

import os

from dotenv import load_dotenv
from supabase import create_client, Client

from services.safe_errors import ExternalServiceError, call_external, public_error_text

load_dotenv()

_supabase: Client | None = None


def _client() -> Client:
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            raise ExternalServiceError("job store")
        try:
            _supabase = create_client(url, key)
        except Exception as error:
            raise ExternalServiceError("job store") from error
    return _supabase


def create_run(job_name: str, target_date: str):
    response = call_external(
        "job store",
        lambda: _client().table("job_runs").insert({
            "job_name": job_name,
            "target_date": target_date,
            "status": "processing"
        }).execute(),
    )
    if response.data:
        return response.data[0]["id"]
    return None


def mark_processing(run_id):
    response = call_external(
        "job store",
        lambda: _client().table("job_runs").update({
            "status": "processing"
        }).eq("id", run_id).execute(),
    )
    return response.data


def mark_completed(run_id):
    response = call_external(
        "job store",
        lambda: _client().table("job_runs").update({
            "status": "completed"
        }).eq("id", run_id).execute(),
    )
    return response.data


def mark_failed(run_id, error_message: str):
    safe_message = public_error_text(error_message, "job store is unavailable")
    response = call_external(
        "job store",
        lambda: _client().table("job_runs").update({
            "status": "failed",
            "error_message": safe_message
        }).eq("id", run_id).execute(),
    )
    return response.data


def has_processing_lock(job_name: str) -> bool:
    response = call_external(
        "job store",
        lambda: _client().table("job_runs").select("id").eq("job_name", job_name).eq("status", "processing").execute(),
    )
    return len(response.data) > 0


def has_completed_for_date(job_name: str, target_date: str) -> bool:
    response = call_external(
        "job store",
        lambda: _client().table("job_runs").select("id").eq("job_name", job_name).eq("target_date", target_date).eq("status", "completed").execute(),
    )
    return len(response.data) > 0
