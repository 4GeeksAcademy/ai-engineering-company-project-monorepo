# Brasaland Reporting API (`services/reporting/`)

HTTP shell for the weekly location cost & waste pipeline. **Not** `services/telemetry/` and **not** `GET /telemetry/report`.

Routes import helpers from `data/pipelines/` only — no KPI arithmetic here.

| Role | Endpoint | Source |
| --- | --- | --- |
| Status | `GET /reporting/pipeline-runs/latest` | `get_latest_pipeline_run()` |
| Manual trigger | `POST /reporting/pipeline-runs` | Celery `run_weekly_pipeline` → Prefect `run_pipeline` (202 + `task_id`) |
| KPI query | `GET /reporting/weekly-location-performance` | `get_weekly_location_performance()` — shape from `CONTEXT-company.md` |
| Task poll | `GET /tasks/{task_id}` | Celery result backend |

## Auth and errors (same as central API)

- **Bearer JWT** required (`Authorization: Bearer <token>`), same as `/locations`.
- Obtain a token via `POST /auth/login` or `POST /auth/token` on the central API.
- Errors use `{ "status", "code", "message", "detail" }` (`services/api/errors.py`).

Mounted on the central app (`services/api/app.py`) and available standalone.

## Run

```bash
# Preferred — same process as locations / auth
uvicorn api.app:app --reload --port 8000

# Or standalone reporting shell
uvicorn services.reporting.main:app --reload --port 8002
```

Examples (central API):

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@brasaland.test","password":"secret-password"}' | jq -r .access_token)

curl -s -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/reporting/pipeline-runs/latest

curl -s -H "Authorization: Bearer $TOKEN" \
  'http://127.0.0.1:8000/reporting/weekly-location-performance?week_start=2026-09-21'

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  http://127.0.0.1:8000/reporting/pipeline-runs \
  -d '{"start_date":"2026-09-21","end_date":"2026-09-28"}'
```

Audience: Mariana Restrepo (Executive), Felipe Guerrero (Operations), Lucía Fernández (Procurement).
