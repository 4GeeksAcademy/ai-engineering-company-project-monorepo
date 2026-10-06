from __future__ import annotations

import os
import sys
import subprocess
from datetime import datetime, timedelta

from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv()


def _fail(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    sys.exit(code)


def _parse_target_date(raw: str) -> str:
    try:
        return datetime.strptime(raw, "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        _fail(f"Target date must be YYYY-MM-DD, got: {raw}")


def main() -> None:
    if len(sys.argv) > 1:
        target_date = _parse_target_date(sys.argv[1])
    else:
        target_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    from supabase import create_client

    from services import job_runner
    from services.safe_errors import ExternalServiceError, call_external, public_error_text

    print(f"Target date: {target_date}")

    job_name = "nightly_export"
    run_id = None

    try:
        if job_runner.has_processing_lock(job_name):
            print("A job is currently processing. Exiting.")
            sys.exit(0)

        if job_runner.has_completed_for_date(job_name, target_date):
            print(f"Job has already completed successfully for {target_date}. Exiting.")
            sys.exit(0)

        run = job_runner.create_run(job_name, target_date)
        if not run:
            _fail("Failed to create job run.")

        run_id = run
        job_runner.mark_processing(run_id)
    except ExternalServiceError:
        _fail("Job store is unavailable.")
    except ImportError:
        _fail("Job store dependencies are missing.")

    try:
        csv_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw"))
        try:
            os.makedirs(csv_dir, exist_ok=True)
        except OSError:
            _fail("Could not create the telemetry export directory.")

        csv_path = os.path.join(csv_dir, f"telemetry_{target_date}.csv")

        if os.path.exists(csv_path):
            if not os.path.isfile(csv_path) or os.path.getsize(csv_path) == 0:
                _fail(f"Existing telemetry export is missing or empty: telemetry_{target_date}.csv")
            print("Telemetry file already exists, skipping export.")
        else:
            print(f"Exporting telemetry events for {target_date}...")
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_KEY")
            if not url or not key:
                raise ExternalServiceError("reporting store")
            supabase = call_external("reporting store", lambda: create_client(url, key))

            start_dt = f"{target_date}T00:00:00Z"
            end_date_str = (
                datetime.strptime(target_date, "%Y-%m-%d") + timedelta(days=1)
            ).strftime("%Y-%m-%d")
            end_dt = f"{end_date_str}T00:00:00Z"

            response = call_external(
                "reporting store",
                lambda: supabase.table("telemetry_events").select("*").in_(
                    "event_type",
                    [
                        "inbound_order_created",
                        "stock_waste_registered",
                        "stock_threshold_triggered",
                    ],
                ).gte("created_at", start_dt).lt("created_at", end_dt).execute(),
            )

            rows = getattr(response, "data", None)
            if rows is None:
                _fail("Telemetry export returned no dataset.")
            if not isinstance(rows, list):
                _fail("Telemetry export returned malformed data.")

            try:
                import pandas as pd
            except ImportError:
                _fail("pandas is required to write the telemetry CSV.")

            df = pd.DataFrame(rows)
            try:
                df.to_csv(csv_path, index=False)
            except OSError:
                _fail(f"Could not write telemetry CSV: telemetry_{target_date}.csv")
            print(f"Exported {len(df)} rows")

        pipeline_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "data", "pipelines", "pipeline.py")
        )
        if not os.path.isfile(pipeline_path):
            _fail("Pipeline script was not found.")

        print("Running pipeline subprocess")
        result = subprocess.run([sys.executable, pipeline_path], capture_output=True, text=True)

        if result.returncode != 0:
            raise RuntimeError("Pipeline subprocess failed")

        job_runner.mark_completed(run_id)
        print("Job run completed successfully.")

    except SystemExit as exit_exc:
        if run_id is not None and exit_exc.code not in (0, None):
            try:
                job_runner.mark_failed(run_id, "nightly export failed")
            except ExternalServiceError:
                pass
        raise
    except Exception as error:
        safe = public_error_text(str(error), "nightly export failed")
        print(f"Job run failed: {safe}", file=sys.stderr)
        if run_id is not None:
            try:
                job_runner.mark_failed(run_id, safe)
            except ExternalServiceError:
                pass
        sys.exit(1)


if __name__ == "__main__":
    main()
