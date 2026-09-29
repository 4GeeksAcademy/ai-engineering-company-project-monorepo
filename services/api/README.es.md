# API de incidencias

Entry point del backend FastAPI. Los routers y la lógica de dominio viven en el paquete Python bajo `src/` para conservar una única aplicación importable.

Arranque desde la raíz del repositorio:

```bash
uvicorn services.api.main:app --reload
```

Endpoints principales:

- `POST /api/incidents/analyze`
- `GET /api/incidents/results/export`
