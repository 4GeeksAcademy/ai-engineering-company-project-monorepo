## Summary

`POST /telemetry/events` is the Brasaland collector. The URL is unchanged. The handler accepts `{ "events": [...] }` as raw items, validates each one with `TelemetryEvent.model_validate`, and inserts the valid rows into Supabase `public.telemetry_events` in one PostgREST request. The response is `{ "received", "stored", "rejected" }`. A batch with no valid events does not insert and still returns 200. A missing or unparseable envelope returns 422. Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` returns 503 at request time, so the API still starts without them.

`TelemetryEvent` is unchanged. The service-role key stays on the server. Placeholders are in the root `.env.example`.

Live check on commit `787c7cd` (no code changes in that run): the real table held **61 rows** — 58 from a headless Chromium session of the real backoffice, and 3 from `services/api/scripts/send_mixed_batch.sh`. There is no seed login. The run registered a local demo staff user with `POST /auth/register`.

## Row mapping

Documented in `docs/telemetry/telemetry-plan.md`.

| DB column | Source |
| --- | --- |
| `timestamp` | Envelope `timestamp` |
| `service` | Envelope `source`, or `backoffice` when that source is blank |
| `event_type` | Envelope `Event_type` |
| `level` | `error` for `api_error_raised` and `client_exception_caught`. `warn` for login failure, session expiry or rejection, auth-form rejection, inventory validation failure, direct stock-edit rejection, failed API or UI latency, and a rejected account update. Otherwise `info` |
| `value` | The numeric measure the plan names (`duration_ms`, `cost`, `amount`, `points`, `variance_pct`, `days_to_fill`, `threshold_minutes`). Otherwise null |
| `message` | Optional short summary |
| `tags` | Allowlisted `properties` (`docs/telemetry/property-allowlists.json`), CONTEXT dimensions (`location_scope`, `location_id`, `country`, `currency`, `timezone`), and envelope ids (`eventID`, `sessionID`, `UserID`, `requestID`, `SchemaVersion`) |

Location-scoped sale, inbound, and price-variance rows store `location_id` `co-med-centro`, `country` Colombia, `currency` COP, and `timezone` `America/Bogota` in `tags`.

## Indexes and append-only proof

Migration `supabase/migrations/20261006000000_telemetry_events.sql`:

- Indexes on `timestamp`, `event_type`, and a GIN index on `tags`
- Row level security enabled
- `UPDATE`, `DELETE`, and `TRUNCATE` revoked from `anon` and `authenticated`
- `BEFORE UPDATE OR DELETE` trigger calls `telemetry_events_immutable()`, which sets `search_path` to empty and raises `telemetry_events is append-only`

Live PostgREST, service role, against the mixed-batch `client_exception_caught` row:

```text
PATCH /rest/v1/telemetry_events?id=eq.bac0aa98-62df-4a59-8d1e-1dd57b0395ea
{"level":"error"}
→ HTTP 400 {"code":"P0001","details":null,"hint":null,"message":"telemetry_events is append-only"}

DELETE /rest/v1/telemetry_events?id=eq.bac0aa98-62df-4a59-8d1e-1dd57b0395ea
→ HTTP 400 {"code":"P0001","details":null,"hint":null,"message":"telemetry_events is append-only"}
```

The row count stayed 61.

## Per-event validation

The body is not typed as `list[TelemetryEvent]`. One invalid item does not 422 the batch. The loop calls `TelemetryEvent.model_validate` inside `try/except ValidationError`. Valid events are stored. Invalid events increment `rejected`.

## Mixed batch

`services/api/scripts/send_mixed_batch.sh` against the running API:

```json
{"received":4,"stored":3,"rejected":1}
```

Stored: `sale_completed`, `api_latency_recorded`, `client_exception_caught`. Rejected: `{"event_type":"section_viewed"}`. Copy: `docs/screenshots/mixed-batch.json`.

## Screenshots

**Supabase Table Editor screenshot will be added.**

The images below are from the live run (PostgREST rows rendered for capture, the real browser `POST /telemetry/events` response, and the mixed-batch command).

![Live telemetry_events rows](https://raw.githubusercontent.com/Rickycastro1940/ai-engineering-company-project-monorepo/cursor/telemetry-event-storage-46d7/docs/screenshots/telemetry-events-table.png)

![Browser POST /telemetry/events 200](https://raw.githubusercontent.com/Rickycastro1940/ai-engineering-company-project-monorepo/cursor/telemetry-event-storage-46d7/docs/screenshots/telemetry-batch-200.png)

![Mixed batch response](https://raw.githubusercontent.com/Rickycastro1940/ai-engineering-company-project-monorepo/cursor/telemetry-event-storage-46d7/docs/screenshots/mixed-batch-response.png)

## Stored rows by event_type

61 rows. **8 business, 53 technical.** Levels: 55 info, 5 warn, 1 error.

| event_type | rows | kind |
| --- | --- | --- |
| `flow_step_recorded` | 23 | technical (navigation) |
| `api_latency_recorded` | 20 | technical (performance). 3 warn: `POST /auth/login` 401, `POST /orders/inbound` 400, `PATCH /inventory/{id}` 400 |
| `section_viewed` | 7 | technical (navigation) |
| `sale_completed` | 2 | business (1 from the UI, 1 from the mixed batch) |
| `inbound_order_created` | 2 | business (scheduled cost 222000 COP, emergency cost 22680 COP) |
| `ingredient_price_variance_detected` | 2 | business |
| `stock_count_adjusted` | 1 | business (inventory). Delta −2 on-hand correction |
| `direct_stock_edit_rejected` | 1 | business / inventory rejection (warn). Delta −999999 was refused |
| `user_login_succeeded` | 1 | technical (auth) |
| `user_login_failed` | 1 | technical (auth, warn) |
| `client_exception_caught` | 1 | technical (error, from the mixed batch) |

Browser captures, all HTTP 200: `{"received":20,"stored":20,"rejected":0}`, `{"received":20,"stored":20,"rejected":0}`, `{"received":1,"stored":1,"rejected":0}`, `{"received":17,"stored":17,"rejected":0}`.

**Outbound orders.** Brasaland has no outbound endpoint and no outbound form. `POST /orders/inbound` is the only order writer, and the plan marks outbound as a future writer. There are 0 `outbound_order_created` rows. The real stock decrease in this run is the `stock_count_adjusted` correction of −2. No outbound row was invented.

## Frontend

The frontend did not change.

```text
git diff --stat cursor/telemetry-event-capture-02f6 -- uis
```

That command prints nothing.

## Known follow-up

The Monday pipeline extractor in `data/pipelines/pipeline.py` still selects `id, event_type, created_at, event_payload`. This collector table does not have `created_at` or `event_payload`. Purchase and waste cost is copied into `value`, and `location_id`, `country`, and `currency` stay in `tags`.
