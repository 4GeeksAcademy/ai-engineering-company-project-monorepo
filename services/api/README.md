# services/api

Servicio FastAPI para analizar CSVs de incidencias de Brasaland y exportar el ultimo resultado generado.

## Requisitos

- Python 3.11+

## Instalacion

```bash
cd services/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Ejecucion

```bash
cd services/api
uvicorn app.main:app --reload
```

## Endpoints

- POST /api/incidents/analyze
- GET /api/incidents/results/export