# Brasaland Supplier API

FastAPI service for the supplier directory defined in [CONTEXT.md](../../CONTEXT.md).
Migrated from `Itzidon/brasaland-hito-2`, branch `hito-09-suppliers`.
No incident-analysis modules or endpoints are required.

## Run

From the repository root (Python 3.11+ and uv):

```bash
uv sync --locked
uv run seed
uv run uvicorn services.api.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000/docs for the API schema.
The Next.js directory runs separately at http://localhost:3000/suppliers.

## Routes

| Method | Path                     | Result                                                 |
| ------ | ------------------------ | ------------------------------------------------------ |
| POST   | `/suppliers`             | Register supplier (201); duplicate name (409)          |
| GET    | `/suppliers`             | List/filter by `country`, `category`, `status` (200)   |
| GET    | `/suppliers/{id}`        | Retrieve supplier (200)                                |
| PATCH  | `/suppliers/{id}/rate`   | Update positive rate and `updated_at` (200)            |
| PATCH  | `/suppliers/{id}/status` | Activate/suspend without changing rate timestamp (200) |
| DELETE | `/suppliers/{id}`        | Correct erroneous data (204)                           |

Every route is also available at `/api/suppliers` for frontend compatibility.
Invalid payloads/filters return 422; missing suppliers return 404.
Colombia requires COP; USA requires USD. Categories and statuses follow CONTEXT.
Normal operations suspend suppliers rather than deleting them.

## Storage and Seed

TinyDB stores local data in `services/api/data/suppliers.json` (gitignored).
Set `SUPPLIERS_DB_PATH` to override its location, including for isolated tests.
`uv run seed` inserts the 15 official suppliers on an empty database and skips
existing names on subsequent runs. It does not reset changes or remove suppliers.
Do not run multiple API worker processes against the same TinyDB file.

## Tests

```bash
uv run pytest
```

Tests use temporary databases, check all seed fields against CONTEXT, validate
HTTP responses and constraints, and cover both canonical and compatibility routes.
