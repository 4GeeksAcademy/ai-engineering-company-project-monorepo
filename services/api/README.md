# TrackFlow API

API FastAPI para analizar CSV de incidencias y gestionar el directorio de proveedores con TinyDB. El contrato y los datos iniciales del directorio siguen el [briefing oficial de TrackFlow](https://github.com/4GeeksAcademy/ai-engineering-syllabus/blob/main/content/contexts/supplier-directory/trackflow-BRIEFING.es.md).

## Ejecutar

Desde `services/api`:

```bash
uv sync --group dev
uv run seed
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

El seeder inserta 15 proveedores y es idempotente. TinyDB persiste en `services/api/data/suppliers.json`; `SUPPLIERS_DB_PATH` permite usar otra ruta.

En otra terminal, inicia el backoffice desde `uis/backoffice`:

```bash
npm install
npm run dev
```

Next.js reenvía `/api/suppliers/*` al API en `http://127.0.0.1:8000`, sin interceptar la página `/suppliers`. Configura `INCIDENTS_API_INTERNAL_URL` para usar otro host. Si consumes el API desde un origen distinto, configura `BACKOFFICE_ORIGIN`.

## Contrato de proveedores

El modelo acepta `USA` o `Spain`, las ocho categorías del briefing y los estados `active` o `suspended`. `rate_per_shipment` debe ser positivo; la moneda es `USD` para USA y `EUR` para Spain. `updated_at` lo genera el sistema. `service_zone`, `contact_email` y `notes` son opcionales; el email se valida cuando está presente. El directorio de proveedores usa los países del briefing específico y no modifica las reglas de países del flujo de onboarding.

## Endpoints

- `POST /suppliers`: crea un proveedor y devuelve el ID de TinyDB.
- `GET /suppliers`: lista proveedores; filtros opcionales `country` y `category`.
- `GET /suppliers/{id}`: consulta un proveedor; devuelve `404` si no existe.
- `PATCH /suppliers/{id}/rate`: actualiza `rate_per_shipment` y `updated_at`.
- `PATCH /suppliers/{id}/status`: cambia entre `active` y `suspended`.
- `GET /suppliers/{id}/status-history`: consulta las transiciones de estado persistidas.
- `DELETE /suppliers/{id}`: elimina un proveedor; devuelve `404` si no existe.
- `POST /api/incidents/analyze`: recibe un CSV como `multipart/form-data` y devuelve métricas y errores agregados.
- `GET /api/incidents/results/export`: exporta el último análisis; devuelve `404` si todavía no hay uno.

Pruebas del contrato, filtros, validaciones, persistencia y seeder:

```bash
uv run pytest tests
```

## Evidencias

- [Salida del seeder](../../docs/screenshots/supplier-seed.png)
- [Respuesta del filtro por país en Swagger UI](../../docs/screenshots/supplier-api-filter.png)
- [Directorio web filtrado por país](../../docs/screenshots/supplier-directory-filter.png)

En el análisis de incidencias, archivos vacíos, extensión distinta de `.csv`, cabeceras incompatibles y contenido ilegible devuelven `400`. Las filas inválidas se excluyen de agregados y los correos de clientes no aparecen en respuestas, logs ni exportaciones.