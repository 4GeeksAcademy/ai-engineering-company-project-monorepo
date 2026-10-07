# Brasaland locations (Technology / Operations)

Router: `services/api/locations.py` (included from `services/api/app.py`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/locations` | List all company-owned locations |
| GET | `/locations/overview` | Summary for backoffice welcome (counts, COP/USD, markets) |

Facts from root `CONTEXT.md`: **14** locations, **Colombia + Florida**, currencies **COP** and **USD**.

```bash
uvicorn api.app:app --reload --host 127.0.0.1 --port 8000
curl -sS http://127.0.0.1:8000/locations/overview
```
