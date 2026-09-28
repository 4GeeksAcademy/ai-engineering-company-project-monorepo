# Progress — Brasaland Digital

Verified **2026-09-16** on clone `Rickycastro1940/ai-engineering-company-project-monorepo`, branch `feature/auth-frontend`. Gaps below are scored against root [`CONTEXT.md`](../CONTEXT.md) department needs.

## Agent infrastructure (aligned to `CONTEXT.md`)

- Root `CONTEXT.md` / `CONTEXT.es.md` replaced with official Brasaland briefings (`00-general-contexts/CONTEXT-brasaland-briefing.*.md`). Placeholder four-company list removed.
- `memory-bank/` (`Projectbrief.md`, `Techcontext.md`, this file) cites `CONTEXT.md` departments, currencies, and Technology/Executive needs.
- `AGENTS.md` + `.agents/rules/00-operating-loop.md` (**always active**) enforce Brasaland-only facts from `CONTEXT.md`.
- Skill `.agents/skills/verify-brasaland-api/` checks the running API against Technology’s central-API list in `CONTEXT.md` (locations, menus, sales, customers, suppliers) plus the inventory slice used for Operations stock.

## Coverage vs `CONTEXT.md` (this checkout)

| `CONTEXT.md` need | Status in monorepo |
| --- | --- |
| Technology: central API (locations, menus, sales, customers, suppliers) | **Present (seeded)** — `locations`/`menus`/`sales`/`customers`/`suppliers`/`inventory=present` plus `knowledge=present` (`POST /knowledge/query`) on `uvicorn api.app:app` (`:8000`). Not a live POS or invoice feed |
| Technology: telemetry + pipeline to dashboards | **Partial** — Part 2 weekly location cost/waste ETL + Phase one Prefect stage subflows + Phase two isolated KPI transform unit tests + Phase three CLI (`python data/pipelines/pipeline.py --offline`) + Phase four backoffice Monday weekly report (`/reporting/weekly-performance`, stakeholder copy); engineering `GET /telemetry/report` untouched |
| Operations: sales per location COP/USD; no-sales alerts; smart ordering | **Partial** — seeded `GET /sales` tickets and `/sales/overview` (COP and USD, 14 locations) plus `/sales/alerts`; no sales UI; no live no-sales stream; Monday weekly cost/waste report still separate |
| Procurement: supplier price history, consolidated spend | **Partial** — seeded `GET /suppliers` (20 suppliers, Colombia and Florida, price history and alerts); Monday weekly purchase cost / price-alert frequency still separate; invoices are not live |
| Marketing: digital Brasa Points, CRM, personalisation | **Partial** — `GET /customers` CRM seed with `brasa_points_balance` on physical stamp cards; digital wallet not built; `uis/website/` corporate home (`/`) live |
| People: HR portal / KPIs by country | **Not done** |
| Training: recipe catalogue, push to 14 locations | **Partial** — `POST /knowledge/query` searches the four English standards (allergens, waste, ordering, Brasa Points) and returns cited chunks. Not a full recipe catalogue and not a push to all 14 kitchens |
| Executive: sales USD+COP dashboard, NL assistant, Monday 07:00 report | **Partial** — seeded `GET /sales/overview` chain totals in COP and USD; Monday weekly ops & finance report still the staff UI; standards questions can go to `POST /knowledge/query`; a sales NL assistant remains open |

## What already runs (engineering)

| Area | Evidence |
| --- | --- |
| Inventory API + Groq agent | `services/api/inventory.py` (CSV-backed flat imports; no package-relative `.auth`), `agent.py` |
| Incident analysis UI | `uis/web` |
| Weekly cost/waste pipeline + Celery | `data/process/location_kpis.py`, `data/pipelines/pipeline.py`, `services/reporting/main.py`, `services/tasks.py`; Compose Redis/Flower/worker |
| Public corporate website | `uis/website/` — Vite/React, route `/`, brand tokens + components from `CONTEXT.md`; screenshot `docs/screenshots/website-corporate-home.png` |
| Internal backoffice | `uis/backoffice/` — JWT session; `/accessible` locations+inventory; `/reporting/weekly-performance` Monday weekly ops & finance report (COP/USD) |
| Locations API | `services/api/locations.py` — 14 locations, Colombia 8 / Florida 6, COP+USD; **Bearer JWT required** |

## Latest auth-frontend evidence (`feature/auth-frontend`)

Department served: **Technology** (JSON auth API restored onto the central FastAPI app) + **Operations/Executive** (staff backoffice is now session-gated).

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
GET /locations/overview without token → 401
POST /auth/login → 200 + user + access_token
GET /locations/overview with Bearer → 200, 14 locations, COP+USD
GET /inventory with Bearer → 200
pytest tests/test_users_api.py → 17 passed
cd uis/backoffice && npm run build → green
GET /auth/me with Bearer → email + name/phone/address
PUT /profiles/me anonymous → 401; with Bearer → 200 contact fields
Browser /account/profile → GET /auth/me email + contact; save → PUT /profiles/me 200 “Profile updated.”
/account/change-password still renders after profile save
Client guard: no token → /login?next= for /, /accessible, /account/profile, /account/change-password
Login stores auth_token in localStorage; /accessible loads locations+inventory with Bearer
Logout removes auth_token and lands on /login
Protected 401 → clearSessionAndRedirectToLogin()
uis/website `/` (5173) loads corporate home with no login redirect
GET /auth/me with invalid Bearer → 401
E2E eval: register → token stored → /accessible; /account/profile email+name; PUT /profiles/me 200; logout /login no token; invalid JWT → GET /auth/me 401 → /login no token
Website `/` no auth_token, no login links
React 19.3.0 + react-dom in uis/backoffice and uis/website; vite-plugin-react; npm run build bundles createRoot/useState
Live #root has __reactContainer$ on :5174/login and :5173/

```

JWT login/register for the staff console is **present**. Technology’s menus/sales/customers/suppliers nouns remain **missing**.

## Latest verify-brasaland-api evidence (`feature/agent-memory-bank`)

Department served: **Technology** (central API coverage) + **Marketing** (corporate site) + **Operations/Executive** (backoffice location footprint).

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
GET http://127.0.0.1:8001/docs → 200
locations=present
menus=missing
sales=missing
customers=missing
suppliers=missing
inventory=present
path_count=14
GET /locations/overview → 14 locations (company Brasaland)
GET /inventory → 200
```

Skill **passed** (criteria 1–4 + 6). Technology central API is **not complete** while menus/sales/customers/suppliers remain `missing`.

## Latest error-handling audit (`feature/error-handling-audit`)

Department served: **Technology** (central API must fail safely) + **Operations/Executive** (staff see errors, not a blank console).

```text
pytest tests/test_error_handling.py tests/test_users_api.py -q → 19 passed
cd uis/backoffice && npm run build → green
cd uis/website && npm run build → green
Checklist: docs/error-handling-audit.md
```

## Latest three-state fetch UI (`feature/error-handling-audit`)

Department served: **Operations/Executive** (staff console must not go blank while locations/inventory load) + **Technology** (session and API failures need a retry path).

```text
cd uis/backoffice && npm run build → tsc -b && vite build green
Browser :5174/login invalid credentials → alert + Sign in retry CTA; button showed Signing in…
Register Creating account… then /accessible with 14 locations (COP+USD roster)
/account/profile → email async-ui-0918@brasaland.test + Save profile form
uis/website has no fetch (static corporate home)
```

## Latest user-facing error copy (`feature/error-handling-audit`)

Department served: **Operations/Executive** (staff see plain-language failures with retry/home/support) + **Technology** (API errors are mapped, not dumped).

```text
cd uis/backoffice && npm run build → tsc -b && vite build green
```

## Latest FastAPI exception scope (`feature/error-handling-audit`)

Department served: **Technology** (central API handlers catch I/O at the call site; programming errors still hit the generic 500 handler).

```text
uv run python -m pytest tests/test_error_handling.py tests/test_users_api.py -q → 24 passed
```

## Latest structured HTTP errors (`feature/error-handling-audit`)

Department served: **Technology** (central API returns 400/404/422/500 as JSON, never Python tracebacks).

```text
uv run python -m pytest tests/test_error_handling.py tests/test_users_api.py -q → 24 passed
Envelope: status, code, message, detail (422 detail remains field loc/msg/type)
GET /inventory RuntimeError → 500 {"code":"internal_error","message":"Internal server error"} no traceback
```

## Latest secret-safe errors + external calls (`feature/error-handling-audit`)

Department served: **Technology** (client JSON must not leak connection strings, keys, or host paths; LLM/Qdrant/Supabase calls must fail closed).

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
GET http://127.0.0.1:8000/docs → 200
locations=present
menus=missing
sales=missing
customers=missing
suppliers=missing
inventory=present
path_count=21
uv run python -m pytest tests/test_error_handling.py tests/test_users_api.py -q → 27 passed
error_body(500, postgres://… / sk- / /Users/) → generic Internal server error
ExternalServiceError("language model") on GET /inventory → 503 language model is unavailable
```

Skill **passed** (criteria 1–4 + 6). Technology central API remains **incomplete** while menus/sales/customers/suppliers are `missing`.

## Latest script file/CSV error handling (`feature/error-handling-audit`)

Department served: **Technology** (CLI tools must fail closed) + **Operations** (incident CSV analysis for kitchens/locations).

```text
uv run python -m pytest tests/test_scripts_io.py tests/test_error_handling.py -q → 16 passed
uv run python scripts/analyze.py scripts/does-not-exist.csv → STDERR + exit 1
```

## Latest log redaction (`feature/error-handling-audit`)

Department served: **Technology** (no stack traces or host paths in operator consoles) + **Marketing** (public site ErrorBoundary).

```text
uv run python -m pytest tests/test_error_handling.py tests/test_scripts_io.py -q → 16 passed
cd uis/backoffice && npm run build → green
cd uis/website && npm run build → green
ErrorBoundary console.error no longer includes error or componentStack
```

## Latest finally / client-safe / script I/O closeout (`feature/error-handling-audit`)

Department served: **Technology** (structured HTTP, no env names in 503s) + **Operations/Executive** (loading flags always clear; login session failure has retry).

```text
uv run python -m pytest tests/test_error_handling.py tests/test_scripts_io.py tests/test_users_api.py -q → 33 passed
cd uis/backoffice && npm run build → green
```

## Latest business performance pipeline Part 2 (`cursor/business-performance-pipeline-part2-4f14`)

Department served: **Technology** (Nicolás — pipeline into ops/finance dashboards) + **Restaurant Operations** (Felipe — purchase/waste/stockouts) + **Procurement** (Lucía — purchase cost + price alerts) + **Executive** (Mariana — Monday location-week numbers).

Implemented against `CONTEXT-company.md` (KPIs to Measure / destination schema / endpoints) and approved `data/pipelines/PIPELINE_DESIGN.md`:

- Pure transform in `data/process/location_kpis.py` (dedupe on `telemetry_events.id`, five KPIs, roster `location_id`s).
- Prefect **3** flow `brasaland_weekly_performance_pipeline` with stage subflows
  `extract_brasaland_data_flow` → `transform_brasaland_kpis_flow` → `load_brasaland_reporting_flow`
  and tasks `extract_telemetry_events` / `extract_domain_data` / `aggregate_location_kpis` /
  `upsert_to_reporting_table` into `reporting.weekly_location_performance`.
- Extract lands in `data/raw/`; validation output in `data/eval/last_validation.json`.
- Destination `reporting.weekly_location_performance` + run log `reporting.pipeline_runs` (SQL in `data/pipelines/reporting_schema.sql`); mirror `data/pipelines/last_run.json`.
- HTTP shell in `services/reporting/` only — engineering telemetry left alone.

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
uv run python -c "import prefect; print(prefect.__version__)" → 3.4.25
uv run python -m pytest tests/pipelines/ -q → 23 passed
Idempotent load: upsert on_conflict=location_id,week_start (CONTEXT PK); identical re-run payloads
Run metadata: started_at, finished_at, records_processed, status, error_message → pipeline_runs + last_run.json + pipeline_run_log.jsonl
```

## Latest Phase one — Prefect subflows (`cursor/pipeline-phase1-subflows-4f14`)

Department served: **Technology** (Nicolás — pipeline structure) + **Operations/Executive** (weekly KPI stages stay readable and isolatable).

Hardened `data/pipelines/pipeline.py` so Monday ETL is three stage `@flow` subflows with explicit I/O (no shared globals), plus optional eval as its own subflow:

| Subflow `name=` | Inputs → Outputs |
| --- | --- |
| `extract_brasaland_data_flow` | `(start_date, end_date)` → `(telemetry_df, locations_df)` |
| `transform_brasaland_kpis_flow` | `(telemetry_df, locations_df, week_start)` → `kpis_df` |
| `load_brasaland_reporting_flow` | `kpis_df` → rows upserted |
| `eval_brasaland_snapshot_flow` | `(kpis_df, week_start)` → validation dict (`return_state=True` from main) |

Main flow remains `brasaland_weekly_performance_pipeline`. Destination stays `reporting.weekly_location_performance`. `PIPELINE_DESIGN.md` Phase 4 name contract updated.

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
.venv/bin/python -m pytest tests/pipelines/test_prefect_stages.py tests/pipelines/test_name_contract.py -q → 14 passed
.venv/bin/python -m pytest tests/pipelines/ -q → 30 passed
```

## Latest Phase two — transform unit tests (`cursor/pipeline-phase2-transform-tests-4f14`)

Department served: **Technology** (Nicolás — KPI transform correctness) + **Restaurant Operations** (Felipe — purchase/waste/stockouts) + **Procurement** (Lucía — purchase cost + price alerts).

Extended `tests/pipelines/test_pipeline.py` with isolated in-memory unit tests for CONTEXT-company.md "KPIs to Measure" (no DB / external APIs): `total_purchase_cost`, `total_waste_cost`, `waste_ratio` (hand-calculated 4dp + zero-purchase → 0), `stockout_events_count` / `price_alert_events_count`, Prefect task `.fn` parity, and defensive malformed payloads (non-dict, null cost/location, wrong cost type, missing columns).

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
.venv/bin/python -m pytest tests/pipelines/test_pipeline.py -v → 14 passed
```

## Latest Phase three — CLI after subflow refactor (`cursor/pipeline-phase3-cli-4f14`)

Department served: **Technology** (Nicolás — Monday-runnable pipeline into ops/finance) + **Executive** (Mariana — Monday 07:00 America/Bogota reporting cycle).

After Phase one subflow hardening, restored Part 2 / Phase 4 script entry onto the same Prefect flow (did not invent a new CLI module):

- `if __name__ == "__main__"` → `main()` → `brasaland_weekly_performance_pipeline` / `run_pipeline`
- Flags: `--start-date`, `--end-date`, `--offline` (also auto-offline when `SUPABASE_*` unset)
- Offline rebinds `fetch_telemetry_events` / `fetch_domain_locations` / `persist_kpi_records` so extract → transform → load subflows still run with explicit I/O
- `PIPELINE_DESIGN.md` Script-based execution / Intended reporting schedule docs kept (same commands)

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
.venv/bin/python data/pipelines/pipeline.py --offline --start-date 2026-09-21 --end-date 2026-09-28
→ exit 0; status=Success records_processed=9
  subflows: extract_brasaland_data_flow → transform_brasaland_kpis_flow → load_brasaland_reporting_flow (Completed)
.venv/bin/python data/pipelines/pipeline.py --offline
→ exit 0; status=Success records_processed=9; window=[2026-09-14, 2026-09-21)
.venv/bin/python -m pytest tests/pipelines/ -q → 36 passed
```

## Planned next steps (order)

1. Keep every product change traceable to a `CONTEXT.md` department need (name the section in the PR/commit).
2. Central API nouns **locations, menus, sales, customers, and suppliers** are seeded on `uvicorn api.app:app`. A live POS, live invoices, and a digital Brasa Points wallet are still open.
3. Executive path: surface chain sales in **USD and COP**, wire Monday-style weekly report to the existing async pipeline, keep Mariana’s NL assistant on the documented agent loop.
4. Later phases: keep staff dashboard consumers for `reporting.weekly_location_performance` current; extend sales USD+COP for Mariana.
5. Do not rewrite the monorepo or invent another company.

## Latest Phase four — business dashboard (`cursor/pipeline-phase4-dashboard-4f14`)

Department served: **Executive** (Mariana — Monday location-week numbers) + **Restaurant Operations** (Felipe — purchase/waste/stockouts) + **Procurement** (Lucía — purchase cost + price alerts) + **Technology** (Nicolás — reporting feed on central API).

Backoffice page `/reporting/weekly-performance` fetches Bearer-gated `GET /reporting/weekly-location-performance` and renders every CONTEXT-company.md KPI (Purchase cost, Waste cost, Waste ratio, Stockout frequency, Price alert frequency) with chain-week period (`week_start` + `[Monday, next Monday)` America/Bogota) and COP/USD rows. Vite proxies API paths only (`/reporting/weekly-location-performance`, `/reporting/pipeline-runs`) so the SPA route is not swallowed. Reporting routes mounted on `services/api/app.py` with JWT; offline KPI store readable when Supabase unset.

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
GET http://127.0.0.1:8000/docs → 200
locations=present menus=missing sales=missing customers=missing suppliers=missing inventory=present reporting=present
path_count=25
GET /reporting/weekly-location-performance without token → 401
GET /reporting/weekly-location-performance with Bearer → 200, week_start=2026-09-21, COP+USD rows, five KPI columns
cd uis/backoffice && npm run build → tsc -b && vite build green
.venv/bin/python -m pytest tests/pipelines/ -q → 41 passed
```

Skill **passed** (criteria 1–4 + 6). Technology central API remains **incomplete** while menus/sales/customers/suppliers are `missing`.

## Latest Phase four stakeholder UX (`cursor/pipeline-phase4-stakeholder-ux-4f14`)

Department served: **Executive** (Mariana) + **Restaurant Operations** (Felipe) + **Procurement** (Lucía) — Monday report must be legible without API/table jargon.

Hardened `uis/backoffice` Monday weekly report copy for leadership:

- Title/nav: “Monday weekly ops & finance report” / “Monday weekly report” (not “Weekly KPIs” / KPI query)
- Lead and empty states drop endpoint paths, table names, Bearer, backticks, CLI commands, and engineering telemetry notes
- Column labels stay CONTEXT-company.md exact: Purchase cost, Waste cost, Waste ratio, Stockout frequency, Price alert frequency
- Period shown as chain week starting Monday YYYY-MM-DD (America/Bogota); location column shows friendly names only (no raw `location_id` as primary label)
- Still fetches `GET /reporting/weekly-location-performance` under the hood

Prefect / test vocabulary: `PIPELINE_DESIGN.md` Phase 4 `name=` contract already matches `data/pipelines/pipeline.py` and `tests/pipelines/test_name_contract.py` (`brasaland_weekly_performance_pipeline`, `extract_brasaland_data_flow`, `transform_brasaland_kpis_flow`, `load_brasaland_reporting_flow`, `eval_brasaland_snapshot_flow`, domain tasks). No renames required; no generic `extract_data` / `business_metrics` left.

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
.venv/bin/python -m pytest tests/pipelines/ -q → 41 passed
cd uis/backoffice && npm run build → tsc -b && vite build green
Manual UI (CDP): login → Monday weekly report; audit forbidden jargon hits=[]; required KPI labels present; friendly location names; COP+USD; period America/Bogota
Artifacts: stakeholder_ux_03_monday_report.png, stakeholder_ux_04_kpi_table.png, stakeholder_ux_monday_report_walkthrough.mp4
```

## Latest central API nouns (`cursor/central-api-nouns-5989`)

Department served: **Technology** (Nicolás Park — locations, menus, sales, customers, suppliers on one server) + **Operations** (Felipe — per-location COP/USD tickets and a no-sales alert list) + **Procurement** (Lucía — ~20 suppliers and price history) + **Marketing** (Camila — CRM with a Brasa Points stamp-card balance) + **Executive** (Mariana — chain totals in COP and USD) + **Training** (Jake — same menu in all 14 kitchens).

Built on `main` (`a7c9bf9`), not draft PR #64. Routers: `services/api/menus.py`, `sales.py`, `customers.py`, `suppliers.py`. `app.py` only mounts them; reporting stays mounted. Seeded snapshot, not a live POS. Brasa Points stay physical stamp cards (`digital_loyalty=false`).

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
GET http://127.0.0.1:8000/docs → 200
locations=present
menus=present
sales=present
customers=present
suppliers=present
inventory=present
path_count=39
reporting paths still present
python3 -m pytest tests/test_central_api_domains.py -q → 7 passed
python3 -m pytest tests/test_users_api.py tests/test_error_handling.py -q → 27 passed
GET /menus/catalogue → 6 items, currencies COP+USD, location_count 14
GET /sales/overview without token → 401
GET /sales/overview with Bearer → 14 locations, 42 tickets, chain_total_cop=476340000, chain_total_usd=119085, florida_total_usd=53460
GET /customers/cus-001 → Brasa Points, brasa_points_balance=32, loyalty_tier=silver, digital_loyalty=false
GET /suppliers/overview → total_suppliers=20, colombia_count=10, florida_count=10, price_alerts=8
```

Skill **passed** (criteria 1–4 and 6). Criterion 5: locations, menus, sales, customers, and suppliers are **present**. That does not make POS integration, telemetry, or a digital loyalty wallet complete.

## Latest knowledge RAG (`cursor/knowledge-rag-query-34a7`)

Department served: **Training** (Jake Morrison — searchable standards) + **Technology** (Nicolás Park — one route on the central API) + **Executive** (Mariana can ask a standards question; this is not the chain-sales assistant).

Kept `data/process/rag.py` + `data/pipelines/rag.py` (collection `brasaland_kb`, allergen and COP/USD rules). Retired `scripts/rag.py` (it searched `company_knowledge_base`) by making it delegate here. `services/api/main.py` no longer imports a missing router; it starts the same central app. `POST /knowledge/query` is `services/knowledge/routes.py`, included from `services/api/app.py`.

Default path needs no API key: local hashed embeddings and an extractive answer with cited chunks. `BRASALAND_RAG_BACKEND=qdrant` and `BRASALAND_RAG_LLM=openai` enable the vector store and chat model. Loyalty copy now matches `CONTEXT.md` (physical stamp cards; digital app not available yet).

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
GET http://127.0.0.1:8000/docs → 200
locations=present
menus=missing
sales=missing
customers=missing
suppliers=missing
inventory=present
knowledge=present
path_count=26
/knowledge/query in OpenAPI → True
POST /knowledge/query House Sauce → 200, soy + sulfites, source brasaland-menu-allergens.en.md
POST unrelated question → not enough information, sources=[]
python data/eval/eval_knowledge_qa.py → n=28 retrieval_hit_rate=1.000 answer_pass_rate=1.000
python -m pytest tests/test_knowledge_query.py -q → 14 passed
```

Skill **passed** (criteria 1–4 + 6). At the time of that run, Technology’s menus/sales/customers/suppliers were still `missing`. Those nouns are mounted together with `/knowledge/query` after the merge from `origin/main` (`#89`).

## Latest merge of #89 into knowledge query (`cursor/knowledge-rag-query-34a7`)

Department served: **Technology** (Nicolás Park — menus, sales, customers, suppliers, and `POST /knowledge/query` on one server) + **Training** (Jake Morrison — searchable standards stay mounted).

Merged `origin/main` (`5751231`, PR #89) into this branch. `services/api/app.py` includes `menus`, `sales`, `customers`, `suppliers`, and `services.knowledge.routes`. Both Progress entries above are kept.

```text
head -n 5 CONTEXT.md → # Welcome to Brasaland
GET http://127.0.0.1:8000/docs → 200
locations=present
menus=present
sales=present
customers=present
suppliers=present
inventory=present
knowledge=present
path_count=40
/menus /sales /customers /suppliers GET present
/knowledge/query POST present
python -m pytest tests/test_knowledge_query.py tests/test_central_api_domains.py -q → 21 passed
python -m pytest -q → 110 passed
```

Skill **passed** (criteria 1–4 and 6). Criterion 5: locations, menus, sales, customers, and suppliers are **present**, and `/knowledge/query` is present. That does not make POS integration, telemetry, or a digital loyalty wallet complete.

## How to update this file

After a verified change, append evidence (command + result) and update the coverage table. Do not log plans that were not run.
