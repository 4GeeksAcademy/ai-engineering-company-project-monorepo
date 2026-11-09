# `weekly-location-performance`

Prefect 3 implementation of the "Reporte Semanal de Costo y Merma por
Local" pipeline designed in `docs/PIPELINE_DESIGN.md` (sections 8–10) and
`docs/company-briefing.md`.

## Layout

| File | Role |
| --- | --- |
| `extract.py` | `@task extract_weekly_telemetry_events` — read-only extraction from `telemetry_events` for one ISO week. |
| `transform.py` | `@task transform_weekly_location_performance` — pure Pandas aggregation into the 5 KPIs. Cached (`cache_key_fn`/`cache_expiration`). |
| `load.py` | `@task load_weekly_location_performance` — transactional upsert into `reporting.weekly_location_performance`. |
| `notify.py` | `@task write_weekly_evaluation_snapshot` — **optional, non-critical** JSON snapshot export. Its failure never affects the main pipeline. |
| `run_log.py` | Plain functions (not Prefect tasks) that write/read `reporting.pipeline_runs`. |
| `schema.py` | SQLAlchemy Core `Table` objects for the `reporting` schema (owned by the migration, not `SQLModel.metadata`). |
| `flow.py` | `@flow weekly_location_performance_flow` — orchestrates the above. |
| `serve.py` | Self-hosted scheduling entry point — registers the flow as a `.serve()`'d deployment with a weekly cron schedule. |
| `_pathsetup.py` | sys.path shim so sibling modules can `import` each other despite the hyphenated folder name (see its docstring). |
| `deploy/*.service` | systemd unit templates for running the server and the scheduler as persistent Linux services. |

The destination schema is created by
`supabase/migrations/20261109150000_create_reporting_schema.sql` (already
applied to the project's Supabase instance).

## Running it once, ad hoc

Requires `services/api`'s virtualenv (the `app.*` package — DB settings,
`telemetry_events` access — is editable-installed there):

```bash
cd services/api
uv sync  # once, to install prefect (already added to pyproject.toml)

# Most recently closed ISO week (default):
.venv/bin/python ../../data/pipelines/weekly-location-performance/flow.py

# A specific week (Monday, UTC):
.venv/bin/python ../../data/pipelines/weekly-location-performance/flow.py 2026-07-13
```

Each run prints its own `{"run_id": ..., "status": ..., ...}` result and
writes one row to `reporting.pipeline_runs`. No `PREFECT_API_URL` is
required for this ad-hoc mode — Prefect 3 starts a temporary local
(SQLite-backed) server automatically for an unconfigured environment, and
throws it away when the process exits. Fine for a manual one-off run or
for the tests below; **not** what the weekly schedule uses (see next
section) — an ephemeral server has no run history and nothing to poll it
on a cron schedule.

## Self-hosted weekly scheduling

Decision: **self-hosted Prefect**, not Prefect Cloud (`docs/PIPELINE_DESIGN.md`
section 10/12's open question). `prefect` is a Python library either way —
what "self-hosted" adds is running its *own* orchestration API server
(`prefect server start`, in the same `prefect` package, no extra install)
on a machine you control, so schedules/run-history persist and survive
individual flow runs. Two long-running processes, no work pool/worker
needed (`flow.serve()` is both the scheduler and the executor in one
process — the simplest self-hosted option at this pipeline's size):

1. **The Prefect server** — holds Prefect's *own* orchestration metadata
   (flow/task run history, deployments, schedules). Separate from this
   pipeline's business data in the `reporting` schema (Supabase); defaults
   to a local SQLite file under `$PREFECT_HOME` (`~/.prefect/` if unset).

   ```bash
   cd services/api
   .venv/bin/prefect server start --host 0.0.0.0 --port 4200
   ```

2. **The scheduler/executor** (`serve.py`) — registers
   `weekly_location_performance_flow` with a `"0 5 * * 1"` cron (every
   Monday 05:00 UTC, per `docs/company-briefing.md` section 1) and polls
   the server above for scheduled or manually-triggered runs. **Must run
   with this directory as its working directory** — Prefect resolves the
   flow's entrypoint as a path relative to cwd at registration time.

   ```bash
   cd data/pipelines/weekly-location-performance
   PREFECT_API_URL=http://127.0.0.1:4200/api \
     /path/to/services/api/.venv/bin/python serve.py
   ```

   Trigger it on demand (e.g. to test, or for `POST /reporting/pipeline-runs`
   once that endpoint exists) without waiting for Monday:

   ```bash
   PREFECT_API_URL=http://127.0.0.1:4200/api \
     .venv/bin/prefect deployment run 'weekly_location_performance_flow/weekly-location-performance'
   ```

   The Prefect UI (`http://<server host>:4200`) shows every past/scheduled
   run, independent of `reporting.pipeline_runs` (which is this pipeline's
   own business-facing log — see `run_log.py`; the two are complementary,
   not duplicates: one is "did the orchestration succeed", the other is
   "are the resulting KPIs trustworthy", per `docs/PIPELINE_DESIGN.md`
   section 10's explicit distinction).

**Production**: `deploy/prefect-server.service` and
`deploy/weekly-location-performance-serve.service` are systemd unit
templates for running both as persistent services (adjust the placeholder
user/paths first):

```bash
sudo cp deploy/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now prefect-server weekly-location-performance-serve
```

This was verified end-to-end in development: started a real
`prefect server`, ran `serve.py` against it, triggered a run via
`prefect deployment run`, and confirmed the flow executed, cached its
transform, and wrote a `succeeded` row to `reporting.pipeline_runs` with
`prefect_flow_run_id` correctly cross-linked.

## Tests

```bash
cd data/pipelines/weekly-location-performance
../../../services/api/.venv/bin/python -m pytest tests/ -v
```

- `test_transform.py` — pure aggregation logic (no DB/Prefect).
- `test_resilience_config.py` — retry settings + cache-key behavior (no DB).
- `test_cache_reuse.py` — the transform task's cache is actually exercised by Prefect (not just the key function).
- `test_load_idempotency.py` — real upserts against `reporting.weekly_location_performance`, using a synthetic future week/`TEST-`-prefixed locations cleaned up in teardown.
- `test_flow.py` — full `extract -> transform -> load` with a monkeypatched extract (never writes to `telemetry_events`); covers optional-step failure isolation, rerun idempotency, and critical-failure logging.

## Cost instrumentation gap — resolved

`inbound_order_created`/`stock_waste_registered` now both carry `unit_cost`
in the approved event schema (`docs/event-schemas.json` -> regenerated
`app/models/events.py`), closing the gap described in
`docs/company-briefing.md` section 3 and `docs/PIPELINE_DESIGN.md` section
2. The business decision for merma cost was: **captured at registration
time** (`StockExitCreate.unit_cost`, required exactly when `reason` is
`expired`/`kitchen_error`/`theft_suspected`), never derived from a prior
`InboundStock` delivery.

`transform.py` needed no code change for this — it always read `unit_cost`
defensively from `tags` and counted a missing one in `records_rejected`
(see `_costed_sum`'s docstring). Any event captured *before* this
instrumentation change still lacks `unit_cost` and is still correctly
excluded from that week's cost sum and counted as rejected — this pipeline
never backfills or fabricates a historical value.
