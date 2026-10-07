# Message Queues and Async Tasks — submission evidence

## Endpoint chosen for async conversion

**`POST /reporting/pipeline-runs`** (`services/reporting/main.py`)

**Why:** This endpoint previously ran the full weekly ETL (`run_pipeline`) **synchronously** inside the HTTP request (Supabase extract → pandas aggregate → upsert). It is the longest-running API operation in the monorepo versus cheap reads like `GET /reporting/weekly-location-performance` or inventory CRUD. It now enqueues `services.tasks.run_weekly_pipeline` and returns **202** `{"task_id": "..."}` immediately; status is polled via `GET /tasks/{task_id}`.

## Flower — completed + failed (DLQ-bound) tasks

See [`async-tasks-flower-and-dlq.png`](./async-tasks-flower-and-dlq.png) (exported from Flower `/api/tasks` + SQLite DLQ).

| Role | Task ID | State |
| --- | --- | --- |
| Completed | `682ae02a-d983-4fa2-88f3-153408db0340` | SUCCESS (`flower_demo_succeed`) |
| Failed → DLQ | `93664fb2-3330-47b5-be1a-6ce1adce0e4b` | FAILURE (`run_weekly_pipeline`, retries exhausted) |

Raw Flower export: [`async-tasks-flower-tasks.json`](./async-tasks-flower-tasks.json)  
DLQ dump: [`async-tasks-dlq.csv`](./async-tasks-dlq.csv)

## Retry log snippet

From the Celery worker during the DLQ demonstration ([`async-tasks-retry-log.txt`](./async-tasks-retry-log.txt)):

```text
task_id=93664fb2-3330-47b5-be1a-6ce1adce0e4b attempt=1 status=retry countdown=1s
task_id=93664fb2-3330-47b5-be1a-6ce1adce0e4b attempt=2 status=retry countdown=2s
task_id=93664fb2-3330-47b5-be1a-6ce1adce0e4b attempt=3 status=retry countdown=4s
task_id=93664fb2-3330-47b5-be1a-6ce1adce0e4b attempt=4 status=failure_exhausted ... error=No module named 'pandas'
```

Exponential backoff (`1s → 2s → 4s`); after `max_retries=3` the failure is recorded in the DLQ with `task_id`, `attempt`, `error_message`, `recorded_at`.
