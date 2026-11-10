# Technical Context

## Telemetry Event Storage

- Telemetry persistence uses the dedicated PostgreSQL engine in
  `services/api/telemetry_database.py`; it requires TLS and
  `TELEMETRY_DATABASE_URL`, leaving inventory's `DATABASE_URL` isolated.
- `services/telemetry/schema.sql` is the idempotent Supabase setup; the API
  ingestion route is `/api/telemetry/events`. Server emitters share the same
  strict schema/allowlist and use null session/user IDs rather than account data.
- Technical request timing is emitted from FastAPI middleware; supplier outcome
  events are emitted by the supplier service routes after a persisted mutation
  or a real not-found failure. No frontend instrumentation is required for these
  server-side event types.
- `GET /telemetry/report` and `/api/telemetry/report` require manager/admin
  authentication and query the telemetry engine over a UTC half-open date range.
  `services/telemetry/analysis.py` reports daily event volume, daily API error
  ratio, and mean/p95 latency by canonical route; it uses standard-library
  aggregation and does not add a dashboard or separate auth metric.

## Current repository baseline

This repository now combines three active implementation layers:

- repo-level agent governance and memory-bank rules
- Milestone 2 logistics utilities and test interface in `src/`
- Next.js UI surfaces in `uis/website` and `uis/backoffice`

## Existing implementation surfaces

### 1. Milestone 2 TypeScript utility layer in src

The `src/` folder now includes a substantial Milestone 2 implementation, not only static prototype files.

Core modules:

- `src/types/models.ts`: domain types for products, shipments, carriers, inventory movements, and sample datasets.
- `src/utils/collections.ts`: filtering and sorting utilities for product and carrier operations.
- `src/utils/search.ts`: linear search and binary search utilities.
- `src/utils/transformations.ts`: shipping-cost calculation, carrier scoring/selection, and aggregation utilities.
- `src/utils/validations.ts`: validation helpers for product, shipment, and carrier entities.
- `src/index.ts`: central export barrel.
- `src/demo.ts`: demo runner that exercises all major utility functions.

Milestone UI/test surface:

- `src/index.html`: browser testing console for Milestone 2 operations.
- `src/testing-interface.js`: event handlers and in-browser operation orchestration for filters, search, sorting, carrier scoring, reports, and validations.
- `src/milestone2-output.js`: shared Milestone 2 output helper that powers dummy-order output generation for both browser testing and Node scripts.
- `scripts/generate_milestone2_output.cjs` now reads `products`, `carriers`, `shipments`, and optional `milestone2OrderContext` directly from `src/testing-interface.js`, making the sync artifacts source-aligned with the UI test dataset.
- `scripts/generate_milestone2_output.cjs` supports `--shipment=<shipmentId>` to force output generation for a specific testing-interface shipment.
- `scripts/generate_milestone2_output.cjs` also supports `TRACKFLOW_SHIPMENT_ID=<shipmentId>` as an environment override when no `--shipment` argument is passed.
- `src/milestone2-output.js` now supports `selectedShipmentId`, enabling generation from the shipment currently selected in `src/testing-interface.js`.
- `src/testing-interface.js` now maintains an `activeShipmentId` context updated by user operations and passes it to milestone output generation.
- `src/TrackFlow.html` includes anchor-based top navigation links targeting `#header`, `#site-nav-target`, `#contact`, and `#footer`, with `Apply` linking to `application.html`.

Implication:

- Milestone 2 logic currently has a concrete home in `src/` and can be manually exercised from the test interface.
- This logic is not yet packaged for direct reuse from `packages/shared`.

### 2. Public website app

`uis/website` is now a TypeScript Next.js app with Milestone 1 section parity restored.

Observed characteristics:

- App Router files use TypeScript (`layout.tsx`, `page.tsx`).
- `package.json` includes `typecheck` and TypeScript dev dependencies.
- `tsconfig.json` and `next-env.d.ts` are present.
- The page includes header/nav, hero, benefits/services, contact section, and footer.

### 3. Backoffice app

`uis/backoffice` is now a TypeScript Next.js app and no longer computes carrier mapping inline in the page component.

Observed characteristics:

- App Router files use TypeScript (`layout.tsx`, `page.tsx`).
- `package.json` includes `typecheck` and TypeScript dev dependencies.
- `tsconfig.json` and `next-env.d.ts` are present.
- Route `/` is now an Operations Home launcher with a dropdown for available internal pages.
- `uis/backoffice/lib/milestone2.ts` parses `.trackflow-dummy-order.txt` and returns structured values.
- `uis/backoffice/lib/milestone2.ts` reads `.trackflow-milestone2-output.json` as the single source for rendered Milestone 2 output.
- `uis/backoffice/app/milestone-2-output/page.tsx` renders imported Milestone 2 output on screen.
- `uis/backoffice/package.json` now runs `milestone2:sync` automatically before `dev` and `build`.

Implication:

- Backoffice depends on a file-based integration path to generated output, which is good for milestone visibility but can become stale without regeneration.

### 4. Legacy/internal reference app

`uis/talent-pipeline-tracker` remains a functional TypeScript Next.js app but is domain-misaligned (recruitment rather than logistics). It should be treated as reference or migration candidate, not as the business source-of-truth UI.

### 5. Shared package

`packages/shared` retains placeholder TypeScript types (`Id`, `BaseEntity`) and now also owns Python incident CSV validation and manager contracts/mappings. Milestone 2 TypeScript domain models remain in `src/`.

### 6. Auth/API service layer

The API service now includes a TinyDB-backed identity layer for TrackFlow users and profiles. Relevant implementation details:

- `services/api/auth.py` centralizes JWT creation, decoding, and bearer-token validation via `OAuth2PasswordBearer` and `python-jose`.
- `services/api/database.py` persists user and profile records in `services/api/data/users.json` with a one-to-one profile mapping on `user_id`.
- `services/api/routes/auth.py`, `services/api/routes/users.py`, and `services/api/routes/profiles.py` expose the login and protected CRUD flow.
- `main.py` protects the internal API routes and seeds an admin user by default so the service can authenticate staff requests with a bearer token.

### 7. Frontend auth layer (AUTH-02)

The backoffice and talent-pipeline-tracker apps now implement a complete JWT-based authentication flow:

**Auth library** (`uis/backoffice/lib/auth.ts`):
- Token storage in `localStorage` under key `trackflow_access_token`.
- `getToken()` / `setToken()` / `clearToken()` — safe localStorage access with try/catch fallback.
- `isAuthenticated()` — boolean check for existing token.
- `redirectToLogin()` / `redirectToHome()` — window-level redirects.
- `apiFetch<T>(path, options?)` — generic fetch wrapper that attaches `Authorization: Bearer <token>`, auto-sets `Content-Type: application/json` (skipped for `FormData` bodies), and handles 401 responses by clearing the token and redirecting to `/login`. Parses structured error responses (string `detail` or array of validation errors).
- `API_BASE` sourced from `NEXT_PUBLIC_INCIDENTS_API_BASE_URL` env var (default `http://localhost:8000`).

**Route-level auth guard** (`uis/backoffice/app/layout.tsx` and `uis/talent-pipeline-tracker/app/layout.tsx`):
- Inline `<AuthGuardScript />` in the `<head>` that runs before any page content.
- Public paths (`/login`, `/register`, `/logout`) are exempt from auth checks.
- All other paths redirect to `/login` if no token is found in localStorage.
- Talent pipeline tracker uses the same shared token for route protection (no login UI — users are redirected to the backoffice login page).

**Auth pages** (all under `uis/backoffice/app/`):
- `/login` — email/password form → POST `/auth/login` (form-urlencoded) → stores JWT → redirects to `/`.
- `/register` — email/password + optional profile fields → POST `/users` (JSON) → POST `/auth/login` → stores JWT → redirects to `/`.
- `/account/profile` — loads user from GET `/auth/me` and profile from GET `/profiles/me` → editable form for display_name/phone/address → saves via PATCH `/profiles/me`.
- `/logout` — calls `clearToken()` → redirects to `/login`.

**Protected page updates** (existing pages that now send Bearer tokens):
- `uis/backoffice/app/suppliers/page.tsx` — all 4 API calls use local `authFetch()` wrapper with token injection and 401 handling.
- `uis/backoffice/app/incident-file-analyzer/page.tsx` — POST to analysis endpoint uses `authFetch()`, correctly handling FormData (no Content-Type override).

**API endpoint added** (`services/api/routes/profiles.py`):
- `PATCH /profiles/me` — creates profile if missing (via `create_profile_for_user`), updates if existing (via `update_profile_for_user`). Accepts `ProfileCreate` payload, returns `Profile` response model.

**Scope**:
- `uis/website/` — completely unaffected (no auth guard, no changes).

### 8. Password recovery and change (AUTH-03)

- `POST /auth/forgot-password` looks up active users, issues a signed JWT with a `password_reset` purpose and configured expiry, persists a hashed token ID in the TinyDB `password_reset_tokens` table, and queues reset email delivery through FastAPI background tasks. Its response is identical for registered and unknown emails; delivery failures are logged without changing that response or waiting on Resend latency.
- `POST /auth/reset-password` validates signature, expiry, token purpose, matching server-side state, and unused status. It stores the new bcrypt hash and marks the token used. The token record stores no raw reset token.
- `POST /auth/change-password` requires a valid bearer token and verifies the current password before calling the existing user update path.
- Token expiry is configured with `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` (default 30). The email link base is `BACKOFFICE_URL` (default `http://localhost:3000`). Resend uses `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; `services/api/main.py` loads the root `.env` (not `uis/.env`) through `python-dotenv` before importing auth settings. `JWT_SECRET_KEY` is also loaded from the environment; the development fallback is generated per process, so deployments must configure one stable value shared by API instances. Reset email delivery falls back to printing the reset link in the API console when Resend is unconfigured, blocked by the network, or rejects the sender, so the local flow works without real mail delivery.
- Backoffice reads the API base from `uis/backoffice/.env.local` (`NEXT_PUBLIC_INCIDENTS_API_BASE_URL`, git-ignored); that value is baked in at build/start time, so it must stay in sync with the root `.env` when the API URL changes.
- Backoffice routes: `/forgot-password` and `/reset-password` are public; `/account/change-password` remains behind the existing auth guard. Login and profile pages link to the respective workflows.
- Root `.env.example` documents required settings; `.gitignore` excludes `.env` and other local env files while permitting examples. `services/api/README.md` documents Resend setup and API startup.
- TinyDB reset-token consumption is serialized within one API process. For multi-worker production deployments, move identity/token persistence to a transactional database to guarantee race-free one-time consumption across processes.

### 9. Centralized Incident Manager (CIM1-CIM3)

- Business contract: `trackflow-BRIEFING.en.md`. Shared CSV rules are in `packages/shared/incident_validation.py`; manager Pydantic contracts, allowed values, display labels, transformations, and lifecycle transitions are in `packages/shared/incidents.py`.
- `shared/incidents_analysis/analysis.py` imports the extracted validator, preserving analyzer behavior. `scripts/seed_incidents.py` reuses it before mapping valid CSV rows to customer incidents; date/title/branch/category/status mapping matches the briefing.
- `services/api/incidents.py` uses standard-library SQLite with database CHECK constraints, parameterized queries, transactional status changes, and a separate unique import ledger. Storage: git-ignored `services/api/data/incidents.sqlite3`. No new dependencies; auth/suppliers remain TinyDB-backed.
- `services/api/routes/incidents.py` exposes bearer-protected POST/GET `/api/incidents`, GET detail, PATCH status, GET summary, and GET options. Static analyzer routes remain registered before the detail route. Options supply the frontend's labels and valid next statuses, avoiding duplicate frontend enums.
- The API returns scoped JSON 400 field errors for manager validation, 404 for missing records, and generic JSON 500 responses for unexpected errors. Read endpoints support empty storage. Summary is global, independent of list filters, with zeros for every allowed value.
- `/incidents` is a protected backoffice page with form, list, filters, and summary sections. `uis/backoffice/lib/incidents.ts` provides a timeout-aware authenticated API client and typed field errors. The page isolates request states, preserves form input on failure, and rolls optimistic status changes back if the update fails.
- Historical seed is explicit (`python scripts/seed_incidents.py`), never an automatic startup import. Expected seed-only totals are 95 incidents, statuses 29 open/52 resolved/14 discarded, categories 14 lost_parcel/45 carrier_issue/19 delivery_failure/17 returns_issue, and branches 50 la_office/45 zaragoza_office.
- Tests in `tests/test_incidents_api.py` isolate persistence using temporary databases. Browser failure checks use intercepted responses rather than disrupting the user's running API. Setup and manual verification live in existing app/API READMEs.

### 10. Test infrastructure (AUTH-088 / API-042 / FE-019)

- **Backend (pytest).** Configured in root `pyproject.toml`: `[tool.pytest.ini_options]`
  sets `pythonpath = ["."]` (so `services` / `packages` resolve), `testpaths = ["tests"]`,
  and `addopts = "--cov --cov-report=term-missing"`. Coverage: `[tool.coverage.run]`
  `source = ["services.api"]`, `omit = ["services/api/data/*"]`. Dev deps
  (`[dependency-groups] dev`): **`httpx<0.28` (CRITICAL pin — 0.28.1 breaks
  starlette TestClient)**, pytest>=9.2.0, pytest-cov>=7.1.0, freezegun>=1.5.0.
  Run with `uv run pytest` from the repo root (NOT bare `pytest`). Shared fixtures
  in `tests/conftest.py` (isolated TinyDB, TestClient, frozen clock). Auth token
  expiry tests rely on `freezegun.freeze_time` because
  `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` is read at module import time and must be
  `monkeypatch`ed on `services.api.auth`.
- **Backend results (last full run):** 152 passed; `auth.py` 100%, `routes/auth.py`
  100%, `routes/users.py` 96%, `routes/profiles.py` 93%, `routes/suppliers.py`
  100%, `database.py` 94%, overall `services.api` 93%. Auth-only: 51 tests.
  Endpoint suites: users/profiles/suppliers = 56 tests.
- **Frontend (Jest).** `uis/backoffice` has Jest 30 + ts-jest as devDeps and a
  `"test": "jest"` script. `jest.config.ts` is non-trivial: `rootDir = "../.."`
  (monorepo root) so `packages/shared/http.ts` gets coverage-attributed; the ts-jest
  transform uses the **explicit** path `<rootDir>/uis/backoffice/node_modules/ts-jest`
  (the `preset: "ts-jest"` shortcut fails because rootDir is not the app dir);
  `moduleDirectories` includes `uis/backoffice/node_modules`; `collectCoverageFrom`
  scopes to `uis/backoffice/lib/auth.ts`, `uis/backoffice/lib/incidents.ts`,
  `packages/shared/http.ts`. Run with `npx jest --coverage` from `uis/backoffice`.
- **Frontend results (last full run):** 25 passed across 3 suites;
  `http.ts` 85.45% stmts, `auth.ts` 79.54%, `incidents.ts` 100%.
- **TS pitfalls encountered:** the `jsonResponse` helper needed parentheses —
  `ok ?? (status >= 200 && status < 300)` — to satisfy TS5076; the localStorage
  test mock is typed `MockedStorage = Storage & { jest.Mock methods }` so
  `.mockImplementation` typechecks (casting `as unknown as Storage` alone erases
  the jest types).
- `TESTING.md` at the repo root is the canonical testing guide (run commands,
  per-case plans, AI findings, real coverage numbers, test counts).

### 11. Cross-Cutting Error Handling

- `packages/shared/http.ts` is the shared TypeScript request boundary: 15-second default timeout, safe status mapping, controlled field errors, guarded JSON parsing, and optional domain validators. Backoffice auth/CIM/supplier/analyzer clients and tracker requests use it; raw response bodies and native fetch/parser messages are not shown in the UI.
- Backoffice now separates profile 404 from load failure, exposes supplier mutation/recovery states, and downloads CSV via authenticated fetch with object-URL cleanup. Tracker read failures have retry controls. All Next.js apps have route error/loading components.
- FastAPI errors are consistently JSON, preserve HTTP auth headers, and expose field errors without echoing invalid inputs. CIM uses 400 validation responses, other schema validation 422; unexpected failures return generic 500. The global handler logs exception type rather than sensitive payloads. Failed startup storage reports health 503 without leaking details.
- CSV header/row-width validation is shared in `packages/shared/incident_validation.py`. Seed/analyzer scripts catch specific file, encoding, parse and storage errors; the Git memory guard fails closed on subprocess failure. CLI diagnostics go to stderr with nonzero critical exits.
- Reset console delivery is disabled unless `ALLOW_PASSWORD_RESET_CONSOLE_FALLBACK=true`; enable only for local development. This supersedes older notes describing an automatic fallback. Default provider failures expose no reset links or recipients in logs.
- Auth regression tests now isolate TinyDB storage. `tests/test_error_handling.py` and `tests/http-errors.test.cjs` cover safe failure contracts; see `docs/ERROR_HANDLING.md` for audit evidence and browser/CLI checks. Tracker's Next.js bundler root includes the repository so shared TypeScript imports compile.

### 12. Backend Inventory Management (Milestone 5)

- Canonical entity/seed brief: `trackflowcompany-BRIEFING.en.md`. Inventory is
  part of the existing FastAPI service under `services/api`; do not create a
  parallel service at `services/` root. TinyDB auth/users remain unchanged.
- SQLModel tables are in `services/api/inventory_models.py` (`SKU`, `StockEntry`,
  `StockExit`); Pydantic request/response contracts are in
  `services/api/inventory_schemas.py`. Tables are `inventory_skus`,
  `inventory_stock_entries`, and `inventory_stock_exits`. Both movement tables
  have database-enforced FKs to the SKU table; SQLite test engines also enable
  `PRAGMA foreign_keys=ON`.
- `services/api/inventory_database.py` loads the root `.env`, creates the
  SQLModel engine from `DATABASE_URL`, provides the request-scoped session, and
  runs idempotent seed data after TinyDB's admin user has been initialized.
  Root `pyproject.toml` already declares `sqlmodel` and `psycopg2-binary`; both
  are also listed in `services/api/requirements.txt`. `.env.example` contains a
  non-secret transaction-pooler placeholder. Never print or commit the actual
  connection string.
- `services/api/main.py` initializes SQLModel metadata and seed rows at startup
  and registers `services/api/routes/inventory.py` with `/inventory` prefix.
  Product/order GETs are public; create SKU, inbound, and outbound routes require
  `get_current_user`. `user_uuid` is a stringified TinyDB ID because current
  TinyDB `User.id` is an integer; there is no SQLModel User table.
- `current_stock` exists only in response schemas and is calculated from sums
  grouped by `(sku_id, warehouse)`. SKU records are warehouse-specific; LA and
  ZGZ totals are never combined. There is no direct stock-mutation endpoint.
  Outbound creation locks the SKU row and checks available stock in the same
  transaction before inserting; the response uses the exact insufficient-stock
  message from the milestone brief. Dispatches require a nonblank tracking number;
  losses require null.
- Startup seeds 6 SKUs, 4 entries (including repeated receipts for one SKU), and
  3 exits (dispatch and loss). Seeded totals include 25 units for the LA sneaker,
  14 for the ZGZ sneaker, and 11 LA earbuds.
- `tests/conftest.py` swaps the production engine for a disposable SQLite engine
  per test and disposes it at teardown. `tests/test_inventory_api.py` covers all
  routes and critical constraints. Last full run: **167 passed**, 94% total API
  coverage; inventory routes 92%, inventory database 97%.
- Live Supabase smoke verification passed after startup: six SKUs were listed
  with expected per-warehouse stock, authenticated create/inbound/dispatch flows
  worked, oversell returned 400, and missing dispatch tracking returned 422.
  A random temporary account and uniquely named test SKU/movements were removed
  after verification; seeded stock was unchanged. Do not retain the API server
  between work sessions unless actively testing.
- TinyDB already contained an admin account whose password hash did not match
  the initial default. `seed_users()` intentionally skips existing admin
  records, so changing `TRACKFLOW_ADMIN_PASSWORD` does not reset that password.
  Never store credentials or password hashes in memory; use the current local
  admin credential or a temporary account for future write smoke tests.
- Setup and route access rules are documented in `services/api/README.md`.

### 13. Inventory Backoffice Interface (Milestone 5.2)

- The four protected UI routes are `/inventory/products`,
  `/inventory/orders/inbound`, `/inventory/orders/outbound`, and
  `/inventory/orders`; protection comes from the existing root layout auth
  script, which covers all routes except the explicit auth pages.
- `uis/backoffice/lib/inventory.ts` is the only inventory API integration point.
  It reads `NEXT_PUBLIC_INVENTORY_API_URL` (fallback: existing API base), adds
  the `Authorization: Bearer` token from `trackflow_access_token`, handles 401
  by clearing the token and redirecting, and validates response payloads.
  Components do not call `fetch` directly.
- The product list displays computed stock by warehouse and links into
  preselected movement forms. Outbound selection fetches the individual SKU to
  show fresh stock before quantity entry; an over-stock warning is advisory and
  API rejection remains authoritative. Movement history is read-only and shows
  nested SKU data, entry/exit type, quantity, timestamp, and `user_uuid`.
- Stock visual thresholds are currently 0 = out, 1–9 = low, 10+ = healthy. They
  are documented next to the CSS rules and should be replaced with per-SKU
  reorder points if operations defines them.
- `uis/backoffice/.env.local` sets `NEXT_PUBLIC_INVENTORY_API_URL` to local API
  origin. This public environment variable is embedded at build time; restart the
  dev server or rebuild after changes. Root `.env.example` has a non-secret local
  placeholder.
- The shared HTTP safe-message validator permits only inventory oversell errors
  matching the expected SKU/integer format. Do not expose arbitrary response
  details. Tests cover that safe format and reject malformed details.
- Backoffice Jest: 32 tests in 4 suites, inventory client 88.88% statements,
  aggregate 87.74%. `npm run typecheck` and `npm run build` pass. Build changed
  `tsconfig.json` to the required `jsx: preserve` setting.

## Feedback-related status

- Website section parity issue: resolved in `uis/website`.
- JavaScript vs TypeScript issue for website/backoffice: resolved.
- Backoffice inline logic issue: resolved by importing generated output based on `src/testing-interface.js` data.
- Milestone output consistency is now driven by `scripts/generate_milestone2_output.cjs`, which writes both `.trackflow-dummy-order.txt` and `.trackflow-milestone2-output.json` from the shared helper using `src/testing-interface.js` data as input.
- The shared TrackFlow website surface was restored to the componentized state expected by the review: reusable `Header` and `FeatureCard` components, a shared content file in `src/trackflow-website/content.ts`, and the public/backoffice apps both rendering the same screen.
- The Next.js 16 app boundary issue was fixed by aliasing the source content with `@trackflow-content` and adding the matching webpack/Turbopack config in both app folders so the root-level content file resolves correctly without breaking the build.
- Final validation status: both `uis/website` and `uis/backoffice` pass `npm run build` in the current restored baseline.

## Technical constraints and assumptions

- Work must preserve monorepo structure and remain Windows-friendly.
- Milestone 2 logic in `src/` is currently authoritative for local utility behavior and demo coverage.
- A future decision is needed on consolidation: keep `src/` as milestone playground vs move reusable logic to `packages/shared`.

## Validation and working practices

- Website and backoffice have local validation commands: `npm run typecheck` and `npm run build`.
- Memory updates remain mandatory when architecture, milestone output, or workflow interpretation changes.
- Git hygiene from earlier GH001 issue remains relevant: generated artifacts (`node_modules`, `.next`, `out`) must stay untracked.
