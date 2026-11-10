# API Configuration

The password recovery flow sends reset links through Resend. Copy the root `.env.example` to `.env`, then set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to credentials for a verified sender in your Resend account. Never commit `.env` or put provider keys in source code.

The API loads the root `.env` at startup. `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` defaults to 30, and `BACKOFFICE_URL` defaults to `http://localhost:3000`; the generated reset link points to the backoffice app. `NEXT_PUBLIC_INCIDENTS_API_BASE_URL` configures the backoffice API address.

Reset links and recipient addresses are not printed by default. For local development only, explicitly set `ALLOW_PASSWORD_RESET_CONSOLE_FALLBACK=true` in the root `.env` to print a usable reset link when Resend is unavailable. Restart the API after changing the setting. Never enable this in production or shared logs; console links are credentials. Real email still requires a valid Resend key and sender.

## Telemetry Event Storage

Telemetry uses `TELEMETRY_DATABASE_URL`, separate from inventory's `DATABASE_URL`. Apply `services/telemetry/schema.sql` to the Supabase project to create the event table and indexes. The service exposes `POST /api/telemetry/events`; it validates each event independently and returns `received`, `stored`, and `rejected` counts. API timing and successful or rejected supplier mutations are emitted from the FastAPI service without changing either frontend.

`GET /telemetry/report` (also available at `/api/telemetry/report`) is restricted to managers and admins. It returns UTC daily event volume, daily API error rate, and mean/p95 latency by route. These metrics answer whether telemetry volume is changing, whether API failures are rising, and which route has slow responses. The report does not include a separate authentication-success metric or a visual dashboard.

Run the API from the repository root with:

```powershell
uvicorn services.api.main:app --reload
```

The forgot-password endpoint always returns the same confirmation for known and unknown email addresses. Email delivery errors are logged server-side without exposing whether an account exists. Reset tokens are signed, expire at the configured interval, and are recorded as used after a successful password update.

## Inventory Management (Milestone 5)

Inventory uses a dedicated Supabase PostgreSQL connection configured by
`DATABASE_URL` in the repository-root `.env`. Use the Supabase transaction-pooler
URI with SSL enabled. `.env.example` contains a placeholder only; never commit a
real connection string. TinyDB remains the source for users and authentication;
no user table is created in Supabase.

The SQLModel table definitions are in `services/api/inventory_models.py`, and
request/response contracts are in `services/api/inventory_schemas.py`. On API
startup, `SQLModel.metadata.create_all(engine)` creates the three inventory
tables and an idempotent seeder ensures the six briefing SKUs, four stock entries,
and three stock exits exist. Seed movements use the TinyDB admin's string ID in
`user_uuid`; API-created movements record the authenticated TinyDB user's string
ID. The database enforces movement-to-SKU foreign keys and positive quantities.

`current_stock` is never stored. It is computed from entries minus exits for the
SKU's own warehouse. A SKU row is warehouse-specific, so LA and ZGZ stock are
separate even for the same product description. There is deliberately no stock
adjustment route: stock changes only through inbound entries and outbound exits.
Outbound writes lock the SKU row and reject any quantity that would make stock
negative. Dispatches require a tracking number; losses require it to be null.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/inventory/products` | Public | List SKUs with computed warehouse stock |
| POST | `/inventory/products` | Authenticated | Register a SKU |
| GET | `/inventory/products/{id}` | Public | Get one SKU with computed stock |
| POST | `/inventory/orders/inbound` | Authenticated | Record a stock entry |
| POST | `/inventory/orders/outbound` | Authenticated | Record a dispatch or loss |
| GET | `/inventory/orders` | Public | List movements with associated SKU details |

The complete backend suite, including isolated-SQLite inventory tests, runs with
`uv run pytest` from the repository root. Tests never connect to Supabase.

## Centralized Incident Manager

The manager follows `trackflow-BRIEFING.en.md`. Incident persistence is transactional SQLite at `services/api/data/incidents.sqlite3` (git-ignored). Existing user and supplier persistence remains unchanged. Python's standard library provides SQLite; no extra service or credential is needed.

From the repository root, seed historical customer incidents:

```powershell
.\.venv\Scripts\python.exe scripts/seed_incidents.py
```

The default input is `scripts/incidents-trackflow.csv`; an optional path may be passed as the first argument. The initial result is 95 inserted and 5 invalid rows. Running it again skips the 95 duplicates. Existing CSV IDs are tracked in a separate import ledger, not exposed on the incident model; missing IDs use a hashed title/timestamp key. Rejected rows are reported by row number and reason, never by customer email. The database is not automatically reseeded on server startup.

Shared CSV validation lives in `packages/shared/incident_validation.py`, used by the existing analyzer and the seed script. Manager field constraints and briefing mappings live in `packages/shared/incidents.py`, imported by the API and seed path. Seed descriptions are copied verbatim; title, date, status, category, origin, and branch are transformed as the briefing specifies.

All manager endpoints require the existing bearer token:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/incidents` | Create an incident (201) |
| GET | `/api/incidents` | List; optional status, origin, branch, category filters |
| GET | `/api/incidents/options` | Shared allowed values, labels, transitions for the UI |
| GET | `/api/incidents/summary` | Global totals by status, category, origin, branch |
| GET | `/api/incidents/{id}` | Detail or 404 |
| PATCH | `/api/incidents/{id}/status` | Valid lifecycle transition or 400 |

Validation failures return 400 with `message` and an `errors` object keyed by field. Missing incidents return 404. Unexpected failures return a generic 500 response, never a stack trace. Empty databases return an empty list and zero-filled summary. The existing analyzer and CSV-export endpoints are retained.

For a database containing only the historical seed, expected totals are:

- Total 95; customer origin 95.
- Status: open 29, in_progress 0, resolved 52, discarded 14.
- Category: lost_parcel 14, carrier_issue 45, delivery_failure 19, returns_issue 17; other categories 0.
- Branch: la_office 50, zaragoza_office 45; other branches 0.

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_incidents_api.py -q
```

The incident tests use isolated temporary databases, including seed idempotency, exact transformed counts, field errors, all status transitions, empty results, authentication, and generic failure handling. Do not delete the live database to run these tests.

## Error Handling

All handled API errors now return JSON with `message`, a compatibility `detail`, and optional field-keyed `errors`. Required auth headers are preserved. CIM validation retains status 400; other model validation uses 422. Missing resources use 404, permission failures 403, authentication failures 401, and unexpected failures a generic 500. Unavailable startup storage is logged safely and reported as 503 by `/health`.

Internal exception text, request passwords, connection details, and reset tokens are never included in normal error responses. CSV structure is validated before processing. Database conflicts have a dedicated exception type so corrupt storage is not mistaken for an input conflict.

See `docs/ERROR_HANDLING.md` for the audit, browser checks, and automated verification commands.