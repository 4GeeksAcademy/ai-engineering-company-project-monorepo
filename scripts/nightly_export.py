import os
import sys
import subprocess
from datetime import datetime, timedelta
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# Ensure we can import job_runner from services
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from services import job_runner

load_dotenv()

def main():
    # 1. Retrieve target_date
    if len(sys.argv) > 1:
        target_date = sys.argv[1]
    else:
        target_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
    print(f"Target date: {target_date}")
    
    job_name = "nightly_export"
    
    # 2. Check for the processing lock
    if job_runner.has_processing_lock(job_name):
        print("A job is currently processing. Exiting.")
        sys.exit(0)
        
    # 3. Check for idempotency via target_date
    if job_runner.has_completed_for_date(job_name, target_date):
        print(f"Job has already completed successfully for {target_date}. Exiting.")
        sys.exit(0)
        
    # Create run entry
    run = job_runner.create_run(job_name, target_date)
    if not run:
        print("Failed to create job run."); sys.exit(1)
        
    run_id = run
    job_runner.mark_processing(run_id)
    
    try:
        # 4. Export yesterday's telemetry_events rows to a CSV file if it doesn't exist
        csv_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw"))
        os.makedirs(csv_dir, exist_ok=True)
        csv_path = os.path.join(csv_dir, f"telemetry_{target_date}.csv")
        
        if not os.path.exists(csv_path):
            print(f"Exporting telemetry events for {target_date} to {csv_path}...")
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_KEY")
            supabase = create_client(url, key)
            
            start_dt = f"{target_date}T00:00:00Z"
            target_dt = datetime.strptime(target_date, "%Y-%m-%d")
            end_date_str = (target_dt + timedelta(days=1)).strftime("%Y-%m-%d")
            end_dt = f"{end_date_str}T00:00:00Z"
            
            response = supabase.table("telemetry_events").select("*").in_("event_type", [
                "inbound_order_created",
                "stock_waste_registered",
                "stock_threshold_triggered",
            ]).gte("created_at", start_dt).lt("created_at", end_dt).execute()
            
            df = pd.DataFrame(response.data)
            df.to_csv(csv_path, index=False)
            print(f"Exported {len(df)} rows to {csv_path}")
        else:
            print(f"File {csv_path} already exists, skipping export.")
            
        # 5. Call the pipeline via subprocess
        pipeline_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "pipelines", "pipeline.py"))
        print(f"Running pipeline subprocess: {pipeline_path}")
        result = subprocess.run([sys.executable, pipeline_path], capture_output=True, text=True)
        
        if result.returncode != 0:
            print("Pipeline stderr:")
            print(result.stderr)
            raise RuntimeError(f"Pipeline subprocess failed with return code {result.returncode}")
            
        print("Pipeline stdout:")
        print(result.stdout)
        
        # 6. Update status to completed
        job_runner.mark_completed(run_id)
        print("Job run completed successfully.")
        
    except Exception as e:
        print(f"Job run failed: {str(e)}")
        job_runner.mark_failed(run_id, str(e)        sys.exit(1)

if __name__ == "__main__":
    main()
