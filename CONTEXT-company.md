# Brasaland — Company Context

Grilled-food restaurant chain operating in **Colombia** and **Florida (US)**.

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
- **API:** `POST /knowledge/query`
  - Request: `{ "question": "..." }`
  - Response: `{ "answer": "..." }` (model-generated string only — never chunks, scores, or Qdrant payloads)
- **Currency:** Keep USD $ and COP $ exactly as written — never convert.
- **Allergens:** Never claim "zero risk" or "100% safe"; follow source wording.
- **Unknown answers:** Respond with *"There is not enough information available."*
- **Audience:** Commercial and operations teams (salesperson perspective).

## Key people

- **Mariana** — CEO
- **Felipe Guerrero** — Operations Director (waste escalation)
- **Lucía Fernández** — Procurement Manager (emergency order approval > 500 USD)

## Domain identifiers already used in this repo

- **Company slug:** `brasaland`
- **Ticket / incident id prefix:** `BRS-` (e.g. `BRS-000001`)
- **Locations:** `miami-downtown` (Florida, USD), `bogota-norte` (Colombia, COP), `COL-01` … `COL-10`
- **Waste categories (source wording):** `expiration`, `kitchen_error`, `unexplained_shrinkage`
- **Premium proteins (escalation):** `tenderloin`, `ribs`

## Operational tickets (real-time notifications)

Brasaland does **not** use RFP tickets. Live notifications are **emergency orders** and **waste escalations**. Field names and values below are required.

Shared fields on every ticket:

| Field | Domain value |
|-------|----------------|
| `ticket_id` | Server-assigned `BRS-000001`, … |
| `ticket_type` | `emergency_order` or `waste_escalation` |
| `location_id` | e.g. `miami-downtown`, `bogota-norte`, `COL-01` |
| `status` | Server-assigned initial status — clients must not set it |
| `assignee` | `Lucía Fernández` or `Felipe Guerrero` when a rule fires; otherwise null |
| `company` | always `brasaland` |
| `created_at` | ISO-8601 UTC, server-assigned |

SSE event names (not a generic `message`, not `rfp_ticket_created`):

- `emergency_order` → `emergency_order_created`
- `waste_escalation` → `waste_escalation_created`

Payload always includes `ticket_id` and `status`.

### Emergency order (`ticket_type: emergency_order`)

Raised when protein stock would fall below **3 days** before the next scheduled delivery (8% surcharge). Extra fields: `amount_usd`, `currency` (`USD` or `COP` — never convert), `protein_days_remaining`.

**Initial status**

- `pending_approval` when `amount_usd` **> 500** — assignee is **Lucía Fernández**
- `open` otherwise — `assignee` is null

### Waste escalation (`ticket_type: waste_escalation`)

Logged per shift in `expiration`, `kitchen_error`, or `unexplained_shrinkage`. Extra fields: `category`, `kg`, `protein` (optional), `consecutive_shrinkage_weeks` (optional).

**Initial status**

- `escalated` — assignee **Felipe Guerrero** — when premium protein (`tenderloin` or `ribs`) waste **> 5 kg** in a week, or `consecutive_shrinkage_weeks` **≥ 3**
- `open` otherwise (explanatory note still required when meat protein waste **> 2 kg** in a shift)

### Delivery

- Auth: `POST /auth/login` issues the backoffice JWT (`aud: brasaland-backoffice`) for Mariana, Felipe Guerrero, and Lucía Fernández
- Polling: `GET /tickets` (Bearer JWT)
- Create: `POST /tickets` (Bearer JWT) — emits `emergency_order_created` or `waste_escalation_created`
- Real-time: `GET /notifications/stream` (`Content-Type: text/event-stream`, keep-alive comments). The backoffice consumes it with `fetch` + `ReadableStream` and `Authorization: Bearer` (not EventSource). Reconnects with progressive backoff and recovers missed events via `Last-Event-ID` replay plus a ticket-list refetch, deduplicated by `ticket_id`. Unauthenticated clients receive no events.

### SSE reconnection (manual check)

Automated coverage lives in `tests/api/test_sse_wire.py` and `tests/api/test_sse_reconnect.py`. To verify in the browser:

1. Sign in at `/backoffice/` as `mariana` / `brasaland`.
2. File an `emergency_order` for `miami-downtown` — it should appear live with a **New** chip (no page reload, KPIs unchanged).
3. In DevTools, block `/notifications/stream`, file a `waste_escalation` for `bogota-norte` or `COL-01`, then unblock the stream.
4. The badge should show reconnect delays of 1s, 2s, 4s, … and the missed ticket should appear once. The same `ticket_id` must never render twice.
