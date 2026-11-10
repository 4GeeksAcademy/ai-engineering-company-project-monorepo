# Progress

## Telemetry Event Storage

- Added an idempotent Supabase schema at `services/telemetry/schema.sql` and a
  dedicated `TELEMETRY_DATABASE_URL` connection; inventory remains on
  `DATABASE_URL`.
- `POST /api/telemetry/events` validates and stores mixed batches with per-event
  rejection counts. FastAPI now emits route/status/duration events and supplier
  action outcomes only from the service layer after success or a real 404.
- The live Supabase table/schema was verified. Frontend source is not changed in
  the storage submission branch. A live failure outcome can be generated with a
  non-existent supplier ID without mutating supplier records.
- Added manager/admin-only `GET /telemetry/report` with a compatibility alias at
  `/api/telemetry/report`; the JSON includes daily event volume, API error rate,
  and mean/p95 latency by route. No additional auth metric or visual dashboard
  is included.

## Completed

## INFRA-40 — Dockerization & Production Deploy

- Dockerized the entire monorepo for reproducible development environments.
- **`uis/Dockerfile`**: Node 22-alpine image installing deps for BOTH Next.js apps
  via `npm ci`. Exposes ports 3000/3001. Default CMD is `uis/start.sh`.
- **`uis/start.sh`**: Starts the public website (`:3000`) and the admin backoffice
  (`:3001`) from ONE container. Dev mode runs `next dev` for both (hot reload);
  `TRACKFLOW_UI_MODE=prod` runs `next build && next start`.
- **`uis/.dockerignore`**: excludes `node_modules/`, `.next/`, `out/`, `.env*`, `*.log`.
- **`services/Dockerfile`**: Python 3.12-slim image installing `uv` and deps from
  `requirements.txt` via `uv pip install`. Exposes port 8000, runs uvicorn with
  `--reload` by default.
- **`services/.dockerignore`**: excludes `__pycache__/`, `*.pyc`, `tests/`, `*.log`,
  `.env*`, data dirs, `.venv`.
- **`docker-compose.yml`** (BASE — production-oriented): TWO services (`api`, `ui`)
  on a named `trackflow` bridge network. The `ui` container runs both Next.js apps
  (website :3000, backoffice :3001) via `start.sh`. The base has NO dev bind-mounts
  (image is self-contained), `TRACKFLOW_UI_MODE=prod` / `UVICORN_RELOAD=false` by
  default, an api healthcheck gates UI startup, and a named `trackflow-api-data`
  volume persists TinyDB/SQLite. Environment via root `.env` file.
- **`docker-compose.override.yml`** (DEV overlay — auto-loaded by `docker compose up`):
  Docker Compose cannot remove a base bind-mount via an overlay `volumes: []`
  (sequence-of-maps volumes merge by type+source), so dev-only mounts/hot-reload
  must live in a SEPARATE overlay file. This one adds the repo bind-mount to both
  services, anonymous `.venv`/`node_modules` volumes, `UVICORN_RELOAD=true`, and
  `TRACKFLOW_UI_MODE=dev`.
- **`docker-compose.prod.yml`** (thin PROD overlay): makes production settings
  explicit (`TRACKFLOW_UI_MODE=prod`, `UVICORN_RELOAD=false`, no bind-mounts,
  anonymous node_modules volumes, `restart: always`). Used instead of the override:
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`.
- **Inter-service communication**: the UI container reaches the API by Docker
  service name `api` (`BACKEND_UPSTREAM=http://api:8000`) — never `localhost`.
  The Next.js server proxies `/api`, `/auth`, `/users`, `/profiles` via rewrites
  in `next.config.ts`, and `/inventory` + `/suppliers` via `middleware.ts`
  (which only forwards API-shaped requests). Browser SPA calls use relative
  paths; `NEXT_PUBLIC_*` are left blank in the proxy flow.
- **`.env.docker`**: Ready-to-use dev environment using SQLite (no external
  Postgres needed). Authored as a committed template (exempted from `.gitignore`).
- **`.dockerignore`** (root): Filters out `.venv`, `node_modules`, `.next`, cache
  files, and documentation directories from the Docker build context.
- **`scripts/deploy.sh`**: One-command VPS deploy script pulling latest code,
  building production images, and starting services.
- No secrets in versioned files: `.env` is git-ignored, all secrets go in
  environment or `.env` on the VPS. `.env.docker` contains only dev defaults.
- **PR evidence**: live screenshots of the local dev stack and the VPS
  production stack (compose ps + running apps) are captured under
  `docs/screenshots/INFRA-40/` for the PR description.

## Milestone 5 — Backend Inventory Management

- Added the inventory API to the existing `services/api` FastAPI application;
  TinyDB remains the user/auth store and the existing API service was extended
  rather than replaced.
- Added SQLModel tables for `SKU`, `StockEntry`, and `StockExit`, with database
  foreign keys from both movement tables to `SKU`, positive-quantity checks,
  warehouse/category checks, and exit/tracking-number constraints. Request and
  response schemas live separately from the ORM tables.
- Configured the SQLModel engine from the repo-root `DATABASE_URL`; verified the
  variable is non-empty without displaying its value. The `.env` file was not
  changed. Startup creates the schema and idempotently seeds the 6 briefing SKUs,
  4 stock entries, and 3 stock exits. `.env.example` contains only a placeholder.
- Added all six `/inventory` routes. Product and order reads are public; product
  and stock movement writes require the existing TinyDB bearer auth. `current_stock`
  is computed per SKU/warehouse from grouped entry/exit totals and is never stored.
  Outbound stock is checked under a SKU row lock before insert; dispatch tracking
  numbers and loss nullability are validated.
- Seed results demonstrate separate stock: sneaker SKU `CLT-SNK-W-42` has 25 in
  LA; `CLT-SNK-W-42-Z` has 14 in ZGZ; earbuds have 11 in LA. No user table is
  replicated to Supabase; `user_uuid` stores the existing TinyDB integer ID as a
  string, consistent with the current auth model.
- Added 15 inventory API tests, including per-warehouse calculations, no-auth
  writes, oversell rejection with no persistence, dispatch/loss validation,
  database-level FK enforcement, seed idempotence, and SKU-enriched movement
  listing. The test fixture redirects SQLModel to isolated SQLite and disposes
  each engine; tests never connect to Supabase.
- Validation: **167 backend tests pass**, overall `services.api` coverage is
  **94%**, `routes/inventory.py` is **92%**, and `inventory_database.py` is
  **97%**. The project `.venv` could not be used because it is a broken/shared
  `lib64` symlink, so validation ran in a disposable environment under the OS
  temp directory.
- Live Supabase verification subsequently succeeded: API startup created/used
  inventory tables and seeded data; GET returned six SKUs with expected stock.
  An authenticated smoke test used a random temporary TinyDB account and a
  unique SKU to verify inbound/outbound creation, stock recomputation, oversell
  400, missing dispatch tracking 422, and order listing. The temporary account,
  SKU, and movements were removed; seeded stock remained unchanged. The local
  API was stopped after verification.
- Existing TinyDB admin password is stored as a hash and is not reset when
  `seed_users()` finds the admin email. `TRACKFLOW_ADMIN_PASSWORD` only applies
  on first-time seed; do not record credentials or password hashes in project
  memory. Use the current admin credential or a temporary account for local
  authenticated smoke tests.
- Setup and endpoint behavior are documented in `services/api/README.md`; the
  canonical schema and seed data are in `trackflowcompany-BRIEFING.en.md`.

## Milestone 5.2 — Backoffice Inventory Interface

- Added protected backoffice routes for inventory products, inbound receipts,
  outbound dispatch/loss, and read-only movement history. The existing global
  auth guard redirects unauthenticated users; all inventory API traffic goes
  through `uis/backoffice/lib/inventory.ts`, which attaches the stored Bearer
  token and validates response shapes.
- Added product stock indicators (zero = out, 1–9 = low, 10+ = healthy) with the
  thresholds documented next to the style rule. Product rows link to preselected
  inbound/outbound forms. The outbound form refreshes selected SKU stock before
  quantity entry and shows an over-stock warning; the API still enforces the
  final check. History distinguishes inbound/outbound and shows product, quantity,
  warehouse, date, and creator ID.
- Configured ignored `uis/backoffice/.env.local` with
  `NEXT_PUBLIC_INVENTORY_API_URL=http://localhost:8000`; root `.env.example` has
  the same local placeholder. Restart/rebuild the frontend after changing this
  public build-time variable.
- Updated shared HTTP safe-message handling to expose only a strictly validated
  inventory oversell message; malformed/unexpected API details remain generic.
- Added `inventory.test.ts`; full frontend suite is **32 passing across 4 suites**.
  Jest coverage: inventory client **88.88%**, shared HTTP **89.28%**, all files
  **87.74%** statements. Backoffice `npm run typecheck` and `npm run build` pass;
  all four inventory routes are generated.
- Local environment quirk: Next.js build updated `uis/backoffice/tsconfig.json`
  to the framework-required `jsx: preserve`. Keep this generated configuration.
- Backoffice/API local verification instructions are documented in
  `uis/backoffice/README.md` and `TESTING.md`.

## AUTH-088 — Authentication test suite (with API-042 and FE-019)

- Closed **AUTH-088** (unit test coverage for the authentication API). Every auth
  endpoint/function gets at least one happy-path, one edge-case, and one
  failure-mode test. Tests assert business logic — not HTTP serialisation.
- Backend suite: **152 pytest tests pass** (`uv run pytest` from repo root).
  Coverage targets met: `services/api/auth.py` **100%**, `routes/auth.py` **100%**,
  overall `services.api` **93%**. Auth tests: 51 (token helpers, password
  helpers, endpoint-level).
- Test files added: `tests/test_auth_token.py` (9), `tests/test_auth_password.py`
  (13), `tests/test_auth_endpoints.py` (24). The endpoint suite replaces the old
  `test_auth_api.py` scope and also covers forgot/reset/change password flows.
- Closed **API-042** (extra): backoffice endpoint tests for users, profiles,
  suppliers — 56 tests. Coverage: users **96%**, profiles **93%**, suppliers **100%**
  (target ≥60% each).
- Closed **FE-019** (extra): Jest tests for frontend utility functions — 25 tests
  in 3 suites (`auth-utils`, `http-client`, `incidents-utils`). Coverage:
  `packages/shared/http.ts` **85.45%**, `lib/auth.ts` **79.54%**, `lib/incidents.ts`
  **100%**.
- Key infrastructure: pytest configured in root `pyproject.toml`
  (`pythonpath=["."]`, `testpaths=["tests"]`, `addopts = "--cov --cov-report=term-missing"`,
  coverage `source=["services.api"]`, omit `services/api/data/*`). Dev deps:
  `httpx<0.28` (pin required — 0.28.1 broke starlette TestClient), pytest>=9.2.0,
  pytest-cov>=7.1.0, freezegun>=1.5.0.
- Key infrastructure (FE-019): Jest 30 + ts-jest at `uis/backoffice`. `jest.config.ts`
  uses `rootDir = "../.."` (monorepo root) so `packages/shared/http.ts` is compiled
  by ts-jest and attributed to coverage; transform points at the explicit
  `<rootDir>/uis/backoffice/node_modules/ts-jest` path. Run with
  `npx jest --coverage` from `uis/backoffice`.
- AI-assisted findings documented in `TESTING.md`: purpose-scoped reset tokens,
  import-time expiry constant + frozen-clock testing, non-integer `sub`, inactive
  users rejected on both login and `/me`, and the **empty-string `jti`** insight
  (it is the only input that reaches the app's own reset-token guard — non-string
  jti is rejected by python-jose at decode; missing jti raises `KeyError`).
- Deliverable: `TESTING.md` at repo root documents how to run both suites, what
  each covers, per-case rationale, AI findings, and verified coverage numbers.
- Note: the full backend run emits many benign deprecation warnings (Python
  3.15 beta + FastAPI/starlette/httpx); they do not affect results.

## Completed (previous milestones)

- Added script-first incident analyzer with context-aligned metrics.
- Created deterministic 100-row fixtures:
  - scripts/incidents-trackflow.csv
  - scripts/incidents-company.csv
- Verified script output matches expected totals:
  - total 100, valid 95, invalid 5
  - categories 14/38/19/17/7
  - status 29/52/14
  - country 50/45
  - satisfaction average 3.06 with 6/11/15/14/6 distribution
- Implemented backend analysis and export endpoints reusing shared logic.
- Refactored backoffice into launcher + app directories:
  - / hosts homepage with dropdown application launcher.
  - /incident-file-analyzer hosts the incident analysis implementation.
  - /website and /talent-pipeline-tracker are available as additional launcher options.
- Implemented backoffice incident-file-analyzer page with upload and CSV download.
- Implemented supplier directory milestone in services/api with TinyDB persistence and startup seeding.
- Added supplier endpoints for list/filter, create, detail, rate update, status update, and delete.
- Added backoffice /suppliers page with live API-backed filters, supplier registration form, rate editing, and status toggle.
- Added root pyproject.toml script entry so `uv run seed` is defined when `uv` is installed in the environment.
- Implemented JWT-based auth for the TrackFlow API, including TinyDB-backed user and profile storage, `/auth/login`, `/users`, `/profiles`, and protected internal routes requiring bearer-token validation.

## AUTH-02 — Authentication flows and protected frontend views

- Created `uis/backoffice/lib/auth.ts` — core auth library with `getToken`, `setToken`, `clearToken`, `isAuthenticated`, `redirectToLogin`, `redirectToHome`, and `apiFetch<T>()` generic fetch wrapper that auto-attaches Bearer tokens and handles 401 responses.
- Created `uis/backoffice/app/login/page.tsx` — login form (email + password) that POSTs to `/auth/login` with form-urlencoded body (OAuth2PasswordRequestForm), stores the JWT via `setToken()`, and redirects to `/`.
- Created `uis/backoffice/app/register/page.tsx` — registration form (email, password, optional display_name/phone/address) that creates the user via POST `/users`, then logs in automatically via POST `/auth/login`, stores the JWT, and redirects to `/`. Falls back to email-username as display_name when profile fields are present but display_name is empty.
- Created `uis/backoffice/app/account/profile/page.tsx` — profile view/edit page that loads user data from GET `/auth/me` and profile from `/profiles/me`, with an editable form for display_name/phone/address that saves via PATCH `/profiles/me`. Shows email, role, account status, and member-since date.
- Created `uis/backoffice/app/logout/page.tsx` — calls `clearToken()` then `redirectToLogin()`, with a fallback "Logged Out" message if JavaScript redirect fails.
- Created `uis/backoffice/components/AuthGuard.tsx` — reusable React client component that wraps content with a `useEffect` auth check, redirecting to `/login` if no token is found.
- Modified `uis/backoffice/app/layout.tsx` — added inline `<AuthGuardScript />` that runs on every page load, exempting public paths (`/login`, `/register`, `/logout`) while redirecting all others to `/login` if no token exists.
- Modified `uis/backoffice/app/globals.css` — added styles for auth forms (`.required`, `.success`, input types `[email]`/`[password]`/`[tel]`) and top navigation (`nav.top-nav`, `.nav-brand`, `.nav-links`, `.nav-link`).
- Modified `uis/backoffice/app/suppliers/page.tsx` — all 4 fetch calls (GET suppliers, POST suppliers, PATCH rate, PATCH status) now use a local `authFetch()` wrapper that injects the Bearer token and handles 401 redirects, with correct `Content-Type` handling for non-FormData bodies.
- Modified `uis/backoffice/app/incident-file-analyzer/page.tsx` — POST `/api/incidents/analyze` now uses `authFetch()` for Bearer token injection and 401 handling, skipping Content-Type override for FormData file uploads.
- Modified `uis/talent-pipeline-tracker/app/layout.tsx` — added the same inline `<AuthGuardScript />` for route protection using the shared localStorage token (the talent pipeline tracker uses a separate API but shares the token for auth guard purposes).
- Modified `services/api/routes/profiles.py` — added `PATCH /profiles/me` endpoint that creates a profile if one does not exist (via `create_profile_for_user`) or updates it (via `update_profile_for_user`), accepting `ProfileCreate` payload and returning `Profile` response model.
- **Verified**: All 8 new/modified files pass `get_errors` with zero errors.
- **Verified**: Public website (`uis/website/app/layout.tsx`) is completely untouched — no auth guard script was added.
- **Scope**: Backoffice app is fully protected. Talent pipeline tracker has route-level protection but no login UI (it shares the backoffice login). Public website is completely unaffected.

## AUTH-03 — Password recovery and change

- Added `POST /auth/forgot-password`, which issues a signed reset token for active users and queues a link through Resend as a background task. The endpoint returns the same 200 confirmation for known and unknown email addresses without waiting on provider latency.
- Added `POST /auth/reset-password`, which validates the token signature, purpose, expiry, and server-side one-use record before updating the password hash. Invalid, expired, and replayed tokens return 400.
- Added authenticated `POST /auth/change-password`, which verifies the current password before applying the new password and returns 400 for an incorrect current password.
- Added persistent token records in TinyDB, storing a hash of each reset token ID and marking a record used when the password changes.
- Added Resend integration in `services/api/email.py`; API key and sender are environment-only values. Root `.env.example`, `.gitignore` rules, `python-dotenv` loading, and `services/api/README.md` document local setup.
- Added console fallback in email delivery; after the error-handling audit this requires explicit `ALLOW_PASSWORD_RESET_CONSOLE_FALLBACK=true` in local development. Normal/provider-failure logs no longer contain reset links or recipients.
- Added backoffice `/forgot-password` and `/reset-password` public pages, plus protected `/account/change-password`. Login links to recovery; the profile view links to password change. Reset pages are exempt from the inline route guard.
- Added auth API tests for account enumeration resistance, successful reset and token replay rejection, expired token rejection, and change-password current-password checks.
- Repaired malformed supplier PATCH calls that prevented app-wide typechecking; they now use the existing authenticated fetch helper and send the expected JSON payloads.
- Moved logout token clearing/redirect into a client effect so the auth page can be statically prerendered.
- **Environment note**: the working `.env` lives at the repo root (where `services/api/main.py` loads it via `python-dotenv`). A local `uis/backoffice/.env.local` sets `NEXT_PUBLIC_INCIDENTS_API_BASE_URL` for the backoffice app; both files are git-ignored.
- **Verified fallback**: explicit development opt-in prints a usable link; without opt-in, delivery failures are logged safely and the public endpoint retains its generic confirmation.
- **Verified**: `tests/test_auth_api.py` passes (5 tests); `uis/backoffice` TypeScript typecheck passes.
- **Verified**: `uis/backoffice` production build passes and generates the new reset/change-password routes.
- **Setup requirement**: Configure a Resend API key and verified sender in the local `.env` or deployment environment before expecting real reset emails.

## Centralized Incident Manager (CIM1-CIM3)

- Implemented the model, branch labels, nine categories, three origins, and four-state lifecycle from `trackflow-BRIEFING.en.md`.
- Extracted the analyzer's CSV validation into `packages/shared/incident_validation.py`; the analyzer retains its existing interface and 100/95/5 totals. Shared manager contracts and mappings live in `packages/shared/incidents.py`.
- Added transactional SQLite incident persistence under `services/api/data/incidents.sqlite3`, separate from existing identity/supplier stores. A separate import ledger prevents duplicate seeds without storing CSV IDs on incidents.
- Added `scripts/seed_incidents.py`: validates before transformation, preserves descriptions, maps dates to midnight UTC, skips invalid rows with privacy-safe messages, and supports missing-ID title/timestamp duplicate control.
- Verified seed in isolated databases: 95 inserted / 5 invalid, followed by 95 duplicates skipped. Expected transformed totals match the briefing, including carrier_issue 45 and office branch counts 50/45.
- Added authenticated create/list/detail/status/summary endpoints and an options endpoint for shared UI labels. Manager validation returns field-keyed JSON 400 errors; unexpected failures return a generic 500; empty storage returns zero metrics.
- Added protected backoffice `/incidents` with an Operations Home launcher entry, registration form, highlighted required branch field, four list filters, independent loading/error/retry states, summary breakdowns, and optimistic status updates with rollback.
- Verification: 29 incident API tests pass; the full backend suite, backoffice typecheck, and production build passed during implementation. Browser checks verified validation, creation/reset, filters/empty state, lifecycle update, failed-save rollback, list/summary failure isolation and retry, pending submission disablement, and narrow-screen layout.
- Local storage was seeded with 95 incidents; browser verification added one carrier_issue incident at la_warehouse and advanced it to in_progress (96 total after that check). Seeding again will not remove browser-created records.
- API setup/expected totals and browser/PR screenshot steps are documented in the API and backoffice READMEs. No embeddings or automatic alerts were added; they are outside this delivery.

## Error-Handling Audit

- Audited the merged CIM baseline and existing auth, suppliers, analyzer, tracker, public site, scripts and data utilities before changing code. Findings/resolutions and manual testing are recorded in `docs/ERROR_HANDLING.md`.
- Added shared safe HTTP handling in `packages/shared/http.ts`: timeouts, JSON guards, safe error/field messages and typed failures. Existing app clients retain their authentication behavior and now validate domain payloads before rendering.
- Added supplier mutation states/retry feedback and stale-response protection, profile error discrimination/retry, authenticated CSV export with cleanup, tracker note/detail retries, and error/loading routes in all three Next.js apps.
- Standardized JSON API failures while retaining CIM validation 400 and other model validation 422. Auth headers are preserved; broad exception text is no longer returned to users. Startup storage failure is safe and reflected in health status.
- Hardened scripts for file/encoding/CSV/database/subprocess failures with scoped catches, stderr diagnostics and nonzero critical exits. Shared CSV structure checks prevent false-success analyses. Removed raw dataframe sample output and made the memory-bank guard fail closed.
- Protected reset credentials by making console-link fallback explicitly local-only and off by default. Existing `.env` credentials were not read or modified for verification.
- Verification: 50 isolated Python tests and 8 Node error-contract tests pass; production builds pass for website, backoffice, and tracker. Tracker's shared-source bundler boundary and script prop shape were corrected to support those builds.
- Browser checks with synthetic intercepted responses verified offline supplier mutations, malformed data recovery, profile failure/retry, authorized CSV downloads and offline login. No real email delivery was claimed or exercised.

## Notes

- Normal production and CSV outputs omit customer emails and credentials. Explicit local-only reset console delivery is a documented opt-in exception and must not be used in shared/production logs.
- API dependency pin uses FastAPI + Pydantic v1 compatibility due Python 3.15 beta environment constraints.
- `uv` is available and working in the current environment (`uv run pytest` runs the full suite with coverage; dev deps live in `pyproject.toml` `[dependency-groups] dev`). The earlier note about `uv` missing from PATH is obsolete.

## Restored website/backoffice baseline

- Restored the TrackFlow public website to a componentized structure with reusable `Header` and `FeatureCard` components instead of the monolithic inline page.
- Re-established the source-of-truth data flow from `src/trackflow-website/content.ts` to the shared website screen used by the public app and backoffice route.
- Fixed the Next.js 16 module-boundary issue by resolving the shared content through an alias (`@trackflow-content`) and by keeping the required Turbopack/webpack configuration compatible with the repo setup.
- Verified both app builds pass after the restoration:
  - `uis/website`: `npm run build` succeeded
  - `uis/backoffice`: `npm run build` succeeded

This is the current working baseline to preserve before additional feature work or remote merges.
