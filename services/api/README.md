# TrackFlow API Service

FastAPI service for TrackFlow incident analysis.

## Endpoints

- `POST /api/incidents/analyze` (multipart/form-data, field `file`)
- `GET /api/incidents/results/export`
- `GET /health`

## Run

From repository root:

```bash
python -m pip install -r services/api/requirements.txt
uvicorn services.api.main:app --reload
```
