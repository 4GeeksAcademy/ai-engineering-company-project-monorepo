# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.

## Scripts

### `analyze.py` — Analizador de CSV de incidentes de Nexova

Valida y calcula métricas sobre un CSV de incidentes de soporte de Nexova, según las reglas en [`CONTEXT-nexova.md`](./CONTEXT-nexova.md).

- **Qué hace**: carga el CSV, detecta registros inválidos (campos faltantes o fuera de rango, un tipo de regla por problema), e imprime totales, desglose de inválidos por regla, distribución por categoría/estado con porcentajes, y el promedio de satisfacción de los tickets cerrados. Ofrece exportar los resultados a `results.csv` (una métrica por fila).
- **Requisitos**: Python 3.10+, sin dependencias externas — instala una vez el paquete compartido de validación/métricas en modo editable: `pip install -e packages/shared/incidents_analyzer`.
- **Uso**:
  ```bash
  python scripts/analyze.py data/raw/incidents-nexova.csv
  ```
- **Misma lógica que la API**: el código de validación/métricas vive en [`packages/shared/incidents_analyzer`](../packages/shared/incidents_analyzer) y lo reutiliza tal cual el dominio `incidents` de [`services/api`](../services/api), para que el script y la API nunca diverjan.
- **Privacidad**: nunca imprime, registra ni exporta direcciones de `customer_email`, según la nota de stakeholders en `CONTEXT-nexova.md`.

### `seed_incidents.py` — cargar el histórico CSV en el gestor de incidencias

Carga el export histórico del helpdesk en la base del gestor de incidencias (`services/api/incidents/db.json`).

- **Qué hace**: valida cada fila con las reglas compartidas de `incidents_analyzer`, la transforma (`description → title`, `date → created_at`, mapas de estado y categoría, columna opcional `location`/`ubicacion` → `branch`, por defecto `central`) y la inserta con `origin: "customer"`. Las filas inválidas **no** se insertan: se listan con su línea, id y reglas incumplidas (nunca el email). Idempotente: los ids ya guardados se saltan, nunca se sobrescriben. Termina comprobando que `/api/incidents/summary` coincide con las métricas esperadas del CSV transformado (código de salida `1` si no).
- **Requisitos**: el entorno de la API (pydantic, tinydb…): `cd services/api && python -m venv .venv && .venv/bin/pip install -r requirements.txt`.
- **Uso**:
  ```bash
  services/api/.venv/bin/python scripts/seed_incidents.py              # data/raw/incidents-nexova.csv
  services/api/.venv/bin/python scripts/seed_incidents.py --reset      # borra las incidencias antes
  services/api/.venv/bin/python scripts/seed_incidents.py --csv otro.csv --db /tmp/incidents.json
  ```
- **Detalle y tabla de mapeo**: [`services/api/README.md`](../services/api/README.md#incident-manager). El CONTEXT no define los mapas; viven en [`packages/shared/incidents/contract.json`](../packages/shared/incidents/contract.json).
