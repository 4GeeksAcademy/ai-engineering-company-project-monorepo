# Brasaland portal

Next.js (App Router, TypeScript) portal for **Brasaland** (see root [`CONTEXT.md`](../../CONTEXT.md)).

| Route | Who it serves | `CONTEXT.md` need |
| --- | --- | --- |
| `/` | Guests and staff | Entry to the two screens below |
| `/points`, `/points/[customerId]` | Guests | **Marketing** (Camila Ospina) — digital Brasa Points: look up an account, balance, history, rewards |
| `/ops/sales` | Staff | **Restaurant Operations** (Felipe Guerrero) and **Executive** (Mariana Restrepo) — sales by location in **COP and USD** |

`uis/website/` stays the public marketing site. `uis/backoffice/` stays the Vite staff console. `uis/web/` stays the incident tool.

## Run

```bash
cd uis/portal
npm install
npm test
npm run dev
```

Open `http://localhost:3000`.

Production check:

```bash
npm run build
npm start
```

### Sample guests (fixture mode)

Look up any of these on `/points`:

| Guest | Id | Email | Market |
| --- | --- | --- | --- |
| Ana Morales | `cus-001` | `ana.morales@guest.brasaland.example` | Colombia |
| Carlos Restrepo | `cus-002` | `carlos.restrepo@guest.brasaland.example` | Colombia |
| Sofia Alvarez | `cus-005` | `sofia.alvarez@guest.brasaland.example` | Florida |
| James Walker | `cus-006` | `james.walker@guest.brasaland.example` | Florida |

Points use the programme rules in `docs/company-knowledge-base/brasaland-loyalty-program.en.md`: 10,000 COP or 10 USD = 1 point; Bronze / Silver / Gold rewards; redemption from 15 points in steps of 5.

## Data source

Default is **fixtures**, so the portal runs without the API. The client understands:

Live mode targets the central API on draft PR #89 (`cursor/central-api-nouns-5989`):

- `GET /customers` and `GET /customers/{id}` — `brasa_points_balance`, `loyalty_tier` (`bronze` / `silver` / `gold`), `uses_stamp_card`, and `order_history[]` with `menu_item_id`, `location_id`, `ordered_on` (no spend on the order). The portal shows that stamp-card balance and does not invent points from those orders.
- `GET /sales` — ticket rows with `location_id`, `currency`, `amount`, `amount_cop`, `amount_usd`, `covers`, and `occurred_at`. The portal rolls tickets up to one row per location. `GET /sales/overview` (`{ locations: [...] }` with `amount_local`) is accepted as-is.

If `amount_cop` / `amount_usd` are missing, the portal converts at **4,000 COP = 1 USD** (illustrative, not a live FX feed). The seeded sales week is **2026-09-14**.

Switch to the central API (the app `uvicorn api.app:app` loads):

```bash
BRASALAND_DATA_SOURCE=live \
BRASALAND_API_BASE_URL=http://127.0.0.1:8000 \
BRASALAND_API_TOKEN='<staff JWT from POST /auth/login>' \
npm run dev
```

`BRASALAND_API_TOKEN` is read on the server and sent as `Authorization: Bearer`. Do not commit it. If `BRASALAND_DATA_SOURCE=live` and the API is down, the portal falls back to fixtures and says so. A live `404` for a guest stays “not found” and is not replaced with fixture points.

`NEXT_PUBLIC_BRASALAND_DATA_SOURCE` and `NEXT_PUBLIC_BRASALAND_API_BASE_URL` are accepted as aliases. Prefer the server names so the token never needs a `NEXT_PUBLIC_` variable.

Until the customers API stores spend, a live customer with orders but no amounts shows history **without** a calculated balance. Fixture guests include spend so Marketing can review the points experience now.

## Tests

```bash
npm test
```

Covers earn/redeem math, COP/USD conversion, payload shapes, the env switch, and the fixture fallback.
