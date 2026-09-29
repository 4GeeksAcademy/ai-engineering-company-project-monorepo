# Nexova API (`services/api`)

Centralized FastAPI backend for Nexova, per [docs/ARCHITECTURE_PROPOSAL.md](../../docs/ARCHITECTURE_PROPOSAL.md): one app, one router per domain.

## Domains implemented

- **`incidents/`** — Support ticket CSV analysis ("Analizador de Incidencias"). Validates and computes metrics on Nexova support-incident exports, per the rules in [scripts/CONTEXT-nexova.md](../../scripts/CONTEXT-nexova.md). Reuses the same [`incidents_analyzer`](../../packages/incidents_analyzer) package as the CLI script in `scripts/analyze.py`, so both run identical validation/metrics logic.
- **`auth/`** — Internal users, login (OAuth2 password flow + JWT) and the `get_current_user` / `require_role` dependencies used to protect every other domain.
- **`suppliers/`** — Supplier directory ("Directorio de Proveedores", Patricia Solís / Nexova). Replaces the HR spreadsheet with a [TinyDB](https://tinydb.readthedocs.io/)-backed store, seeded on startup with the 15 suppliers from [`suppliers/seed_data.py`](./suppliers/seed_data.py) (spec: [CONTEXT-suppliers.md](./suppliers/CONTEXT-suppliers.md)). Pydantic (`suppliers/schemas.py`) rejects with `422` any missing `country`, a `status` outside `active`/`suspended`, empty `categories`, or a `currency` that doesn't match the country (Spain→EUR, USA→USD). Suspending (not deleting) is the preferred way to retire a supplier.

## Authentication and authorization

Every route except `POST /auth/login`, `GET /health` and the docs (`/docs`, `/openapi.json`) needs a valid session: `Authorization: Bearer <JWT>`. Without one the API answers `401` (with `WWW-Authenticate: Bearer`); with a valid session but the wrong role, `403`.

- **Login** — OAuth2 password flow: `POST /auth/login` (`application/x-www-form-urlencoded`, fields `username` and `password`) returns `{"access_token": "...", "token_type": "bearer"}`. Unknown user, wrong password and disabled account all give the same `401`. Also served at `/api/auth/*` for the backoffice proxy, like suppliers.
- **Token** — JWT signed with HS256 (`python-jose`), claims `sub`, `iat`, `exp` (30 min by default). The role is *not* in the token: it is read from the user store on every request, so demoting or disabling a user takes effect immediately.
- **Users** — internal accounts in their own TinyDB file, `auth/db.json` (gitignored; passwords stored as bcrypt hashes, max 72 bytes). No public sign-up: an admin creates users with `POST /auth/users`.
- **Roles** (see [ARCHITECTURE_PROPOSAL.md](../../docs/ARCHITECTURE_PROPOSAL.md)):

| Action | `consultant` | `supervisor` | `admin` |
|---|:-:|:-:|:-:|
| Read suppliers (`GET /suppliers…`) | ✅ | ✅ | ✅ |
| Analyze / export incidents | ✅ | ✅ | ✅ |
| Create / edit / rate / status of a supplier (`POST`, `PATCH`) | ❌ | ✅ | ✅ |
| Delete a supplier, create users | ❌ | ❌ | ✅ |

Protection is applied on the routers themselves (`dependencies=[Depends(get_current_user)]`), so a route added to `suppliers/` or `incidents/` is private by default, and `tests/test_auth.py` fails if any documented operation is left open.

### Configuration

| Env var | Purpose |
|---|---|
| `SECRET_KEY` | JWT signing key, at least 32 characters (`openssl rand -hex 32`). **Required in production.** If unset, a random per-process key is used (sessions die on restart, and it breaks with several workers). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime (default `30`). |
| `AUTH_ADMIN_USERNAME` / `AUTH_ADMIN_PASSWORD` | Creates the first admin on startup, only if the user store is empty (username defaults to `admin`). |

Without `AUTH_ADMIN_PASSWORD` the API starts with no users; create one with `uv run create-user --username <name> --role admin` (prompts for the password).

## Endpoints

Supplier routes are served at `/suppliers` (shown in `/docs`) and also at `/api/suppliers`, the path the backoffice uses through the Vite proxy (which only forwards `/api`).

All endpoints below need a session (see above) except `/auth/login` and `/health`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Public. Exchange `username`/`password` (form) for a bearer token. `401` on bad credentials. |
| `GET` | `/auth/me` | The user of the current session. |
| `POST` | `/auth/users` | Create a user (`{"username", "password", "role"}`). Admin only; `409` if the username exists. |
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

Interactive docs (Swagger UI) are available at `/docs` when the server is running; use *Authorize* there with a username and password to try the protected routes.

## Running locally

```bash
cd services/api
pip install -r requirements.txt
export SECRET_KEY=$(openssl rand -hex 32)
export AUTH_ADMIN_PASSWORD='choose-a-password'   # first run only
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
- Login has no rate limiting or lockout yet, and tokens are not revocable before they expire (there is no refresh or logout endpoint). Put the API behind a reverse proxy with rate limits until that is added.
- `uis/backoffice` does not send a token yet, so its calls to `/api/suppliers` and `/api/incidents` now get `401` until a login screen is added.
