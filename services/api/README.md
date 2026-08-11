# TrackFlow Supplier API

FastAPI backend for the TrackFlow Supplier Directory.

## Commands

- `uv run seed`
- `uv run uvicorn services.api.main:app --host 0.0.0.0 --port 8000`
- `uv run --extra dev pytest services/api/tests -q`

## Storage

- TinyDB file path: `data/tinydb/suppliers.json`
- Override it with `TRACKFLOW_TINYDB_PATH`
