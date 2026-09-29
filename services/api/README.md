# Nexova API (`services/api`)

Centralized FastAPI backend for Nexova, per [docs/ARCHITECTURE_PROPOSAL.md](../../docs/ARCHITECTURE_PROPOSAL.md): one app, one router per domain.

## Domains implemented

- **`incidents/`** — Support ticket CSV analysis ("Analizador de Incidencias"). Validates and computes metrics on Nexova support-incident exports, per the rules in [scripts/CONTEXT-nexova.md](../../scripts/CONTEXT-nexova.md). Reuses the same [`incidents_analyzer`](../../packages/incidents_analyzer) package as the CLI script in `scripts/analyze.py`, so both run identical validation/metrics logic.
- **`users/`** — Internal accounts (email + password, bcrypt-hashed) with full CRUD, stored in TinyDB.
- **`profiles/`** — One `Profile` per user (strictly one-to-one, same key `user_uuid`): the **display name and the contact data** (`contact_email`, `phone`) live here, not in `User`. Stored in TinyDB (`profiles/db.json`, gitignored).
- **`auth/`** — Login (OAuth2 password flow + JWT carrying `user_uuid`) and the `get_current_user` dependency used to protect every other domain.
- **`suppliers/`** — Supplier directory ("Directorio de Proveedores", Patricia Solís / Nexova). Replaces the HR spreadsheet with a [TinyDB](https://tinydb.readthedocs.io/)-backed store, seeded on startup with the 15 suppliers from [`suppliers/seed_data.py`](./suppliers/seed_data.py) (spec: [CONTEXT-suppliers.md](./suppliers/CONTEXT-suppliers.md)). Pydantic (`suppliers/schemas.py`) rejects with `422` any missing `country`, a `status` outside `active`/`suspended`, empty `categories`, or a `currency` that doesn't match the country (Spain→EUR, USA→USD). Suspending (not deleting) is the preferred way to retire a supplier.

## Authentication

Every route except `POST /auth/login`, `GET /health` and the docs (`/docs`, `/openapi.json`) needs a valid session: `Authorization: Bearer <JWT>`. Without one the API answers `401` (with `WWW-Authenticate: Bearer`).

- **Users are just credentials**: `email` + `password`, stored in their own TinyDB file, `users/db.json` (gitignored). Each document is `{user_uuid, email, password_hash}` — the password is hashed with bcrypt before it is stored (max 72 bytes) and is never returned, logged or echoed back, not even in `422` responses. Emails are case-insensitive (stored lower-cased) and unique.
- **Login** — `POST /auth/login` (also at `/api/auth/login` for the backoffice proxy), OAuth2 password flow: `application/x-www-form-urlencoded` with `username` = the **email** and `password`. The credentials are checked against the bcrypt hash in TinyDB; an unknown email, a wrong password and a malformed email all give the same `401 {"detail": "Incorrect email or password"}` (and take about the same time). On success:

  ```json
  {"access_token": "<jwt>", "token_type": "bearer", "expires_in": 1800}
  ```

- **Token** — JWT signed with HS256 by `python-jose` using `SECRET_KEY`. Claims are the minimum: `user_id` (the `user_uuid` of the user document in TinyDB) and `exp`. Nothing else: no email, no password. The user is re-read on every request, so deleting an account kills its tokens at once, and changing the email keeps the session. Lifetime: `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30, must be a positive integer); `expires_in` is that value in seconds.
- **No roles**: any valid session can use the suppliers and incidents APIs and list/read users. Changing or deleting a user is restricted to the account owner (`403` otherwise), so nobody can reset another person's password.

Protection is applied on the routers themselves (`dependencies=[Depends(get_current_user)]`), so a route added to `suppliers/`, `incidents/`, `users/` or `profiles/` is private by default, and `tests/test_auth.py` fails if any documented operation is left open.

### Profiles (one-to-one with users)

`User` is only credentials; everything a person sees or that is used to reach them is in the `Profile`: `display_name` (required, 1-80 chars), `contact_email` (optional, may differ from the login email) and `phone` (optional).

- **The relation is enforced by construction**: creating a user creates its profile (default `display_name` = the local part of the email, so `ana@x.com` → `ana`) and deleting a user deletes it. There is no `POST`/`DELETE` on `/profiles`, and the profile is keyed on `user_uuid`, so a second one cannot exist. If the profile insert fails, the user creation is rolled back.
- **Existing databases are migrated on startup**: `sync_profiles()` gives a profile to every user that lacks one and drops profiles whose user is gone. A missing profile is also recreated when its owner reads `/profiles/me` or edits it.
- Everyone with a session can read profiles; only the owner can edit theirs (`403` otherwise). Editing a profile never touches the login credentials.

### Configuration

| Env var | Purpose |
|---|---|
| `SECRET_KEY` | JWT signing key, at least 32 characters (`openssl rand -hex 32`). **Required in production.** If unset, a random per-process key is used (sessions die on restart, and it breaks with several workers). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes (default `30`). An invalid value (`0`, negative, not an integer) stops the API at startup. |
| `AUTH_INITIAL_EMAIL` / `AUTH_INITIAL_PASSWORD` | Creates the first user on startup, only if the user store is empty. |

Without them the API starts with no users; create one with `uv run create-user --email <email>` (prompts for the password).

## Endpoints

Supplier routes are served at `/suppliers` (shown in `/docs`) and also at `/api/suppliers`, the path the backoffice uses through the Vite proxy (which only forwards `/api`).

All endpoints below need a session (see above) except `/auth/login` and `/health`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Public. Exchange the email (form field `username`) and password for a bearer token (`access_token`, `token_type`, `expires_in`). `401` on bad credentials. |
| `GET` | `/auth/me` | The user of the current session (`user_uuid`, `email`). |
| `GET` | `/users` | List users (`user_uuid` and `email` only). |
| `POST` | `/users` | Create a user (`{"email", "password"}`; password 8-72 bytes). `409` if the email exists, `422` on invalid data. |
| `GET` | `/users/{user_uuid}` | One user. `404` if missing. |
| `PATCH` | `/users/{user_uuid}` | Change your own `email` and/or `password`; `current_password` is required for either (`400` if wrong, `409` if the email is taken). `403` if it is not your account. |
| `DELETE` | `/users/{user_uuid}` | Delete your own account and its profile (`204`). `403` if it is not yours; `409` if it is the last user. |
| `GET` | `/profiles` | List all profiles (`user_uuid`, `display_name`, `contact_email`, `phone`). |
| `GET` | `/profiles/me` | Your own profile. |
| `GET` | `/profiles/{user_uuid}` | One user's profile. `404` if missing. |
| `PATCH` | `/profiles/{user_uuid}` | Partial update of your own `display_name`, `contact_email`, `phone` (an explicit `null` clears the two optional ones). `403` if it is not your profile, `422` on invalid data. |
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
export SECRET_KEY=$(openssl rand -hex 32)
export AUTH_INITIAL_EMAIL='you@example.com'       # first run only
export AUTH_INITIAL_PASSWORD='choose-a-password'
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
