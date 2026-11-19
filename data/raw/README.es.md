# Carpeta `data/raw`

Esta carpeta está pensada para almacenar **datos en bruto** (raw) relacionados con la compañía: dumps, exports, archivos de ejemplo, muestras de eventos, o datasets sin transformar.

- **Propósito principal**: servir como zona de aterrizaje o referencia de datos originales antes de ser procesados por pipelines.
- **Recomendación**: documenta el origen de cada dataset, formato, tamaño esperado, consideraciones de privacidad/PII y cómo se versiona (idealmente evitando subir datos sensibles al repositorio).

## Contenido

- `telemetry_YYYY-MM-DD.csv` — backup diario de `telemetry_events` que escribe `scripts/nightly_export.py` (hito 21): una fila por evento con `timestamp` en ese día UTC. Es para auditoría y recuperación; el pipeline lee de la base de datos, no de aquí. Lleva `user_id` y `session_id`, así que **no se versiona** (`.gitignore`). Se escribe una vez por día y nunca se sobrescribe.
