# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.

## Scripts

### `analyze.py` — Analizador de CSV de incidentes de Nexova

Valida y calcula métricas sobre un CSV de incidentes de soporte de Nexova, según las reglas en [`CONTEXT-nexova.md`](./CONTEXT-nexova.md).

- **Qué hace**: carga el CSV, detecta registros inválidos (campos faltantes o fuera de rango, un tipo de regla por problema), e imprime totales, desglose de inválidos por regla, distribución por categoría/estado con porcentajes, y el promedio de satisfacción de los tickets cerrados. Ofrece exportar los resultados a `results.csv` (una métrica por fila).
- **Requisitos**: Python 3.10+, sin dependencias externas — instala una vez el paquete compartido de validación/métricas en modo editable: `pip install -e packages/incidents_analyzer`.
- **Uso**:
  ```bash
  python scripts/analyze.py data/raw/incidents-nexova.csv
  ```
- **Misma lógica que la API**: el código de validación/métricas vive en [`packages/incidents_analyzer`](../packages/incidents_analyzer) y lo reutiliza tal cual el dominio `incidents` de [`services/api`](../services/api), para que el script y la API nunca diverjan.
- **Privacidad**: nunca imprime, registra ni exporta direcciones de `customer_email`, según la nota de stakeholders en `CONTEXT-nexova.md`.
