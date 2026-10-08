# TrackFlow incident analysis API

API FastAPI para validar CSV de incidencias. Reutiliza las reglas y el calculo de `scripts/analyze.py`, procesa el archivo desde un temporal y conserva unicamente el ultimo resultado agregado en memoria.

## Ejecutar

Desde la raiz del monorepo:

```bash
python -m pip install -r services/api/requirements.txt
uvicorn services.api.main:app --reload
```

El backoffice llama a rutas `/api/*` del mismo origen y Next.js las reenvia a `http://127.0.0.1:8000`. Para otro host interno, configura `INCIDENTS_API_INTERNAL_URL` antes de iniciar Next.js. Si se consume la API directamente desde un origen web distinto, configura `BACKOFFICE_ORIGIN` en el servicio.

## Endpoints

- `POST /api/incidents/analyze`: recibe `file` como `multipart/form-data` y devuelve metricas, errores de validacion, desgloses por categoria/estado/pais y satisfaccion.
- `GET /api/incidents/results/export`: descarga el ultimo analisis como `results.csv`; devuelve `404` antes de que se procese un archivo.

Los archivos vacios, extensiones distintas de `.csv`, cabeceras incompatibles y contenido ilegible devuelven `400`. Las filas con valores invalidos se contabilizan y se excluyen de los agregados. Los correos de clientes nunca aparecen en respuestas, logs ni exportaciones; el archivo subido se elimina tras el analisis.