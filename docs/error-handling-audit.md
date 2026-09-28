# Error-handling audit — Brasaland Digital

Department served: **Technology** (Nicolás Park — central API reliability) plus **Operations/Executive** (Felipe / Mariana must see failures instead of blank screens).

Worked on `feature/error-handling-audit` in the existing company monorepo (not a new repo).

## Checklist (monorepo layers)

| Layer | Folders | What was found | What we changed |
| --- | --- | --- | --- |
| Company context | `CONTEXT.md` | No runtime | Unchanged |
| User-facing UI | `uis/website`, `uis/backoffice` | No React error boundary; fetch network failures became uncaught `TypeError` | Error boundaries; `apiRequest` maps network failure to a staff-readable `ApiError` |
| User-facing API | `services/api` | Unhandled exceptions could leak internals; one bad CSV row 500'd all inventory | Global handlers log + generic 500; skip/log invalid inventory rows; 404/400 already used for stock |
| Data / ETL | `data/pipelines` | `create_client(None)` at import; no `last_run` on failure; non-dict payloads could crash KPI parse | Lazy Supabase client; missing creds raise a clear `RuntimeError`; write `last_run.json` with `Failure`; defensive cost/location parse |
| AI / agent | `agent.py` | HTTP had no timeout; LLM client unbounded | 10s inventory HTTP timeout; 30s Groq client timeout; existing missing-key and API-down exits kept |
| Automation | `services/tasks.py` | Retries + DLQ already present | Left as-is (max_retries=3, exponential backoff, SQLite DLQ) |
| Reporting app | `services/reporting/main.py` | Import-time Supabase crash; enqueue errors uncaught | Lazy client → 503; Redis enqueue → 503; invalid `last_run.json` → 500 |
| Knowledge | `services/knowledge/routes.py` (`POST /knowledge/query` on the central app) | Older copy lived at `scripts/services/routers/knowledge.py` and was not mounted | Blank question 400; Qdrant/OpenAI failures 503 via `ExternalServiceError`; default path is local embeddings, no key |
| Secrets in errors | HTTP envelope, Celery DLQ, `last_run.json` | Connection strings, keys, and `/Users/` paths could appear in JSON | `services/safe_errors.py` redacts client text; third-party failures map to `{service} is unavailable` |
| Browser / CLI logs | ErrorBoundary `console.error`, inventory skip log, agent prints | Stack traces, CSV rows, filesystem paths, API base URL | Generic log lines only; no `componentStack`, row dumps, or host paths |
| Scripts | `scripts/analyze.py`, `scripts/nightly_export.py` | CSV/file I/O had no STDERR + `sys.exit(1)` path | Missing/empty/malformed input checked first; I/O and parse errors print to STDERR and exit 1 |
| Docs | `docs/` | This file | Audit record |

## Intentionally not changed

- Public website still has **no auth** (milestone 1). The error boundary only covers render crashes.
- Celery retry/DLQ path was already correct for the async-tasks milestone.

## How to verify

```bash
pytest tests/test_error_handling.py tests/pipelines/test_pipeline.py tests/test_users_api.py -q
cd uis/backoffice && npm run build
cd uis/website && npm run build
```
