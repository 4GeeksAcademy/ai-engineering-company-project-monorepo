import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def create_run(job_name: str, target_date: str):
    response = supabase.table("job_runs").insert({
        "job_name": job_name,
        "target_date": target_date,
        "status": "processing"
    }).execute()
    if response.data:
        return response.data[0]["id"]
    return None

def mark_processing(run_id):
    response = supabase.table("job_runs").update({
        "status": "processing"
    }).eq("id", run_id).execute()
    return response.data

def mark_completed(run_id):
    response = supabase.table("job_runs").update({
        "status": "completed"
    }).eq("id", run_id).execute()
    return response.data

def mark_failed(run_id, error_message: str):
    response = supabase.table("job_runs").update({
        "status": "failed",
        "error_message": error_message
    }).eq("id", run_id).execute()
    return response.data

def has_processing_lock(job_name: str) -> bool:
    response = supabase.table("job_runs").select("id").eq("job_name", job_name).eq("status", "processing").execute()
    return len(response.data) > 0

def has_completed_for_date(job_name: str, target_date: str) -> bool:
    response = supabase.table("job_runs").select("id").eq("job_name", job_name).eq("target_date", target_date).eq("status", "completed").execute()
    return len(response.data) > 0