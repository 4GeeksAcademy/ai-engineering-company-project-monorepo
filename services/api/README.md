# API Service

This folder exposes the incident analyzer backend and inventory API under the required monorepo path.

## Launch guide

### Prerequisites

1. Install dependencies from the repository root:

```bash
pip install -r requirements.txt
```

2. Create a `.env` file at the repository root with your Groq API key:

```env
GROQ_API_KEY=your_key_here
```

Do not commit `.env` — it is listed in `.gitignore`.

### Start order (required)

**The API must be running before the agent starts.** Use two terminals from the repository root:

```bash
# Terminal 1 — start the API first
uvicorn api.app:app --reload
```

Wait until you see `Application startup complete`, then:

```bash
# Terminal 2 — start the agent
python agent.py
```

If Terminal 2 starts before the API is ready, `agent.py` prints an error and exits:

```text
Could not reach the API. Start it first with: uvicorn api.app:app --reload
```

### Agent design note

The inventory agent in [`agent.py`](../../agent.py) is implemented **manually in plain Python**:

- No LangChain, LlamaIndex, AutoGen, or similar frameworks
- Tool definitions, the observe/think/act/update loop, API calls, and CLI are all written directly in `agent.py`
- The only external LLM dependency is the OpenAI-compatible Groq client (`openai` package)

## Local development summary

From repository root, use two terminals:

```bash
# Terminal 1 — start the API
uvicorn api.app:app --reload

# Terminal 2 — start the agent
python agent.py
```

The agent runs an interactive CLI backed by Groq. It defines the inventory API endpoints as LLM tools, keeps conversation history in memory for the session, and appends every turn to `conversation_log.csv`.

Set `GROQ_API_KEY` in a root `.env` file before starting the agent.

## Conversation log

The agent appends every event to [`conversation_log.csv`](../../conversation_log.csv) at the repository root. The file is **append-only** and persists across sessions (new rows are never overwritten).

| Column | Description |
|--------|-------------|
| `actor` | Who produced the event: `user`, `agent`, `tool`, or `system` |
| `message` | User text, agent reply, or JSON tool result |
| `tool_call` | JSON tool request from the agent, or tool name on result rows |
| `timestamp` | UTC ISO-8601 timestamp |

Example flow for one user question:

```text
user   | List all products              |              | 2026-...
agent  |                                | {"name":"list_inventory","arguments":{}} | 2026-...
tool   | [{"product_id":1,...}]         | list_inventory | 2026-...
agent  | We have Tomatoes, Mozzarella... |              | 2026-...
```

The root-level `api/` package is a compatibility shim that re-exports this service's FastAPI app (`services/api/main.py`) so `uvicorn api.app:app` works from the repo root.

Supplier directory layout:

| File | Role |
|------|------|
| [`main.py`](main.py) | FastAPI application |
| [`models.py`](models.py) | Pydantic supplier models |
| [`database.py`](database.py) | TinyDB initialisation (`data/suppliers.json`) |
| [`routes/suppliers.py`](routes/suppliers.py) | Supplier directory endpoints |
| [`seed.py`](seed.py) | Initial data loading (`uv run seed`) |

UI: Next.js App Router at [`uis/application/app/suppliers/`](../../uis/application/app/suppliers/). URL: `/application/suppliers/`.

## Supplier directory

Lightweight JSON storage at [`data/suppliers.json`](../../data/suppliers.json) via TinyDB. Field names, valid categories, allowed statuses, and seed rows must match [`CONTEXT.md`](../../CONTEXT.md) and [`CONTEXT-company.md`](../../CONTEXT-company.md) exactly. The rate field is `emergency_surcharge_pct` (must be **greater than 0**).

Load the six CONTEXT suppliers without changing application code:

```bash
uv run seed
```

The seeder checks TinyDB before each insert. Existing `supplier_id` values are skipped so it never creates duplicates. When it finishes it prints how many records were inserted (and how many were skipped).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/suppliers` | List all when unfiltered. Optional `?country=` (`Colombia` or `United States`), `?category=` (valid CONTEXT category), and `?status=` |
| `GET` | `/suppliers/{id}` | One supplier by TinyDB `id` (or CONTEXT `supplier_id`). **404** if missing |
| `POST` | `/suppliers` | Register a supplier; response includes TinyDB `id`. Invalid input → **422**. |
| `PATCH` | `/suppliers/{id}/status` | Activate (`active`) or suspend (`suspend`) only. Other statuses → **422**. Stamps `updated_at` |
| `PATCH` | `/suppliers/{id}/rate` | Update `emergency_surcharge_pct` only (must be `> 0`). Stamps `updated_at`. **422** if rate ≤ 0 |
| `PATCH` | `/suppliers/{supplier_id}` | Partial update (inactivate with `"status": "inactive"`) |
| `DELETE` | `/suppliers/{id}` | Remove the supplier. **404** if missing |

Unknown category or status returns **400**. `PATCH /suppliers/{id}/status` with `suspend` keeps the row; `DELETE` removes it.

Backoffice UI: `http://127.0.0.1:8000/application/suppliers/` after `npm run build` in `uis/application` (or `npm run dev` on port 3000 with `NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000`). The KPI dashboard menu links here.

```bash
curl http://127.0.0.1:8000/suppliers
curl "http://127.0.0.1:8000/suppliers?category=proteins&status=active"
curl http://127.0.0.1:8000/suppliers/1
curl http://127.0.0.1:8000/suppliers/SUP-001

curl -X POST http://127.0.0.1:8000/suppliers \
  -H "Content-Type: application/json" \
  -d '{"name":"Andean Bottling","country":"Colombia","product_categories":["beverages_and_packaging"],"emergency_surcharge_pct":8,"status":"active"}'

curl -X PATCH http://127.0.0.1:8000/suppliers/1/rate \
  -H "Content-Type: application/json" \
  -d '{"emergency_surcharge_pct":12}'

curl -X PATCH http://127.0.0.1:8000/suppliers/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"suspend"}'

curl -X PATCH http://127.0.0.1:8000/suppliers/SUP-002 \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'

curl -X DELETE http://127.0.0.1:8000/suppliers/1
```

## Alternative run command

```bash
python services/api/main.py
```

## Inventory endpoints

Inventory data is stored in [`products.csv`](../../products.csv) at the repository root.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory` | List all products (`?location=Downtown` or `Riverside`) |
| `POST` | `/inventory/{product_id}` | Add a product (`name`, `quantity`, `unit`) |
| `PATCH` | `/inventory/{product_id}` | Update stock by `delta` (+ delivery, − sale) |
| `GET` | `/inventory/alerts` | Products with quantity below `threshold` (default `10`) |

CSV columns in [`products.csv`](../../products.csv): `product_id,name,quantity,unit,location,weekly_demand`. Locations are **Downtown** and **Riverside**.

### Examples

```bash
curl http://127.0.0.1:8000/inventory
curl "http://127.0.0.1:8000/inventory?location=Downtown"

curl -X POST http://127.0.0.1:8000/inventory/9 \
  -H "Content-Type: application/json" \
  -d '{"name":"Oat milk","quantity":15,"unit":"liters"}'

curl -X PATCH http://127.0.0.1:8000/inventory/1 \
  -H "Content-Type: application/json" \
  -d '{"delta":5}'

curl http://127.0.0.1:8000/inventory/alerts
curl "http://127.0.0.1:8000/inventory/alerts?threshold=20&location=Riverside"
```

Interactive docs: `http://127.0.0.1:8000/docs`

## Incident analysis endpoints

The FastAPI app also includes:

- `POST /api/incidents/anylayze`
- `POST /api/incidents/anylayze/upload`
- `POST /api/incidents/anylayze/summary`
- `POST /api/incidents/anylayze/upload/summary`
- `GET /api/incidents/results/export`

Aliases for `/analyze` endpoints are also available.

## Evaluation checklist

How to verify each rubric item:

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | Four FastAPI inventory endpoints | `curl` examples above + `http://127.0.0.1:8000/docs` |
| 2 | `products.csv` survives restart | `POST` a product, restart `uvicorn`, `GET /inventory` — product still present |
| 3 | Agent loop (Observe → Think → Act → Update → Repeat) | See `run_agent_loop()` in [`agent.py`](../../agent.py) |
| 4 | Tools with name, description, typed params | `TOOLS` constant in [`agent.py`](../../agent.py) |
| 5 | Agent calls correct API on tool selection | `execute_tool()` / `tool_to_api_request()` map each tool to `/inventory` routes |
| 6 | Tool result injected before next LLM call | `inject_tool_result()` in [`agent.py`](../../agent.py) |
| 7 | `conversation_log.csv` with 4 fields per event | Run agent; check `actor,message,tool_call,timestamp` columns |
| 8 | Log append-only across sessions | Run `python agent.py` twice; rows accumulate, never overwritten |
| 9 | Multi-step interaction | Ask: *"Log a delivery of 5 kg of Arabica beans at Downtown, then tell me what cannot cover the week."* — log shows `list_inventory`/`update_stock` then `get_low_stock_alerts` |
| 10 | No agent framework | Manual loop in `agent.py`; no LangChain/LlamaIndex/AutoGen in `requirements.txt` |
