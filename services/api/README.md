# HealthCore API (`services/api`)

FastAPI backend exposing patient incident analysis endpoints. Validation and metrics use the shared module at `shared/incident_analyzer/` (same logic as `scripts/analyze.py`).

## Setup

```bash
cd services/api
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
```

## Run

From `services/api`:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/incidents/analyze` | Multipart CSV upload → JSON summary |
| `GET` | `/api/incidents/results/export` | Download last analysis as `results.csv` |
| `GET` | `/health` | Liveness check |
