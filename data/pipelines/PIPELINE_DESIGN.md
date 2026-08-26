# Business Performance Data Pipeline Design
**Company:** Brasaland
**Target Audience:** Mariana (CEO) and Felipe (Operations Director)

## Phase 1 — Current State Analysis

### 1. Current State
Currently, our system captures technical telemetry events (such as `page_view`, `user_login_succeeded`, `user_login_failed`, and `api_error`) and stores them in the `telemetry_events` table in our Supabase database. 

We have an existing engineering dashboard powered by the `GET /telemetry/report` endpoint and the `services/telemetry/analysis.py` pipeline. This pipeline answers technical and operational questions for the engineering team:
* Total daily traffic volume to monitor system load.
* Technical error distribution to pinpoint instability.
* Authentication failure rates for operational security.

### 2. The Gap
**Unanswered Business Question:** How efficiently is each Brasaland location managing its inventory costs and waste?

While our current technical report tells us if the platform is crashing, it provides zero visibility into business margins. Mariana (CEO) and Felipe (Operations Director) need a **"Weekly Location Cost & Waste Report"** to compare the 14 locations based on purchase costs, waste costs, waste ratios, stockout frequencies, and price alert frequencies. 

A dedicated business pipeline is required because these metrics require joining operational events with domain data (locations, ingredient costs) and aggregating them on a weekly business cadence, which should not pollute the fast, real-time technical engineering endpoint.

## Phase 2 — Pipeline Design

### 1. Purpose
The purpose of this pipeline is to produce the **"Weekly Location Cost & Waste Report"** for the CEO and Operations Director by computing Purchase Cost, Waste Cost, Waste Ratio, Stockout Frequency, and Price Alert Frequency from raw operational telemetry events (e.g., `ingredient_purchased`, `waste_logged`, `stockout_alert`).

### 2. Extraction Format
Data will be extracted from the `telemetry_events` table. The events arrive continuously in real-time as JSON payloads. The extraction phase will query these events in weekly batches (filtering by the relevant event types and the specific date window) and join them with static domain tables (`locations`, `ingredients`) to attach costs and location names.

### 3. Data Flow Diagram
```mermaid
graph TD
    A[(telemetry_events table)] -->|Extract Weekly Events| C(Transformation Layer)
    B[(domain tables: locations)] -->|Extract Dimensions| C
    C -->|Parse JSON & Aggregate KPIs| D(Load Layer)
    D -->|Upsert Aggregates| E[(reporting.weekly_location_metrics)]
    ## Phase 3 — Resilience and Idempotency

### 1. Idempotency Strategy
If the pipeline fails midway through the load phase (e.g., a database connection drop) and is re-run, we guarantee data integrity by using an **Upsert (INSERT ... ON CONFLICT)** strategy based on the composite primary key `(location_id, reporting_week_start)`. 

Because our transformation stage recalculates the entire week's aggregations from the raw `telemetry_events` table every time it runs, a second run will simply overwrite any partially loaded data from the failed run with the exact same, correct weekly totals. It will never add to existing totals (no double-counting) or create duplicate rows.

### 2. Execution Log
To guarantee observability and recoverability, every pipeline run will record the following fields in an internal `pipeline_runs` log table:
1. **`run_id` (UUID):** Uniquely identifies the execution attempt to trace which run produced which dashboard data.
2. **`window_start` / `window_end` (Timestamp):** The exact business period the pipeline calculated (crucial for re-running late events without guessing the date bounds).
3. **`status` (String: Running, Success, Failed):** Tells us immediately if the pipeline finished, so we can trigger alerts for "Silence vs. true absence" (e.g., the pipeline failed to run completely).
4. **`records_processed` (Integer):** The number of raw events aggregated. This allows us to spot data collection anomalies (e.g., if a week suddenly processes 0 rows, we know collection failed).
5. **`error_message` (Text/JSON):** Captures the stack trace or failure reason (like a Supabase timeout) to instantly identify where the load phase died, minimizing debugging time.

## Phase 4 — Mapping to Prefect

### 1. Prefect Concepts Mapping
*   **Flow:** The main orchestrator will be a Prefect Flow named `brasaland_weekly_cost_waste_flow`. It dictates the order of execution and handles overall success/failure.
*   **Tasks:** The granular, retryable steps inside the flow:
    1.  `extract_telemetry_events` (Pulls raw data for the week)
    2.  `extract_domain_data` (Pulls the 14 Brasaland locations and ingredient costs)
    3.  `aggregate_location_kpis` (Pandas transformation for cost and waste)
    4.  `upsert_to_reporting_table` (Loads the data safely into Supabase)
*   **States:** 
    *   *Scheduled:* Waiting for Monday morning.
    *   *Running:* Currently calculating metrics.
    *   *Completed:* Successfully upserted to `reporting.weekly_location_metrics`.
    *   *Failed:* E.g., Database timeout, which triggers our idempotency recovery strategy.

### 2. Prefect Blocks
To keep secrets out of our code, we will use a **Prefect Secret Block** or **Credentials Block** to securely store the Supabase connection string and API keys. This ensures the pipeline can connect to the database securely without hardcoding credentials in `data/pipelines/`.

---

## Phase 5 — Application Integration

### 1. New Reporting Endpoints
These endpoints will live in a completely separate module (`services/reporting/main.py`) to isolate them from the engineering telemetry:

*   **`GET /reporting/brasaland-weekly`**
    *   *Purpose:* The endpoint the front-end dashboard calls to display the metrics for Mariana and Felipe. It strictly queries the `reporting.weekly_location_metrics` table.
*   **`POST /reporting/brasaland-weekly/trigger`**
    *   *Purpose:* A manual override endpoint to force the pipeline to re-run for a specific week if delayed events arrive or an audit is requested.

### 2. Pipeline Invocation
The `POST /reporting/brasaland-weekly/trigger` endpoint will *not* contain any ETL logic. Instead, it will directly import and call the `brasaland_weekly_cost_waste_flow()` located in `data/pipelines/`, passing the requested `window_start` and `window_end` dates as parameters.