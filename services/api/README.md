# Brasaland Incident API

API FastAPI con SQLite local para registrar y consultar incidencias. Desde la raíz del repositorio:

```bash
python -m pip install -r services/api/requirements.txt
uvicorn services.api.main:app --reload
```

La interfaz también queda disponible en `http://localhost:8000/app`. La base de datos se crea en `services/api/incidents.db`. Se puede cambiar con `INCIDENTS_DATABASE=/ruta/incidents.db`.