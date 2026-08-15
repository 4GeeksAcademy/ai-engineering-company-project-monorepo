# Brasaland Incidents API

Backend FastAPI para analizar archivos CSV de incidencias de Trackflow.

## Ejecutar

Desde la raíz del monorepo:

```bash
source .venv/bin/activate
python -m uvicorn services.api.main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

### Analizar CSV

`POST /api/incidents/analyze`

Recibe un archivo CSV mediante `multipart/form-data`.

### Exportar último análisis

`GET /api/incidents/results/export`

Devuelve el último análisis en formato CSV.
