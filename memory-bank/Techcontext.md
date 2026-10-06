# Tech context — Brasaland monorepo

**Company constraints** come from [`CONTEXT.md`](../CONTEXT.md) (Technology + Executive + multi-market notes). **Implementation facts** come from this checkout. Do not assume Next.js or a single SPA.

## Constraints from `CONTEXT.md`

| Constraint | Where in `CONTEXT.md` | Engineering implication |
| --- | --- | --- |
| Two countries (Colombia + Florida) | Opening + Why Choose Brasaland | Domain models and UIs must not assume one market |
| Two currencies (sales in **COP and USD**) | Operations + Executive needs | Money fields / dashboards must support both; never hard-code a single currency |
| Two languages (ES / EN) | Training need; Why Choose Brasaland | Copy and training content may be bilingual; start from one base language if needed |
| 14 company-owned locations | Opening + Operations | Location-scoped metrics and alerts, not a single-store mental model |
| No internal API / no telemetry today (as-is) | Technology | Build the central API and telemetry; do not pretend POS systems are already integrated |
| Central API must cover **locations, menus, sales, customers, suppliers** | Technology “What they need” | New routers should map to those nouns; inventory/stock supports Operations ingredient visibility |
| Executive: chain sales USD+COP, NL assistant, Monday 07:00 report | Executive Direction | Reporting and agents serve Mariana’s questions, not a generic admin demo |
| Brand: same taste Medellín↔Miami | Opening | Quality/training systems must keep recipes consistent across locations |

## Tech stack in this repo (evidence)

| Layer | What is in the repo | Evidence |
| --- | --- | --- |
| Language | Python **≥ 3.9** | `pyproject.toml` |
| HTTP API | FastAPI + Uvicorn; root `api/app.py` loads `services/api/app.py` | `api/app.py`, `services/api/app.py` |
| Inventory (ops/procurement slice) | `/inventory` router + Groq CLI agent (manual loop, no LangChain) | `services/api/inventory.py`, `agent.py` |
| Async / weekly report path | Celery + Redis + Flower; `run_weekly_pipeline` | `services/celery_app.py`, `services/tasks.py`, `docker-compose.yml` |
| Telemetry → business report | Weekly location cost/waste pipeline (purchase, waste, stockout, price alerts) | `data/pipelines/PIPELINE_DESIGN.md` (audience: Mariana + Felipe) |
| Frontends | Vite/React `uis/website` (public) + `uis/backoffice` (internal `/accessible`); static `uis/web` | `uis/website/`, `uis/backoffice/`, `uis/web/` |
| Locations API | `GET /locations`, `GET /locations/overview` (14 sites, COP/USD) | `services/api/locations.py` |
| Shared types | `packages/shared` | `packages/shared/package.json` |

Documented local run (`README.md`): Terminal 1 `uvicorn api.app:app --reload`, Terminal 2 `python agent.py` after the API is up. `GROQ_API_KEY` lives in `.env` (never commit).

## Architectural decisions

1. **One Brasaland monorepo.** Map `CONTEXT.md` products into existing trees: UI → `uis/`; API/workers → `services/`; data → `data/`; agents → `agents/`; skills → `.agents/skills/` and `skills/`.
2. **Central API grows by router** toward Technology’s five domains (locations, menus, sales, customers, suppliers). Prefer routers on the shared FastAPI app over new microservices. Celery workers stay separate for heavy jobs.
3. **Heavy reporting is async** so Mariana’s weekly-style workloads do not block the request path (`POST /reporting/pipeline-runs` → 202 + `task_id`).
4. **Location-week idempotency** for cost/waste metrics: upsert on `(location_id, reporting_week_start)` (`PIPELINE_DESIGN.md`) — aligns with 14-location weekly ops questions.
5. **Public corporate site is `uis/website/`** (template name). `uis/web/` is incident-analysis HTML only — do not put Marketing’s site there.
6. **`CONTEXT.md` is the briefing.** Domain names (Brasa Points, Felipe, Lucía, COP/USD) come from that file only.

## Technical constraints

- Do not fork a new repository; stay on `Rickycastro1940/ai-engineering-company-project-monorepo`.
- Do not invent TrackFlow / Nexova / HealthCore fields or processes.
- Do not treat the financial-dashboard homework `GET /api/metrics` as Brasaland live data.
- Secrets (`.env`, Groq, Supabase) stay out of git.
- Compose Redis hostname `redis` is Docker-only; local workers use `REDIS_URL=redis://localhost:6379/0`.
