# Nexova API (`services/api`)

Centralized FastAPI backend for Nexova, per [docs/ARCHITECTURE_PROPOSAL.md](../../docs/ARCHITECTURE_PROPOSAL.md): one app, one router per domain.

## Domains implemented

- **`incidents/`** — Support ticket CSV analysis ("Analizador de Incidencias"). Validates and computes metrics on Nexova support-incident exports, per the rules in [scripts/CONTEXT-nexova.md](../../scripts/CONTEXT-nexova.md). Reuses the same [`incidents_analyzer`](../../packages/shared/incidents_analyzer) package as the CLI script in `scripts/analyze.py`, so both run identical validation/metrics logic.
- **`incidents/` (incident manager)** — The live ticket manager that replaces analysing CSVs by hand: create, edit, move through a lifecycle, filter and summarise incidents, under `/api/incidents` (see [Incident manager](#incident-manager)).
- **`users/`** — Internal accounts (email + password, bcrypt-hashed through `libpass`) with full CRUD, stored in TinyDB.
- **`profiles/`** — One `Profile` per user (strictly one-to-one through `user_id`, the `User.id`): the **name and the contact data** (`contact_email`, `phone`, `address`) live here, not in `User`. Stored in TinyDB (`profiles/db.json`, gitignored).
- **`auth/`** — Login (OAuth2 password flow + JWT carrying the user `id`) and the `get_current_user` dependency used to protect every other domain.
- **`suppliers/`** — Supplier directory ("Directorio de Proveedores", Patricia Solís / Nexova). Replaces the HR spreadsheet with a [TinyDB](https://tinydb.readthedocs.io/)-backed store, seeded on startup with the 15 suppliers from [`suppliers/seed_data.py`](./suppliers/seed_data.py) (spec: [CONTEXT-suppliers.md](./suppliers/CONTEXT-suppliers.md)). Pydantic (`suppliers/schemas.py`) rejects with `422` any missing `country`, a `status` outside `active`/`suspended`, empty `categories`, or a `currency` that doesn't match the country (Spain→EUR, USA→USD). Suspending (not deleting) is the preferred way to retire a supplier.

## Incident manager

Stored in TinyDB (`incidents/db.json`, gitignored), keyed by `id` (`NXV-000101`, the next free number). Rules (categories, statuses, origins, transitions, patterns, limits) come from the shared contract [`packages/shared/incidents/contract.json`](../../packages/shared/incidents/contract.json), through the same `incidents_analyzer` package the CLI script uses; the backoffice reads the same file.

**Data model** (`incidents/incident_schemas.py`, `IncidentRecord`):

| Field | Rule |
| --- | --- |
| `id` | auto (`NXV-` + 6 digits); never accepted from the client |
| `title` | required, 3-120 chars |
| `description` | required, 5-1000 chars |
| `category` | required: `TECHNICAL`, `BILLING`, `ACCESS`, `HR_QUERY`, `COMPLAINT` (as in [CONTEXT-nexova.md](../../scripts/CONTEXT-nexova.md)) |
| `status` | `open`, `in_progress`, `resolved`, `discarded`; `open` on creation, changed only through the status endpoint |
| `origin` | required: `customer`, `branch`, `internal` |
| `branch` | required, ≤ 60 chars; **`central` when it does not apply** (case-insensitive, stored as `central`). If `origin` is `branch` it must name a real branch, not `central` |
| `created_at`, `updated_at` | auto (UTC); `updated_at` moves on every edit or status change |
| `client_company`, `agent_id` (`AGT-07`), `customer_email` | optional extras from the helpdesk CSV (the email is sensitive: masked in lists, never searchable, never echoed in errors) |
| `satisfaction_score` | 1-5, optional, only on `resolved` |
| `discard_reason` | 5-300 chars, required to discard, only on `discarded` |
| `history` | audit trail: created / imported / status_changed / edited (edits log the *names* of the fields, never values) |

Unknown fields are rejected (`extra=forbid`), values must match exactly (`"web"`, `"Customer"`, `"closed"` are refused) and `IncidentRecord` re-checks the lifecycle invariants on every write, so no path (API, seed, merge on edit) can store an inconsistent incident.

**Lifecycle** (`incidents/incident_lifecycle.py`, pure functions; table in the contract):

```
open ──► in_progress ──► resolved      satisfaction_score optional
  │         │  ▲
  │         ▼  └── back to open
  └──────► discarded                    discard_reason required
resolved / discarded ──► open           reopen: score / reason are cleared
```

Any other move is `409` (notably `open → resolved`: it has to be worked on first). Content can only be edited while `open` or `in_progress`. There is no delete: discarding retires an incident and keeps its history.

| Method & path | Purpose |
| --- | --- |
| `GET /api/incidents` | Paginated list. Filters (AND): `status`, `category`, `origin` (repeatable), `branch`, `agent_id`, `client_company` (contains), `q` (id / title / description / client / branch), `date_from`, `date_to` (creation day). `sort` = `created_at \| id \| updated_at`, `order`, `page`, `page_size` (≤ 100). |
| `GET /api/incidents/summary` | Dashboard numbers for the same filters: totals and percentages by status and category, by origin, backlog (`open` + `in_progress`) by category, satisfaction, top branches and clients. |
| `GET /api/incidents/facets` | Distinct branches, clients and agents, to fill dropdowns. |
| `POST /api/incidents` | Create (always `open`). |
| `GET /api/incidents/{id}` | Full incident with `history`, `allowed_transitions` and `editable`. |
| `PATCH /api/incidents/{id}` | Edit content fields (only the ones sent; required ones cannot be `null`, optional ones can be cleared with `null`). |
| `PATCH /api/incidents/{id}/status` | Lifecycle move: `{"status": "in_progress"}`, `{"status": "resolved", "satisfaction_score": 4}`, `{"status": "discarded", "discard_reason": "…"}`, `{"status": "open"}`. |

**Errors**: `401` no session · `404` unknown incident · `409` the incident's state forbids it (forbidden transition, editing a resolved incident) · `422` invalid or missing data, per field, as `detail: [{loc, msg}]`. The `422` body never echoes the rejected values.

**Seed** — loads the historical CSV (`data/raw/incidents-nexova.csv`) with [`scripts/seed_incidents.py`](../../scripts/seed_incidents.py) (logic in [`incidents/seeding.py`](./incidents/seeding.py)); run it with this API's environment:

```
.venv/bin/python ../../scripts/seed_incidents.py            # load (idempotent)
.venv/bin/python ../../scripts/seed_incidents.py --reset    # wipe the incidents first
.venv/bin/python ../../scripts/seed_incidents.py --csv other.csv --db /tmp/incidents.json
```

Each row passes the shared `validate_record` (the CSV rules) and is then transformed and validated again by `IncidentRecord`. **Invalid rows are not inserted**; they are listed with line, id and the rules they break, never the email (with the provided file: 96 inserted, 4 rejected — lines 18, 44, 87 and 91). The CSV predates this model, so (maps in the shared contract; the CONTEXT does not define them):

| CSV | Incident |
| --- | --- |
| `ticket_id` | `id` |
| `description` | `title` (shortened at a word boundary if > 120; `description` keeps the full text) |
| `date` | `created_at` and `updated_at` (00:00 UTC) |
| `status` `OPEN / CLOSED / DISCARDED` | `open / resolved / discarded` |
| `category` | same value (`csvCategoryMap`, identity today) |
| `location` / `ubicacion` (optional column) | `branch`; the provided CSV has none, so `central` |
| — | `origin` = `customer` |

Idempotent: an id already stored is skipped and never overwritten (later work on an incident survives a re-run). At the end the script compares `/api/incidents/summary` with the metrics expected from the transformed CSV (computed with the shared `analyze`) and exits `1` on any difference; with the provided file: 96 incidents, 27 open / 56 resolved / 13 discarded, satisfaction 3.84 over 56. The comparison is skipped when the database also holds incidents that are not from the CSV. Unlike suppliers, the incidents database is **not** seeded on startup — run the seed once.

Limitations: TinyDB and the id counter are single-process (see `incidents/incident_store.py`); a second API worker needs a real database.

## Authentication

Every route except `POST /auth/login`, `POST /users` (sign-up), `GET /health` and the docs (`/docs`, `/openapi.json`) needs a valid session: `Authorization: Bearer <JWT>`. Without one the API answers `401` (with `WWW-Authenticate: Bearer`).

- **Users are credentials plus account state**, stored in their own TinyDB file, `users/db.json` (gitignored). Each document is a `User` (`users/schemas.py`): `id` (uuid), `email`, `hashed_password`, `is_active`, `role` (`admin` | `manager` | `user`; nothing else is accepted) and `created_at` (UTC). No display name or contact data: those are in the Profile. The password is hashed with bcrypt before it is stored (max 72 bytes) and is never returned, logged or echoed back, not even in `422` responses. `is_active=false` blocks login and invalidates its tokens (`401`, the same answer as a wrong password). Every new account is active, including those created through the public sign-up, which can log in straight away; an admin can switch any account off (`is_active=false`). `role` is granted only by an admin (`PUT /users/{id}`), by the `AUTH_INITIAL_*` bootstrap user (admin) or by `create-user --role admin`; `POST /users` (public sign-up) always creates a `user`. Documents written before this model (`user_uuid`/`password_hash`) are migrated on startup. Emails are case-insensitive (stored lower-cased) and unique.
- **Password rule: never plain text, always bcrypt through `libpass`.** Install `libpass[bcrypt]`, not the unmaintained `passlib`; the import is the same (`from passlib.hash import bcrypt`). All hashing lives in `auth/security.py` (`hash_password` / `verify_password`).
- **Auth rule: stateless JWT only.** No server-side sessions and no cookies (no `SessionMiddleware`, no `Set-Cookie`, no session store, no token blacklist). The client keeps the token and sends it in `Authorization: Bearer`; CORS runs with `allow_credentials=False`. The only per-request lookup is reading the user from TinyDB to check that it still exists and is active.
- **Storage rule: users and profiles live only in TinyDB**, now and after Supabase/PostgreSQL is added. No users or profiles tables in Supabase, and no SQLModel models for them. SQL tables of other modules (inventory, …) store just a `user_uuid` column with the TinyDB `User.id`, as a plain reference (no foreign key: there is no users table). Deleting a user therefore does not cascade into those tables by itself.
- **Login** — `POST /auth/login`, OAuth2 password flow: `application/x-www-form-urlencoded` with `username` = the **email** and `password`. The credentials are checked against the bcrypt hash in TinyDB; an unknown email, a wrong password and a malformed email all give the same `401 {"detail": "Incorrect email or password"}` (and take about the same time). On success:

  ```json
  {"access_token": "<jwt>", "token_type": "bearer", "expires_in": 1800}
  ```

- **Token** — JWT signed with HS256 by `python-jose` using `SECRET_KEY`. Claims are the minimum: `user_id` (the `id` of the user document in TinyDB) and `exp`. Nothing else: no email, no password. The user is re-read on every request, so deleting an account kills its tokens at once, and changing the email keeps the session. Lifetime: `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30, must be a positive integer); `expires_in` is that value in seconds.
- **Who may touch what** (`403 Forbidden` = valid token, not yours; `401` = no valid token). Roles are `admin` | `manager` | `user` (new users are `user`); only `admin` has extra powers today (`manager` is stored and assignable but grants nothing yet). Any valid session can use the suppliers and incidents APIs. For accounts and profiles: **reading** someone's user or profile is for its owner or an admin, **listing** every user or profile is for admins, **changing or deleting** a user is for the owner or an admin, and **writing a profile** is for the owner only. Only an admin can change a `role` or `is_active`, and only the owner can change their own password. The last active admin can be neither demoted, deactivated nor deleted (`409`). The `403` comes before any lookup, so an unknown id answers `403` too: nobody can probe which accounts exist.

Protection is applied on the routers themselves (`dependencies=[Depends(get_current_user)]`), so a route added to `suppliers/`, `incidents/`, `users/` or `profiles/` is private by default, and `tests/test_auth.py` fails if any documented operation is left open.

### Profiles (one-to-one with users)

`User` is only credentials; everything a person sees or that is used to reach them is in the `Profile`: `id` (its own uuid), `user_id` (the owner, unique), `name` (required, 1-80 chars), `contact_email` (optional, may differ from the login email), `phone` (optional) and `address` (optional, up to 200 chars).

- **The relation is enforced by construction**: creating a user creates its profile (default `name` = the local part of the email, so `ana@x.com` → `ana`, unless `POST /users` gives a `name`) and deleting a user deletes it. There is no `POST`/`DELETE` on `/profiles`, and the profile is looked up by `user_id`, so a second one cannot exist. If the profile insert fails, the user creation is rolled back.
- **Existing databases are migrated on startup**: `migrate_legacy_profiles()` turns `{user_uuid, display_name, …}` documents into `{id, user_id, name, …}`, then `sync_profiles()` gives a profile to every user that lacks one and drops profiles whose user is gone. A missing profile is also recreated when its owner reads or edits `/profiles/me`.
- Reading a profile by id is for its owner or an admin and the full list is for admins (`403` otherwise). Writing is for the owner only: `PUT /profiles/me`, or `PUT /profiles/{user_id}` with your own id (`403` with anyone else's, admins included). Editing a profile never touches the login credentials.

### Configuration

| Env var | Purpose |
|---|---|
| `SECRET_KEY` | JWT signing key, at least 32 characters (`openssl rand -hex 32`). **Required in production.** If unset, a random per-process key is used (sessions die on restart, and it breaks with several workers). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes (default `30`). An invalid value (`0`, negative, not an integer) stops the API at startup. |
| `AUTH_INITIAL_EMAIL` / `AUTH_INITIAL_PASSWORD` | Creates the first user on startup, only if the user store is empty. |

Without them the API starts with no users; create one with `uv run create-user --email <email>` (prompts for the password).

## Endpoints

Routes are served under one prefix per domain: `/auth`, `/users`, `/profiles`, `/suppliers`. Supplier routes are also mounted at `/api/suppliers` (hidden from `/docs`): that is the path the backoffice uses through the Vite proxy, which only forwards `/api`. Incident routes live at `/api/incidents`, fixed by the project brief.

All endpoints below need a session (see above) except `POST /auth/login`, `POST /users` and `/health`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Public. Exchange the email (form field `username`) and password for a bearer token (`access_token`, `token_type`, `expires_in`). `401` on bad credentials. |
| `GET` | `/auth/me` | The user of the current session (`id`, `email`, `is_active`, `role`, `created_at`) plus its linked `profile` (`name`, `contact_email`, `phone`, `address`, …). Never the hash. |
| `GET` | `/users` | **Admins only** (`403`). List users (`id`, `email`, `is_active`, `role`, `created_at`; never the hash). |
| `GET` | `/users/directory` | Any session. Who is who: `[{user_id, name}]` of the **active** users, sorted by name. Nothing else (no email, role or contact data), so it is the way to show names without listing accounts. |
| `POST` | `/users` | Register a user: `{"email", "password"}` (password 8-72 bytes) plus optional initial profile `name`, `phone`, `address`. The password is hashed before storing and the linked Profile is created in the same operation (`201`). The new user is always a `user`. **Public** (no session needed): it is the sign-up. The account is **active** straight away (`is_active=true`): it can sign in at once with `POST /auth/login`. The `201` answer carries a `message` saying so. `409` if the email exists, `422` on invalid data (nothing is created). |
| `GET` | `/users/{user_id}` | One user: the owner or an admin (`403` otherwise). `404` if missing (admins only ever see that). |
| `PUT` | `/users/{user_id}` | Partial update (omitted fields are kept) of `email`, `password` and, for admins only, `role` and `is_active` (this is how an account is switched off, or back on). Allowed to the owner or an admin (`403` otherwise). The owner needs `current_password` to change their email or password (`422` if missing, `400` if wrong); an admin editing someone else does not, but cannot change their password (`403`). `409` if the email is taken or it would demote, deactivate or remove the last active admin. |
| `DELETE` | `/users/{user_id}` | Delete a user and its linked profile (`204`). Allowed to the owner or an admin (`403` otherwise); `404` if missing; `409` if it is the last user or the last active admin. |
| `GET` | `/profiles` | **Admins only** (`403`). List all profiles (`id`, `user_id`, `name`, `contact_email`, `phone`, `address`). |
| `GET` | `/profiles/me` | Your own profile. |
| `GET` | `/profiles/{user_id}` | One user's profile: the owner or an admin (`403` otherwise). `404` if missing. |
| `PUT` | `/profiles/me` | Partial update of your own `name`, `phone`, `address` (and `contact_email`); omitted fields are kept and an explicit `null` clears `phone`, `address` or `contact_email` (not `name`). `id` and `user_id` can't be sent (`422`). `422` on invalid data. |
| `PUT` | `/profiles/{user_id}` | Same as `/profiles/me` but by id; only for your own id, `403` for anyone else (admins included). |
| `POST` | `/api/incidents/analyze` | Upload a CSV (`multipart/form-data`, field name `file`), get back the analysis as JSON. `400` if the file isn't `.csv`, `422` if required columns are missing or the file has no data rows. |
| `GET` | `/api/incidents/results/export` | Download the most recent analysis as `results.csv` (one metric per row). `404` if no analysis has run yet in this process. |
| `GET` | `/suppliers` | List all suppliers. |
| `GET` | `/suppliers/search/by-country?country=Spain\|USA` | Filter by country. |
| `GET` | `/suppliers/search/by-category?category=...` | Filter by category (one of `job_boards`, `ats_software`, `assessment_tools`, `training_platforms`, `payroll_and_hr_software`, `video_interview`, `background_check`, `office_and_facilities`, `it_and_software_licenses`). |
| `GET` | `/suppliers/{id}` | Get one supplier. `404` if missing. |
| `POST` | `/suppliers` | Create a supplier. `422` on invalid data. |
| `PATCH` | `/suppliers/{id}` | Partial update. Changing `monthly_rate` stamps `updated_at` (audit). The merged record is re-validated, so changing `country` alone (currency mismatch) is a `422`. |
| `PATCH` | `/suppliers/{id}/rate` | Update the monthly rate (`{"monthly_rate": 350}`). Always stamps `updated_at` with the time of the change. `422` if the rate is `<= 0`; `404` if the supplier doesn't exist. |
| `PATCH` | `/suppliers/{id}/status` | Activate/suspend (`{"status": "active" \| "suspended"}`). |
| `DELETE` | `/suppliers/{id}` | Remove a supplier (`204`). `404` if it doesn't exist. The CONTEXT prefers suspending to keep the relationship history; use this for entries made by mistake. |
| `GET` | `/health` | Public liveness check. |

Interactive docs (Swagger UI) are available at `/docs` when the server is running; use *Authorize* there with your email (in the *username* box) and password to try the protected routes.

## Running locally

```bash
cd services/api
pip install -r requirements.txt
cp .env.example .env    # then set SECRET_KEY (openssl rand -hex 32) and, on the first run only,
                        # AUTH_INITIAL_EMAIL / AUTH_INITIAL_PASSWORD. `.env` is gitignored and loaded on startup;
                        # real environment variables take precedence over it.
uvicorn main:app --reload --port 8000
```

To (re)load the initial suppliers into TinyDB by hand (the API also seeds an empty database on startup):

```bash
uv run seed              # seed only if empty
uv run seed --reset      # wipe and reload the 15 initial suppliers
```

`uv run seed` uses the `seed` script declared in `pyproject.toml` (uv installs the dependencies on first run). Run it from `services/api`; from the repo root use `uv run --project services/api seed`, since the root has no Python project. `python seed.py` works too if the dependencies are already installed.

`ALLOWED_ORIGINS` (comma-separated) controls CORS; defaults to the local Vite dev ports (`5173`, `5174`) used by `uis/website` and `uis/backoffice` when unset. Set it explicitly in production — see `docs/ARCHITECTURE_PROPOSAL.md` section 4.4.

## Known limitations

- The "last analysis" used by the export endpoint is kept in an in-memory, module-level variable — it is lost on restart and is not shared across multiple worker processes. Acceptable for this feature's current scope; documented rather than hidden.
- The suppliers directory is stored at `suppliers/db.json`, a TinyDB flat file that's regenerated (and reseeded) whenever it's missing — it's gitignored, not source. A second worker process would not see writes made by another one; fine for the current single-process scope, and the reason the project brief already earmarks a move to Postgres once the ORM is ready.
- Login has no rate limiting or lockout yet, and a token stays valid until it expires or its account is deleted: changing a password does **not** revoke the tokens already issued (they carry no `iat`), and there is no refresh or logout endpoint, so keep `ACCESS_TOKEN_EXPIRE_MINUTES` short. Put the API behind a reverse proxy with rate limits until that is added.
- `uis/backoffice` does not send a token yet, so its calls to `/api/suppliers` and `/api/incidents` now get `401` until a login screen is added.
