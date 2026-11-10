# TrackFlow Telemetry Plan

**Status:** Design baseline for telemetry capture, storage, and operational reporting
**Schema version:** `1.0.0`
**Scope:** TrackFlow operations backoffice and its FastAPI API. The mandatory metric names and inventory dimensions below are taken from `trackflow-BRIEFINGTelemetry.md`.

> This is a design document. In particular, several mandatory inventory events describe audit/threshold capabilities that the current app does not yet expose. They remain in the contract, but must only be emitted when the corresponding real workflow or rejection occurs; do not fabricate events from unrelated actions.

## 1. Goals and decisions supported

The event stream is intended to support warehouse operations (Ana), client stock-risk actions (Miguel), and engineering operations. Inventory data must remain segmentable by `warehouse`, `client_id`, `product_category`, and SKU `product_id` so later reporting can compare Los Angeles with Zaragoza and clients without changing the event contract. Inventory events describe warehouse stock only: no carrier, recipient, address, shipment tracking number, or other end-consumer data is allowed.

The stock invariant is unchanged: stock is never set directly; every stock change must be represented by an inbound or outbound order and attributable to the authenticated actor through the envelope's pseudonymous `userId`. A rejected direct-write attempt is an audit event, not a successful stock mutation.

## 2. Event envelope and data handling

Every event has exactly these envelope fields, plus its event-specific `properties` object:

| Field | Contract |
|---|---|
| `eventId` | UUID v4 generated at capture time; unique per event. |
| `timestamp` | ISO 8601 date-time in UTC, captured when the event occurs (not batch-send time). |
| `sessionId` | Random opaque session UUID, rotated on successful login; `null` for anonymous attempts and before session creation. Never a token. |
| `userId` | `null` for anonymous events; otherwise an opaque UUID scoped to the current authenticated session. Generate independently of the account ID, rotate on successful login, and clear on logout/session expiry. Never email, name, token, or raw auth/database ID. It intentionally cannot link activity across sessions. |
| `event_type` | Exact allowlisted `entity_action` name from the catalogue below. |
| `schemaVersion` | Constant `1.0.0`. |
| `requestId` | UUID used to correlate the UI action with API logs. Reuse a server-provided request ID only if it is validated and contains no user data; otherwise generate one at capture. |
| `properties` | Only the keys listed for that event in `event-schemas.json`; no arbitrary context spread. |

The envelope permits null identity fields because login failures, public-page navigation, and pre-session errors occur without an authenticated user. `sessionId` and `userId` are nullable, not omitted. `userId` is a second random UUID, not a derivative of `sessionId` or account identity, but both are scoped to the same authenticated session and rotate together at login. This permits within-session actor grouping only; cross-session user analytics are deliberately unavailable. The complete JSON Schema is in [`event-schemas.json`](./event-schemas.json); it rejects unknown envelope or event property keys and constrains `event_type` to the catalogue.

### Identifier mapping to the current app

The current inventory API stores warehouse codes `LA`/`ZGZ`, product `client_name`, and an internal integer SKU `id`; the briefing's telemetry vocabulary is canonical: warehouse values `los_angeles`/`zaragoza`, `client_id`, and `product_id` as the client-facing SKU code. Capture adapters must translate `LA → los_angeles`, `ZGZ → zaragoza`; derive `client_id` from an approved stable client registry/slug (do not silently treat a display name as an ID); and send the SKU code rather than the SQL primary key. This repo currently has no stable client-ID field/registry, so that mapping is a prerequisite for trustworthy client-level breakdowns. If it cannot be resolved, do not emit a fabricated ID; block/flag the event and complete the mapping before production capture.

## 3. Event catalogue

Every row includes a concrete hypothesis and decision. “Mandatory” means named by the TrackFlow briefing. “Opportunity” means proposed here. The mode is the initial delivery/processing priority; the frontend may still queue all events and deliver them in batches.

### 3.1 Mandatory inventory metrics (5)

| `event_type` | Class | Trigger and hypothesis → decision | Processing | Current app fit |
|---|---|---|---|---|
| `inbound_order_created` | Mandatory | After a committed receipt. We need incoming unit volume by client and warehouse → plan warehouse capacity and staffing (Ana). | Batch; daily staffing/capacity planning tolerates periodic rollups; surface exceptional high-volume spikes to operations separately. | Inbound write exists; emit only after successful commit. |
| `outbound_order_created` | Mandatory | After a committed dispatch. We need outbound order count/quantity by client and warehouse over time → detect throughput bottlenecks before delivery SLA is affected (Ana). | Stream; an unusual fall in dispatch throughput is operationally urgent and should be visible during the shift. | Dispatch exists; emit only after successful commit, not for losses. |
| `stock_threshold_triggered` | Mandatory | When available stock crosses from at/above minimum to below it. We need SKU stock-risk frequency by client/warehouse → alert the client/commercial team before stockout (Miguel). | Stream; the alert is useful only while there is time to replenish. | No configured minimum or threshold-crossing alert currently exists; add threshold source and crossing transition before emitting. Avoid repeat events on every read. |
| `direct_stock_edit_rejected` | Mandatory | When a user/process tries to write stock outside an order and the API rejects it. We need to know where traceability bypass attempts occur → reinforce training or permissions at the affected warehouse. | Stream; repeated/active bypass attempts should be visible promptly to operations/security. | No direct stock-write route exists (the invariant is enforced by absence). Emit only if a future/import/admin path actually receives and rejects such an attempt; do not infer it from failed inbound/outbound validation. |
| `inventory_discrepancy_detected` | Mandatory | When a physical stock count/audit is compared and differs from system quantity. We need discrepancy frequency by SKU and warehouse → prioritize audits on high-discrepancy SKUs. | Batch; count/audit trends are periodic operational review, unless a severe discrepancy triggers a separate alert. | No physical count/audit flow currently exists; emit when one is introduced. `quantity` is the absolute difference; retain system/physical quantities in the event for auditability. |

For all five mandatory inventory events, the briefing-required dimensions are present: `warehouse`, `client_id`, `product_id`, `product_category`, and `quantity`. The events have only the extra properties explicitly listed below; customer/recipient details are excluded.

### 3.2 Additional identified opportunities (12)

| `event_type` | Class | Hypothesis → decision | Processing | Why this helps / trigger |
|---|---|---|---|---|
| `inventory_validation_failed` | Opportunity — inventory quality | We need to know which bounded validation codes cluster by operation/SKU/warehouse → fix recurring product data, training, or form/API validation. | Batch; aggregate trends can be acted on daily; alert separately on unusual spikes. | Failed SKU/order validation; no raw invalid values or error text. |
| `inventory_products_viewed` | Opportunity — navigation/operations | We need to know whether operators use the catalog and which allowed warehouse/category slices they inspect → prioritize catalog usability and inventory visibility. | Batch; usage distribution is not time-critical. | Catalog load success, with bounded result count and optional allowed filters. |
| `login_succeeded` | Opportunity — authentication | We need successful login volume/time distribution → plan access support and distinguish normal usage from failed-login patterns. | Batch; aggregate usage is not urgent. | Successful auth only; no credential values or token. |
| `login_failed` | Opportunity — authentication/security | We need failed attempts by sanitized reason → detect credential trouble or abuse and decide whether to improve recovery, support, or rate limits. | Stream; abnormal failure bursts can indicate active abuse or lockout incidents. | Reasons limited to `invalid_credentials`, `network_error`, `rate_limited`; never email, password, IP, or entered username. |
| `session_expired` | Opportunity — authentication/reliability | We need frequency and route of unexpected expiry → adjust session lifetime/refresh behavior or fix avoidable 401s. | Stream; a wave of forced re-authentication interrupts active warehouse work. | Capture once when a protected request triggers auth clearing/redirect, not on every retry. |
| `navigation_page_viewed` | Opportunity — navigation | We need visits by safe route name → prioritize backoffice sections and training. | Batch; navigation mix is a periodic product decision. | Main route change; only enumerated route templates, no query or path identifiers. |
| `flow_abandoned` | Opportunity — workflow usability | We need to know which order/supplier/incident flows stop after starting → simplify or clarify high-friction steps. | Batch; funnel rates can be reviewed daily/weekly. | Emit only when a started flow is explicitly left before success (route change/unload); one event per flow instance. |
| `api_latency_recorded` | Opportunity — performance | We need latency/status by route template and method → prioritize slow or failing API routes and capacity work. | Stream; current degradation should page/alert during an incident; store granular events and roll up. | Selected API calls, duration and status only; no query/body/IDs. |
| `frontend_error_captured` | Opportunity — errors | We need classified uncaught UI errors by route → prioritize fixes by frequency and affected view. | Stream; an error spike can block critical warehouse workflows. | `window.onerror`, unhandled rejection, or route error boundary; use stable error codes, not raw messages/stacks. |
| `web_vital_recorded` | Opportunity — performance | We need Core Web Vitals by route → prioritize slow interaction/rendering work. | Batch; a statistically useful trend is sufficient and an individual vital is not actionable immediately. | Web Vitals metric/value + safe route; report only one final metric per navigation/metric ID. |
| `supplier_action_completed` | Opportunity — backoffice usage | We need outcome counts by bounded supplier action → identify operational friction and decide whether to improve supplier maintenance workflows. | Batch; these are periodic adoption/reliability measures. | Successful/failed create/rate/status/delete outcome; no supplier name or contact data. |
| `incident_action_completed` | Opportunity — backoffice usage | We need outcome counts by incident create/status action → find failure-prone support workflows and decide where validation/UI/API investment is needed. | Batch; operational trend is generally reviewed periodically. | Outcome/action only; no incident title, description, customer, address, or free text. |

### 3.3 Property allowlists, PII, and sanitization

The exact schema and type constraints are normative in `event-schemas.json`. For clarity, the property allowlists are repeated here:

| Event | Only allowed `properties` keys | PII / sensitivity and handling |
|---|---|---|
| `inbound_order_created` | `warehouse`, `client_id`, `product_id`, `product_category`, `quantity` | Business-sensitive client/SKU activity. Use approved stable client ID and SKU code; access-control telemetry store. No consumer data. |
| `outbound_order_created` | `warehouse`, `client_id`, `product_id`, `product_category`, `quantity` | Same as inbound. Do not include carrier, recipient, tracking number, or address. |
| `stock_threshold_triggered` | `warehouse`, `client_id`, `product_id`, `product_category`, `quantity`, `minimum_stock` | Client/SKU commercial sensitivity. Use pseudonymous/approved business IDs; no recipient data. |
| `direct_stock_edit_rejected` | `warehouse`, `client_id`, `product_id`, `product_category`, `quantity`, `rejection_code` | User identity is envelope pseudonym. Use a fixed rejection code; never capture submitted raw body. |
| `inventory_discrepancy_detected` | `warehouse`, `client_id`, `product_id`, `product_category`, `quantity`, `system_quantity`, `physical_quantity` | Sensitive inventory audit data. Restrict access and retention; `quantity = abs(physical_quantity-system_quantity)`. |
| `inventory_validation_failed` | `operation`, `validation_code`, `warehouse`, `product_id`, optional `product_category` | SKU code is business-sensitive; only emit a validated known code and canonical identifiers, not invalid raw inputs or exception text. |
| `inventory_products_viewed` | optional `warehouse`, `product_category`, `result_count` | No direct PII; omit search text and user-entered filters. |
| `login_succeeded` | optional `auth_method` | Envelope user ID is pseudonymous; never capture credential, email, token, or IP. |
| `login_failed` | `reason` | Anonymous envelope identity; strictly bounded reason enum, no entered email/username/password, IP, or raw response. |
| `session_expired` | `reason` | Pseudonymous envelope; fixed reason enum; no token or raw request URL. |
| `navigation_page_viewed` | `route` | Fixed route allowlist; strip query string, fragment, dynamic IDs, and user-supplied path. |
| `flow_abandoned` | `flow`, `last_step` | No form values or free text. Do not capture event for a flow that was never started. |
| `api_latency_recorded` | `route`, `method`, `status_code`, `duration_ms` | Route template only; no URL params, query values, body, token, or response text. |
| `frontend_error_captured` | `error_kind`, `error_code`, `route` | Error messages/stacks may include PII/secrets; discard them and emit only stable sanitized code + allowlisted route. |
| `web_vital_recorded` | `metric_name`, `value`, `route` | No PII. Route is allowlisted template. |
| `supplier_action_completed` | `action`, `result` | Do not include supplier IDs/names, contact details, or mutation values. |
| `incident_action_completed` | `action`, `result` | Incident descriptions/titles can contain customer PII; do not include them or incident IDs. |

The JSON schema uses `additionalProperties: false` for envelope and each property object. Do not merge arbitrary component state into `properties`. `event_type` conditionals select the event-specific definition; property objects with keys from a different event are invalid. Canonical client/SKU values are bounded safe identifiers; routes are closed allowlists rather than arbitrary strings.

## 4. Trigger semantics and processing strategy

- `inbound_order_created` and `outbound_order_created` fire **after** the database transaction commits. A failed write must not be reported as a created order.
- `stock_threshold_triggered` is a crossing event: emit only on transition `previous_stock >= minimum_stock` and `current_stock < minimum_stock`. Re-arm only after stock returns to or above minimum. This prevents repeated events on each catalog read.
- `direct_stock_edit_rejected` is emitted only at a real rejection boundary. Current APIs do not have a direct stock-edit endpoint, so there is no present event to capture.
- `inventory_discrepancy_detected` needs a physical-count/audit source. Do not synthesize it from ordinary stock movement or failed validation.
- `inventory_validation_failed` must classify known validation outcomes; do not copy exception messages, submitted fields, or arbitrary backend errors.
- Batch/stream describes urgency of downstream handling. The proposed browser service can queue events and send batches; stream-priority items must be flushed promptly/alerted once received, while batch events can be rolled into scheduled reports.

## 5. Throttle, debounce, and deduplication

1. Queue client-side in memory and post a batch every 10 seconds or at 20 events, whichever comes first; stamp event timestamp at capture time. On `visibilitychange` to hidden/page teardown, attempt a `sendBeacon` batch. Retry failed batch delivery at most three times with exponential backoff (1s, 2s, 4s); then discard without blocking the operator.
2. Debounce navigation tracking to one `navigation_page_viewed` per route entry. Do not emit for every React render.
3. Emit one `web_vital_recorded` per `(navigation, metric_name, metric_id)`; use the final reported value from the Web Vitals callback.
4. API latency events only cover an explicit allowlist of relevant calls and use route templates. Do not instrument the telemetry endpoint itself. Avoid recursive failure/latency events for telemetry transport failures.
5. `flow_abandoned` uses one opaque in-memory flow instance marker; clear it on success, and send at most one abandon event when a started flow is left. Do not persist form contents or flow identifiers.
6. Threshold events use crossing/re-arm semantics above. Repeated identical validation failures may be locally rate-limited to at most one event per `(event_type, validation_code, route, product_id)` in a 30-second window; incremented event counts should be handled only if a later schema version explicitly adds an aggregate count.
7. The receiver should cap batch size and event/property string lengths (final values to be agreed in Part 2/3); ingestion limits must not silently truncate allowed identifiers.

## 6. Risks and exclusions

### Risks / prerequisites

- The application currently has no stable `client_id` registry; it stores `client_name`. A canonical client ID mapping is needed before mandatory client segmentation is reliable. The current record also shows a category, not a verified per-client category constraint; do not claim category belongs to an individual client unless that is confirmed.
- The current app has no configurable minimum-stock thresholds, explicit direct-stock-edit route, or physical count/audit workflow. Those three mandatory metrics are designed now but cannot be truthfully emitted until their trigger sources exist.
- API warehouse values currently use `LA`/`ZGZ`; telemetry canonical values must map explicitly to `los_angeles`/`zaragoza`.
- The current authenticated user has an internal integer ID. Telemetry identity is an independently generated session-scoped UUID; do not derive it from that ID. It is cleared on logout/session expiry, so cross-session analytics are unsupported by design.
- Browser storage and `sendBeacon` are best-effort. Telemetry loss must never block order commits or user workflows; backend receipt and future persistence should report rejected events without retry loops.
- In-memory queues are lost on crashes/tab termination where beacon is unavailable. If loss becomes unacceptable, evaluate durable browser queueing only after privacy and logout/shared-device behavior are designed.
- Stream priority does not itself mean a guaranteed real-time SLA. Alerting latency and escalation thresholds must be defined by operations before production.

### Explicitly excluded

- Recipient name, address, email, phone, delivery instructions, tracking number, carrier, and consumer shipment identifiers: outside warehouse telemetry scope and high-risk PII.
- Passwords, password hashes, auth/reset/access tokens, email addresses, raw IP addresses, raw user-agent strings, and raw request/response bodies: not needed for these hypotheses and too sensitive.
- Free-text error messages, stack traces, form values, incident descriptions, supplier contacts, and arbitrary route/query strings: may contain secrets or customer data; stable sanitized codes are sufficient.
- Every React render, keystroke, mouse movement, or focus event: high-volume, intrusive, and not tied to a concrete current decision. Capture page entry and meaningful workflow outcomes instead.
- High-cardinality raw identifiers beyond approved `client_id`/SKU code dimensions: avoid database primary keys and request/session identifiers as report dimensions; use envelope IDs only for correlation and controlled retention.
- A “direct edit attempt” inferred from an inbound/outbound validation failure: these are different business events and must not be conflated.

## 7. Schema evolution and implementation notes

The JSON file is the normative allowlist for envelope and property structures. Any new event or property requires a schema version/review and an explicit hypothesis + decision in this plan. Keep additive changes backward-compatible where possible; do not repurpose an existing property with a new meaning. Capture-side constants and backend validation must use the same taxonomy. The first implementation should validate event type/property combinations, enforce payload size and batch limits, log only counts and event types, and never log sensitive event payloads.

## 8. Catalogue count

**17 event types:** 5 mandatory from the TrackFlow briefing and 12 identified opportunities. Categories covered: inventory/business operations, inventory quality, authentication/security, navigation/adoption, workflow abandonment, API performance, frontend errors, Web Vitals, supplier operations, and incident operations.
