# Pulse Desk

Interfaz estática para analizar incidencias mediante `POST /api/incidents/analyze`.

## Ejecución

1. Arranca la API FastAPI en `http://127.0.0.1:8000`.
2. Desde la raíz del repositorio ejecuta:

```bash
python -m http.server 5173 --directory uis/backoffice
```

3. Abre `http://127.0.0.1:5173`.

La página incluye selector de fichero y drag & drop. El CSV se envía como `multipart/form-data` en el campo `file`.
