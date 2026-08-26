# Brasaland — Company Context

Grilled-food restaurant chain operating in **Colombia** and **Florida (US)**.

- Part 1 SSE tickets: [`docs/10-realtime/notification/`](docs/10-realtime/notification/README.md)
- Part 2 WebSocket chat: [`docs/10-realtime/communication/CONTEXT-company.md`](docs/10-realtime/communication/CONTEXT-company.md)

## Knowledge base source documents

Index every file below from `docs/company-knowledge-base/`:

| File | Type | Topics |
|------|------|--------|
| `brasaland-supplier-ordering.en.md` | Procedure | Weekly orders, delivery lead times, minimum protein stock, emergency orders |
| `brasaland-waste-protocol.en.md` | Policy | Waste categories, daily logging, escalation thresholds, operational targets |
| `brasaland-loyalty-program.en.md` | Program | Brasa Points tiers, redemption rules, FAQ |
| `brasaland-menu-allergens.en.md` | Catalog / safety | Dish allergens, customer allergy protocol, gluten-free limitations |

## RAG constraints

- **Collection name:** `brasaland_kb`
- **Company slug in payloads:** `brasaland`
- **Non-streaming API:** `POST /knowledge/query`
  - Request: `{ "question": "..." }`
  - Response: `{ "answer": "..." }` (model-generated string only — never chunks, scores, or Qdrant payloads)
- **Currency:** Keep USD $ and COP $ exactly as written — never convert.
- **Allergens:** Never claim "zero risk" or "100% safe"; follow source wording.
- **Unknown answers:** Respond with *"There is not enough information available."*
- **Audience:** Commercial and operations teams (salesperson perspective).

## Agent this chat connects

Binding names: [`docs/10-realtime/communication/CONTEXT-company.md`](docs/10-realtime/communication/CONTEXT-company.md).

| Field | Value |
|-------|--------|
| `agent_id` | `brasaland_knowledge_assistant` |
| Role | Commercial knowledge assistant (salesperson perspective) |
| Knowledge | Brasaland RAG collection `brasaland_kb` only |
| UI | existing `uis/knowledge/` — not a parallel app |
| Catalog | `agents/knowledge-assistant/` |

The assistant must not invent company facts. It does not file emergency orders or waste escalations.

## Supplier directory (lightweight storage API)

Use these names **exactly**. Do not substitute generic fields such as `category`, `rate`, or `email`.

Canonical copy (same contract): [`CONTEXT-company.md`](CONTEXT-company.md#supplier-directory-lightweight-storage-api). Storage: [`data/suppliers.json`](data/suppliers.json) (TinyDB JSON file only).

Monorepo layout for this slice:

```
services/api/main.py              FastAPI application
services/api/models.py            Pydantic supplier models
services/api/database.py          TinyDB initialisation
services/api/routes/suppliers.py  supplier directory endpoints
services/api/seed.py              initial data loading (`uv run seed`)
uis/application/app/suppliers/    Next.js + TypeScript supplier directory page
```


### Fields

| Field | Type | On input | On response | Notes |
|-------|------|----------|-------------|--------|
| `name` | string | yes | yes | Legal or trade name |
| `country` | string | yes | yes | `Colombia` or `United States` |
| `product_categories` | string[] | yes | yes | One or more **valid categories** below |
| `emergency_surcharge_pct` | number | yes | yes | Emergency-order **rate** from the ordering procedure (`8` for proteins). Must be `> 0`. |
| `status` | string | yes | yes | One of the **allowed statuses** below |
| `id` | integer | no | yes | TinyDB document id |
| `supplier_id` | string | no (ignored) | yes | `SUP-001`, … |
| `updated_at` | string | no (ignored) | yes | ISO-8601 UTC, system-generated |

### Valid categories

From [`brasaland-supplier-ordering.en.md`](docs/company-knowledge-base/brasaland-supplier-ordering.en.md):

| `category` | Order frequency | Lead time |
|------------|-----------------|-----------|
| `proteins` | weekly | 48 hours |
| `vegetables_and_fruit` | twice_weekly | 24 hours |
| `beverages_and_packaging` | biweekly | 5 business days (120 hours) |
| `imported_sauces_and_condiments` | monthly | 10–15 business days (use 288 hours) |

### Allowed statuses

| `status` | Meaning | Equivalents accepted then stored as |
|----------|---------|-------------------------------------|
| `active` | Approved for new orders | — |
| `preferred` | Primary vendor (still active for orders) | — |
| `inactive` | Do not use for new orders (keep the record) | `suspend`, `suspended` |

`PATCH /suppliers/{id}/status` accepts only `active` and `suspend`.

### HTTP list filters

Optional query params use CONTEXT field values, not generic names:

- `?country=` — `Colombia` or `United States`
- `?category=` — a **valid category** (matched against `product_categories`)
- `?status=` — an **allowed status** (`suspend` is treated as `inactive`)

### Initial seed data

| supplier_id | name | country | product_categories | emergency_surcharge_pct | status |
|-------------|------|---------|--------------------|-------------------------|--------|
| SUP-001 | Carnes del Valle | Colombia | proteins | 8 | preferred |
| SUP-002 | Florida Prime Meats | United States | proteins | 8 | active |
| SUP-003 | Huerta Andina | Colombia | vegetables_and_fruit | 8 | active |
| SUP-004 | Gulf Coast Produce | United States | vegetables_and_fruit | 8 | preferred |
| SUP-005 | Empaques Caribe | Colombia | beverages_and_packaging | 8 | active |
| SUP-006 | Sabores Importados | Colombia | imported_sauces_and_condiments | 8 | inactive |

## Chat session fields

| Field | Domain value |
|-------|----------------|
| `session_id` | Server-assigned `BRS-CHAT-000001`, … |
| `thread_id` | Same value as `session_id` (LangGraph-style alias) |
| `company` | always `brasaland` |
| `agent_id` | always `brasaland_knowledge_assistant` |
| `status` | `idle`, `streaming`, or `interrupted` — server-assigned |
| `messages` | `{ "role": "user" \| "assistant", "content": "...", "created_at": "..." }` |
| `created_at` | ISO-8601 UTC, server-assigned |

## Streaming source

Not LangGraph. `query_stream()` yields OpenAI Chat Completions `delta.content` strings (the `messages`-mode equivalent). See the communication CONTEXT. Do not send `values` / `updates` graph state as tokens.

## WebSocket event contract

Endpoint: **`WS /knowledge/ws?token=...&session_id=...`** (`thread_id` accepted as an alias). Named events from the communication CONTEXT (not SSE ticket events, not a generic `message`):

- Client: `knowledge_auth` (first frame if no query token), `knowledge_user_message`, `knowledge_interrupt`
- Server: `knowledge_session`, `knowledge_token`, `knowledge_assistant_message`, `knowledge_error`

## Delivery

- Open `WS /knowledge/ws?token=...&session_id=...` from the knowledge assistant UI. `POST /knowledge/sessions` creates the thread first. Sign in with the same backoffice JWT as Part 1 (`mariana` / `brasaland`).
- Tokens appear as they are generated (`messages` mode → `knowledge_token.delta`).
- The agent **publishes** those events to an in-process pub/sub hub keyed by `session_id`; the WebSocket **subscribes** and consumes them (Redis is not required).
- `knowledge_interrupt` aborts the model stream and cancels the turn task so no further `knowledge_token` events are sent (not LangGraph HITL `interrupt()`).
- Reconnect with the same `session_id` restores `knowledge_session.messages` (thread checkpoint), not an empty chat.
