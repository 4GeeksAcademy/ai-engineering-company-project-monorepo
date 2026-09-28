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

The root-level `api/` package is a compatibility shim that re-exports this service's FastAPI app so `uvicorn api.app:app` works from the repo root.

## Knowledge query

`POST /knowledge/query` answers from `docs/company-knowledge-base/` and returns the cited chunks. The router is `services/knowledge/routes.py`. Design and env vars: [`docs/knowledge-rag.md`](../../docs/knowledge-rag.md).

```bash
curl -sS -X POST http://127.0.0.1:8000/knowledge/query \
  -H 'Content-Type: application/json' \
  -d '{"question":"What allergens are in the House Sauce?"}'
```

No API key is required. The default path uses local embeddings. `BRASALAND_RAG_BACKEND=qdrant` and `BRASALAND_RAG_LLM=openai` turn on the vector store and chat model.

## Alternative run command

`services/api/main.py` is deprecated (it used to import a missing knowledge router). It now starts the same central app:

```bash
python services/api/main.py
```

Prefer `uvicorn api.app:app`.

## Inventory endpoints

Inventory data is stored in [`products.csv`](../../products.csv) at the repository root.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory` | List all products |
| `POST` | `/inventory` | Add a product (`name`, `quantity`, `unit`) |
| `PATCH` | `/inventory/{product_id}` | Update stock by `delta` (+ incoming, − outgoing) |
| `GET` | `/inventory/alerts` | Products below threshold (default `10`) |

### Examples

```bash
curl http://127.0.0.1:8000/inventory

curl -X POST http://127.0.0.1:8000/inventory \
  -H "Content-Type: application/json" \
  -d '{"name":"Olive Oil","quantity":15,"unit":"liters"}'

curl -X PATCH http://127.0.0.1:8000/inventory/1 \
  -H "Content-Type: application/json" \
  -d '{"delta":5}'

curl http://127.0.0.1:8000/inventory/alerts
curl "http://127.0.0.1:8000/inventory/alerts?threshold=20"
```

Interactive docs: `http://127.0.0.1:8000/docs`

## Central API nouns (Technology)

Seeded Brasaland data on this same app. Detail and curl examples: [`docs/central-api.md`](../../docs/central-api.md).

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/menus`, `/menus/catalogue`, `/menus/{item_id}` | Public | Chain menu, COP and USD list prices |
| `GET` | `/sales`, `/sales/overview`, `/sales/alerts`, `/sales/locations/{location_id}`, `/sales/{sale_id}` | Bearer | Tickets with location, currency, timestamp; chain COP and USD |
| `POST` | `/sales` | Bearer | Record a ticket (location, amount, COP or USD) and notify the no-sales monitor |
| `GET` | `/customers`, `/customers/overview`, `/customers/{customer_id}` | Bearer | CRM; `brasa_points_balance` on the stamp card |
| `GET` | `/suppliers`, `/suppliers/overview`, `/suppliers/{supplier_id}` | Bearer | About 20 suppliers, two markets, price history |

```bash
python -m pytest tests/test_central_api_domains.py -q
```

## Live no-sales alerts

Restaurant Operations (Felipe Guerrero): when an open location has no sale for a configurable window, `GET /realtime/ops-alerts/stream` pushes an SSE alert. `POST /sales` stores the ticket and calls `record_sale` in `services/api/sales_events.py`, which clears that location. Grader steps: [`docs/realtime-no-sales.md`](../../docs/realtime-no-sales.md).

## Auth endpoints (previous JSON delivery)

SQLite user store: `data/company_api.db`. Set `JWT_SECRET_KEY` so tokens survive reloads.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create user + JWT (`email`, `password` ≥ 8). First user is admin. |
| `POST` | `/auth/login` | JSON login → `{ access_token, token_type }` |
| `POST` | `/auth/token` | OAuth2 form login (`username` = email) |
| `GET` | `/auth/me` | Current user (Bearer), including `name`/`phone`/`address` |
| `PUT` | `/profiles/me` | Update own name and contact fields (Bearer) |
| `GET`/`PUT`/`DELETE` | `/users/{id}` | Profile and password updates (self or admin) |

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
| 3 | Agent loop (Observe → Think → Act → Update → Repeat) | See `run_agent_turn()` in [`agent.py`](../../agent.py) |
| 4 | Tools with name, description, typed params | `TOOLS` constant in [`agent.py`](../../agent.py) |
| 5 | Agent calls correct API on tool selection | `execute_tool()` maps each tool to `/inventory` routes |
| 6 | Tool result injected before next LLM call | `messages.append({"role": "tool", ...})` in `run_agent_turn()` |
| 7 | `conversation_log.csv` with 4 fields per event | Run agent; check `actor,message,tool_call,timestamp` columns |
| 8 | Log append-only across sessions | Run `python agent.py` twice; rows accumulate, never overwritten |
| 9 | Multi-step interaction | Ask: *"Add 3 units of Olive Oil in liters, then tell me which products are low on stock."* — log shows `add_product` then `get_low_stock_alerts` |
| 10 | No agent framework | Plain Python loop only; no LangChain/LlamaIndex/AutoGen in `requirements.txt` |
