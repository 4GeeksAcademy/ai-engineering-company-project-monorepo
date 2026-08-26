# SSE notifications (Part 1)

Brasaland live notifications are **emergency orders** and **waste escalations** — not RFP tickets. The backoffice dashboard consumes `GET /notifications/stream`. Field names below are required.

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

### Manual check

1. Sign in at `/backoffice/` as `mariana` / `brasaland`.
2. File an `emergency_order` for `miami-downtown` — it should appear live with a **New** chip (no page reload).
3. In DevTools, block `/notifications/stream`, file a `waste_escalation`, then unblock.
4. The missed ticket should appear once. The same `ticket_id` must never render twice.
