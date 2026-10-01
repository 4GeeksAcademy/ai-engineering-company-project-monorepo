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

The service layout keeps the FastAPI entry point (`main.py`), supplier models (`models.py`), auth request/response models (`models_auth.py`), and database module (`database.py`) at the service root. Endpoint modules and the initial-data loader (`routes/seed.py`) are under `routes/`. Add all future initial-data loading to `routes/seed.py`.

The backoffice uses a same-origin proxy. Set `API_SERVER_URL` for the backoffice server if the API is not reachable at `http://127.0.0.1:8000` from that server.
