# `services` folder

This folder contains **all the backend services** (APIs and background workers) related to the company for the cross-functional AI Engineering project.

Each subfolder inside `services/` must correspond to **one specific service** (for example: `admin-api`, `data-processor-worker`) and include its own technical and functional documentation.

- **Main purpose**: to centralize all the backend logic, APIs, and queue consumers that support the company's use cases.
- **Recommendation**: document in this file (or in sub-READMEs) the services you add, their objective, the technology used, and how to run them.

The central FastAPI app is `services/api/app.py` (`uvicorn api.app:app`). It mounts locations, menus, sales, customers, suppliers, inventory, users, reporting, knowledge (`POST /knowledge/query`), and realtime (`GET /realtime/ops-alerts/stream`). Run notes: [`services/api/README.md`](./api/README.md), [`docs/central-api.md`](../docs/central-api.md), [`docs/knowledge-rag.md`](../docs/knowledge-rag.md), and [`docs/realtime-no-sales.md`](../docs/realtime-no-sales.md).

## Celery (Message Queues and Async Tasks)

- Config: `services/celery_app.py` — Redis via **`REDIS_URL`** as broker **and** result backend.
- Task: `services.tasks.run_weekly_pipeline` wraps the heavy `POST /reporting/pipeline-runs` ETL.
- Retries: `max_retries=3` with exponential `countdown` (`2 ** retries`).
- DLQ: after retries are exhausted, failures go to SQLite `data/celery_dead_letters.sqlite3`
  (`task_id`, `attempt`, `error_message`, `recorded_at`) via `services/dead_letter.py`.

```bash
# Infrastructure
docker compose up -d redis flower worker

# Or locally (Redis must be up)
export REDIS_URL=redis://localhost:6379/0
uv run celery -A services.celery_app worker --loglevel=info
```

Flower UI: http://localhost:5555 — queued / in-progress / completed tasks (worker uses `-E`).
Set `FLOWER_UNAUTHENTICATED_API=true` for local `/api/tasks` access. Demo tasks:
`services.tasks.flower_demo_succeed` / `services.tasks.flower_demo_fail`.

Task logs (every attempt): `task_id`, `attempt`, `status`, `duration_ms`; failures also include full `error=...`.

### API endpoints

- `POST /reporting/pipeline-runs` → enqueues `run_weekly_pipeline`, returns **202** `{"task_id": "..."}`
- `GET /tasks/{task_id}` → Redis/Celery status as
  `{"task_id": "...", "status": "pending|started|success|failure", "result": ...}`

## Live operations alerts

`services/api/no_sales_router.py` mounts `GET /realtime/ops-alerts/stream` on the central FastAPI app (`uvicorn api.app:app`). It tells Restaurant Operations when an open location has no sales during business hours. Details: [`docs/realtime-no-sales.md`](../docs/realtime-no-sales.md).

> _Spanish version: [README.es.md](./README.es.md)._
