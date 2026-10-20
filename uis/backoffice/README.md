# TrackFlow backoffice

Vista interna para revisar solicitudes de onboarding, priorizar cuentas por volumen mensual y observar indicadores de operacion.

## Ejecutar

```bash
npm install
npm run dev
```

Los datos de la pantalla son demostrativos y estan preparados para conectarse a un servicio bajo `/services`.

## Analisis de incidencias

La ruta `/incidents-analysis` permite cargar un CSV de incidencias de TrackFlow, revisar errores de validacion y descargar los resultados agregados. Next.js reenvia `/api/*` al servicio interno en `http://127.0.0.1:8000`, por lo que el navegador usa el mismo origen incluso en Codespaces. Para otro host interno, configura `INCIDENTS_API_INTERNAL_URL` antes de arrancar Next.js. La API se describe en [`services/api/README.md`](../../services/api/README.md).

## Directorio de proveedores

La ruta `/suppliers` consume la API de TinyDB para listar, filtrar, registrar y actualizar proveedores. El contrato específico está definido por el [briefing oficial de TrackFlow](https://github.com/4GeeksAcademy/ai-engineering-syllabus/blob/main/content/contexts/supplier-directory/trackflow-BRIEFING.es.md). Inicia primero la API y ejecuta `uv run seed` desde `services/api`; los comandos completos están en [`services/api/README.md`](../../services/api/README.md).

Evidencias: [seeder](../../docs/screenshots/supplier-seed.png), [respuesta API filtrada](../../docs/screenshots/supplier-api-filter.png) y [pantalla filtrada](../../docs/screenshots/supplier-directory-filter.png).
