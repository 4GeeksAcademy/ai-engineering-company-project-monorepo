# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

`analyze.py` valida y resume el CSV de incidencias de TrackFlow. Requiere las columnas `incident_id`, `date`, `country`, `customer_type`, `tracking_number`, `carrier`, `category`, `description`, `status`, `customer_email` y `satisfaction_score`; ejecuta `python scripts/analyze.py scripts/incidents-trackflow.csv`. Informa solo agregados y puede guardar `results.csv` en el directorio actual. Nunca muestra ni exporta correos individuales.

`incidents-trackflow.csv` es un fixture sintético de 100 filas con correos `example.com`, construido para reproducir las métricas esperadas sin incorporar las direcciones reales del dataset fuente.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.
