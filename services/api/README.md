# HealthCore API

FastAPI app includes PHI-free incident analysis endpoints, a persistent supplier directory, and stateless bearer-token authentication. Users and linked profiles are stored in TinyDB alongside the existing supplier table; no SQL/Supabase auth store is used.

## Run

From this directory:

```sh
uv sync --extra test
cp .env.example .env
# Replace SECRET_KEY with a random value of at least 32 characters; do not commit .env.
set -a && . ./.env && set +a
uv run seed
uv run uvicorn main:app --reload
```

Authentication requires `SECRET_KEY` and accepts `ACCESS_TOKEN_EXPIRE_MINUTES` (default: 30). Generate a strong signing key for local use, for example with `openssl rand -hex 32`; never use a sample/test value in a deployed environment. The API intentionally has no built-in signing-key fallback.

Public registration is `POST /users` with `email`, `password`, `name`, and optional `phone`/`address`. New accounts receive the `user` role; registration cannot set role or account status. Log in with `POST /auth/login`, then send `Authorization: Bearer <access_token>` to protected endpoints. User listing and role/account-status changes require an admin; users may access their own user record, credentials, and `/profiles/me`, while cross-user access is forbidden unless the caller is an admin.

All supplier operations and both incident-analysis operations require bearer authentication. The public `uis/website` must not rely on these internal authenticated endpoints. The interactive API documentation is available at `/docs` while the server is running.

On API startup, the idempotent seeder inserts any missing context suppliers, so a fresh directory is populated without a separate setup step. TinyDB writes supplier records to `services/api/data/suppliers.json`. Run `uv run seed` to restore any missing context suppliers later; it does not duplicate existing records by name.

### Password recovery and change

`POST /auth/forgot-password` accepts `{ "email": "..." }` and always returns the same confirmation message whether or not an active account exists. For known active users it creates a 30-minute reset token, stores only its SHA-256 digest in TinyDB, and sends the reset URL using Resend. `POST /auth/reset-password` accepts `{ "token": "...", "new_password": "..." }`; a valid token succeeds once and expired, unknown, or reused tokens return 400. Authenticated users change their password through `POST /auth/change-password` with `{ "current_password": "...", "new_password": "..." }`.

Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and optionally `BACKOFFICE_URL` (defaults to `http://localhost:3002`) in the API process environment or its ignored `.env` file. Resend requires an allowed/verified sender according to the account's current sending policy. Never commit credentials. The API responds generically on email-provider failures and does not log reset links or tokens; a failed delivery invalidates that reset token. Local automated tests mock delivery. To verify actual delivery, configure the Resend variables, register an account at an address that can receive mail, request a reset from the backoffice, follow the emailed link within 30 minutes, and sign in with the new password. Reset tokens are stored in a dedicated TinyDB table in the local JSON database; use a transactional/concurrency-safe database for multi-worker production deployment.

The service layout keeps the FastAPI entry point (`main.py`), supplier models (`models.py`), auth request/response models (`models_auth.py`), and database module (`database.py`) at the service root. Endpoint modules and the initial-data loader (`routes/seed.py`) are under `routes/`. Add all future initial-data loading to `routes/seed.py`.

The backoffice uses a same-origin proxy. Set `API_SERVER_URL` for the backoffice server if the API is not reachable at `http://127.0.0.1:8000` from that server.
