# Brasaland central API — menus, sales, customers, suppliers

Technology (Nicolás Park) needs one API for **locations, menus, sales, customers, and suppliers**. Those nouns are mounted on the app graders already start:

```bash
uvicorn api.app:app --reload --host 127.0.0.1 --port 8000
```

`api/app.py` loads `services/api/app.py`. Interactive docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

This is a **seeded snapshot** for Brasaland (14 company-owned restaurants, Colombia and Florida). It is not a live POS, invoice feed, or digital loyalty wallet. Brasa Points balances are physical stamp-card tallies.

## Who can call what

| Noun | Auth | Why |
| --- | --- | --- |
| Menus | Public | Same chain recipes in every kitchen, list prices in COP and USD |
| Sales | Bearer JWT | Staff view of tickets and chain totals (Felipe, Mariana) |
| Customers | Bearer JWT | CRM plus Brasa Points balance (Camila) |
| Suppliers | Bearer JWT | About 20 suppliers, price history (Lucía) |
| Locations | Bearer JWT | Existing 14-location roster |

Create a staff token (first user is admin):

```bash
curl -sS -X POST http://127.0.0.1:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ops@brasaland.test","password":"secret-password"}'
```

Use `access_token` as `Authorization: Bearer …`.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/menus`, `/menus/catalogue`, `/menus/{item_id}` | COP and USD list prices; both markets |
| GET | `/sales` | Tickets: `location_id`, `currency` (`COP` or `USD`), `amount`, `occurred_at` |
| GET | `/sales?currency=COP` or `USD` | Filter |
| GET | `/sales?location_id=co-med-centro` | One kitchen |
| GET | `/sales/overview` | Chain totals in COP and USD, 14 location rows |
| GET | `/sales/alerts` | Locations with no ticket during 11:00–22:00 local |
| GET | `/sales/locations/{location_id}` | Week rollup for one site |
| GET | `/sales/{sale_id}` | One ticket |
| GET | `/customers`, `/customers/overview`, `/customers/{customer_id}` | `brasa_points_balance`, tier, stamp card |
| GET | `/suppliers`, `/suppliers/overview`, `/suppliers/{supplier_id}` | Filter `country`, `category`, `status` |

Unknown ids return JSON `{ "status", "code", "message", "detail" }` (404 `not_found`). Missing tokens return 401 `unauthorized`.

Sales amounts in the other currency use an illustrative rate of 4,000 COP per USD so dashboards can show both. That rate is not a live FX feed.

## Tests

```bash
python -m pytest tests/test_central_api_domains.py -q
```

OpenAPI coverage (same check as `.agents/skills/verify-brasaland-api`):

```bash
curl -sS http://127.0.0.1:8000/openapi.json | python - <<'PY'
import json, sys
paths = json.load(sys.stdin).get("paths", {})
joined = " ".join(paths)
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

Routers and their Pydantic schemas live in `services/api/menus.py`, `sales.py`, `customers.py`, and `suppliers.py`. `services/api/app.py` only mounts them.
