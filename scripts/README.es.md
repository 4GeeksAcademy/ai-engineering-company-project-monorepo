# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.

## Analizador de incidencias Brasaland

- Script principal: `analyze.py`
- Fixture validado: `incidents-brasaland.csv`
- Ejecución: `python3 scripts/analyze.py scripts/incidents-brasaland.csv`
- Comportamiento: valida registros inválidos, imprime el resumen en consola y permite exportar `results.csv` con columnas `metric`, `value` y `percentage`.
