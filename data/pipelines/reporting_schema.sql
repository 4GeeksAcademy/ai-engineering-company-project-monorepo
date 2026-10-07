-- Brasaland reporting schema for the weekly location cost & waste pipeline.
-- Source of truth: CONTEXT-company.md (destination schema) + PIPELINE_DESIGN.md
-- Apply in Supabase SQL editor (or any Postgres that backs the project).

create schema if not exists reporting;

-- Unique constraint / upsert key: (location_id, week_start)
-- Load assigns EXCLUDED totals on conflict (replace, never add deltas).
create table if not exists reporting.weekly_location_performance (
    location_id text not null,
    week_start date not null,
    total_purchase_cost double precision not null default 0,
    total_waste_cost double precision not null default 0,
    waste_ratio double precision not null default 0,
    stockout_events_count integer not null default 0,
    price_alert_events_count integer not null default 0,
    country text not null default 'Unknown',
    currency text not null default 'USD',
    primary key (location_id, week_start)
);

-- Execution control / audit log (start, end, records, status, errors).
create table if not exists reporting.pipeline_runs (
    run_id uuid primary key,
    started_at timestamptz not null,
    finished_at timestamptz,
    window_start text not null,
    window_end text not null,
    records_processed integer not null default 0,
    status text not null check (status in ('Running', 'Success', 'Failed')),
    error_message text
);

-- Expose the reporting schema to PostgREST (Supabase API settings → exposed schemas).
-- grant usage on schema reporting to anon, authenticated, service_role;
-- grant all on all tables in schema reporting to anon, authenticated, service_role;
