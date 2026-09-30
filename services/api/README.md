# HealthCore API

FastAPI app includes PHI-free incident analysis endpoints and persistent supplier-directory endpoints backed by TinyDB.

## Run

From this directory:

```sh
uv sync --extra test
uv run seed
uv run uvicorn main:app --reload
```

On API startup, the idempotent seeder inserts any missing context suppliers, so a fresh directory is populated without a separate setup step. TinyDB writes supplier records to `services/api/data/suppliers.json`. Run `uv run seed` to restore any missing context suppliers later; it does not duplicate existing records by name.

The service layout keeps the FastAPI entry point (`main.py`), models (`models.py`), and database module (`database.py`) at the service root. Endpoint modules and the initial-data loader (`routes/seed.py`) are under `routes/`. Add all future initial-data loading to `routes/seed.py`.

The backoffice uses a same-origin proxy. Set `API_SERVER_URL` for the backoffice server if the API is not reachable at `http://127.0.0.1:8000` from that server.
