---
name: verify-brasaland-api
description: >-
  Verifies the Brasaland central FastAPI entry against CONTEXT.md Technology
  needs (locations, menus, sales, customers, suppliers) and the inventory
  slice used for restaurant operations stock. Use when starting uvicorn
  api.app:app, checking OpenAPI coverage for Brasaland Digital, or gating a
  change before memory-bank/Progress.md.
---

# Verify Brasaland central API

## Objective

Confirm that the documented FastAPI entry (`uvicorn api.app:app`) is up, and produce a **verifiable coverage report** of OpenAPI paths against the Technology “What they need” list in root `CONTEXT.md`: a central API covering **locations, menus, sales, customers, and suppliers** — plus the existing **inventory** router that supports Operations ingredient/stock work.

## Inputs

| Input | Required | Notes |
| --- | --- | --- |
| Root `CONTEXT.md` | Yes | Must be the Brasaland briefing (title contains “Welcome to Brasaland”), not the four-company placeholder |
| Working directory | Yes | Monorepo root |
| Python deps | Yes | `pip install -r requirements.txt` or `uv sync` on this branch |
| Running API process | Yes for criteria 2–4 | Start with `uvicorn api.app:app --reload --host 127.0.0.1 --port 8000` |
| `.env` / `GROQ_API_KEY` | Only if also starting `agent.py` | Never commit `.env` |
| Redis | Only if Celery was in the change set | Supports async weekly report path (Executive Monday-report adjacency) |

## Steps

1. **Confirm briefing identity**

```bash
head -n 5 CONTEXT.md
# Expect: "# Welcome to Brasaland"
```

If you still see “Your company context” / TrackFlow / Nexova / HealthCore, **stop** and replace `CONTEXT.md` with the official Brasaland briefing before claiming verification.

2. **Start the API** (Terminal 1)

```bash
uvicorn api.app:app --reload --host 127.0.0.1 --port 8000
```

3. **Docs reachable**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/docs
```

4. **Coverage vs `CONTEXT.md` Technology nouns** (prints one line per domain)

```bash
curl -sS http://127.0.0.1:8000/openapi.json | python - <<'PY'
import json, sys
paths = json.load(sys.stdin).get("paths", {})
joined = " ".join(paths)
# CONTEXT.md Technology: locations, menus, sales, customers, suppliers
# Inventory supports Operations stock / ingredient adjacency in this monorepo
domains = {
    "locations": ("/location", "locations"),
    "menus": ("/menu", "menus"),
    "sales": ("/sale", "sales"),
    "customers": ("/customer", "customers"),
    "suppliers": ("/supplier", "suppliers"),
    "inventory": ("/inventory",),
}
for name, needles in domains.items():
    hit = any(n in joined.lower() for n in needles)
    print(f"{name}={'present' if hit else 'missing'}")
print("path_count=%d" % len(paths))
PY
```

5. Optional Redis check when workers/queues changed:

```bash
docker compose up -d redis
redis-cli -u redis://127.0.0.1:6379/0 ping
```

6. Update `memory-bank/Progress.md` with the coverage lines (present/missing). Do **not** claim Technology’s central API is complete if any of locations/menus/sales/customers/suppliers is `missing`.

## Acceptance criteria (all must pass)

| # | Criterion | How to verify |
| --- | --- | --- |
| 1 | `CONTEXT.md` is the Brasaland briefing | `head -n 5 CONTEXT.md` shows `# Welcome to Brasaland` |
| 2 | `GET /docs` returns HTTP **200** | `curl` status `200` |
| 3 | Entry module is `api.app:app` | Process started with `uvicorn api.app:app` |
| 4 | OpenAPI includes **`/inventory`** (Operations stock slice present in this repo) | Coverage script prints `inventory=present` |
| 5 | Coverage report lists present/missing for **locations, menus, sales, customers, suppliers** | Script printed all five lines; results copied into `Progress.md` |
| 6 | No secrets staged | `git status` does not include `.env` or API keys |

**Pass vs complete:** Criteria 1–4 and 6 are required to call the skill **passed**. Criterion 5 is required for honesty: a skill run that hides `missing` Technology domains fails. Closing those domains is product work, not a silent skip.

If any required criterion fails, stop, fix briefing/API/process, and re-run.
