# Live no-sales alerts

Department: **Restaurant Operations** (Felipe Guerrero) — alert when a location shows no sales during opening hours. **Technology** (Nicolás Park) — real-time telemetry on the central API.

The staff console (`uis/backoffice`, route `/accessible`) subscribes to a Server-Sent Events stream. A banner, a short toast, and a list update without a reload. Recording a sale clears that location.

## Why SSE

Alerts are server → client only. SSE keeps one HTTP response, named events, keep-alive comments, and `Last-Event-ID` replay. The console sends the same staff JWT with `fetch` + `ReadableStream`, because `EventSource` cannot set `Authorization`. Reconnect waits 1s, 2s, 4s, 8s, 16s, then 30s.

Draft PR **#53** (`feature/sse-notifications`) used this shape for emergency-order and waste tickets on an older backoffice. Draft PR **#54** (`feature/websocket-chat`) used a WebSocket for a bidirectional knowledge chat. Those branches also rewrite briefing files and are far from current `main`. This channel keeps the SSE ideas that still fit (JWT `fetch` stream, named events, replay, backoff) and does not merge either PR. **#53 and #54 can be closed.** They do not implement this alert, and rebasing them onto `main` would fight the current API and the Vite staff console.

## Routes

Mounted from `services/api/no_sales_router.py` onto `uvicorn api.app:app`. Alert paths stay under `/realtime`. The `/sales` noun is the sales router.

| Method | Path | Auth | Role |
| --- | --- | --- | --- |
| `GET` | `/realtime/ops-alerts` | Bearer JWT | Current alerts |
| `GET` | `/realtime/ops-alerts/stream` | Bearer JWT | SSE: `ops_alert_snapshot`, `no_sales_alert`, `no_sales_cleared`, `sale_recorded` |
| `POST` | `/realtime/ops-alerts/simulate` | Bearer JWT | Grader: `{"location_id","action":"quiet"\|"resume"}` |

Unauthenticated calls return **401**.

## Detection

- 14 locations from `location_roster()` (Colombia `America/Bogota` / COP, Florida `America/New_York` / USD).
- Open every day from `NO_SALES_OPEN_HOUR` (default **11**) inclusive until `NO_SALES_CLOSE_HOUR` (default **22**) exclusive, in the location's timezone.
- Alert when the quiet stretch is at least `NO_SALES_WINDOW_MINUTES` (default **30**). Quiet time starts at today's opening, or at the last sale if that sale was during today's service.
- A location with **no sale history** stays silent. That avoids alarming all 14 sites before a POS feed exists. The simulator plants a history anchor and forces the site open for 30 minutes so a grader can trigger it at any wall-clock time.
- A background sweep (`NO_SALES_POLL_SECONDS`, default 15; `NO_SALES_MONITOR=0` disables it) re-evaluates during service.
- An alert stays up through close. It clears when a sale is recorded inside the window.

## Hook from `POST /sales`

`POST /sales` (Bearer JWT) appends the ticket to the same in-memory list `GET /sales` reads, then calls `record_sale` in `services/api/sales_events.py`. A sale during opening hours clears that location's no-sales alert and keeps a quiet location from raising one. Unknown locations return **404**. A currency other than the location's own COP or USD returns **400** (a value that is not COP or USD is **422**).

```python
from sales_events import record_sale

record_sale(
    location_id=sale.location_id,
    amount=str(sale.amount),  # decimal string, COP or USD, not a float
    currency=sale.currency,   # must match the location
    occurred_at=sale.occurred_at,  # timezone-aware
)
```

`services/api` is on `sys.path` when `api.app:app` loads. `record_sale` notifies the detector, which publishes `sale_recorded` and `no_sales_cleared` when that location was alerting.

## Run it

```bash
# Terminal 1 — monorepo root
JWT_SECRET_KEY=brasaland-dev-secret uvicorn api.app:app --reload --host 127.0.0.1 --port 8000

# Terminal 2
cd uis/backoffice
npm install
npm run dev
```

Open `http://127.0.0.1:5174/login`, register or sign in, and stay on **Accessible entry**.

On that page:

1. Status shows **Live**.
2. Choose a location (Medellín Centro is COP, Miami Brickell is USD).
3. **Simulate no sales** — banner, toast, and list appear without reload.
4. **Record a sale** — toast says the alert cleared and the row leaves the list.

Or, with the API up and the page open:

```bash
python scripts/simulate_no_sales.py quiet --location co-med-centro
python scripts/simulate_no_sales.py resume --location co-med-centro --amount 48000
python scripts/simulate_no_sales.py quiet --location us-mia-brickell
python scripts/simulate_no_sales.py resume --location us-mia-brickell --amount 36.00 --currency USD
```

The script registers `grader.ops@brasaland.test` / `secret-password` if that account is missing.

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/realtime/ops-alerts/stream
# 401
```

## Tests

```bash
NO_SALES_MONITOR=0 python -m pytest tests/test_no_sales_alerts.py -q
node --experimental-strip-types --test uis/backoffice/tests/noSalesAlerts.test.ts
```

The backoffice has no Vitest/Jest runner. The stream reducer and SSE parser are covered with Node's built-in test runner so `package.json` stays unchanged.
