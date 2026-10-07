# Telemetry report

Technical report for Brasaland Digital (Technology — Nicolás Park).

- Pipeline: `analysis.py` (`events_per_day`, `error_rate_by_type`, `latency_by_day`, `auth_failure_rate`)
- Cache and period: `report.py` (60-second TTL)
- HTTP: `GET /telemetry/report` on the central API (`services/api/routers/telemetry.py`)
- Staff page: `uis/backoffice` `/telemetry`

Write-up: [`docs/telemetry/technical-report.md`](../../docs/telemetry/technical-report.md).

Reads `public.telemetry_events` through PostgREST (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). PostgREST `event_type=in.(...)` and `timestamp=gte.` / `timestamp=lt.` filters run as SQL `WHERE` on the server.
