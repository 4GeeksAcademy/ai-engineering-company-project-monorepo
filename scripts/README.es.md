# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.

## Scripts disponibles

### `analyze.py`

Utilidad CLI para analizar un archivo CSV de incidentes, detectar filas inválidas y calcular métricas resumidas a partir de los registros válidos.

- **Uso**: `python3 scripts/analyze.py incidents.csv`
- **Encabezados aceptados**: `categoria` o `category`, `estado` o `status`, `satisfaccion` o `satisfaction`
- **Reglas de validación**: categoría y estado son obligatorios, el estado debe ser `abierto`, `cerrado` o `descartado`, y los casos cerrados requieren una satisfacción entre `0` y `5`
- **Salida**: resumen legible en consola y exportación opcional a `results.csv` tras confirmación interactiva

> _English version: [README.md](./README.md)._
