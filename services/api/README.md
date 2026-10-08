# Nexova API (`services/api`)

Backend FastAPI centralizado de Nexova. Expone dos dominios:

- **Directorio de proveedores** (`/suppliers`): registro oficial de proveedores, persistido en TinyDB. Especificación en [`09-lightweight-storage/CONTEXT-nexova.md`](../../09-lightweight-storage/CONTEXT-nexova.md).
- **Análisis de incidencias** (`/api/incidents/...`): procesa el CSV del helpdesk con la misma lógica que `scripts/analyze.py`.

## Instalación

Requiere Python 3.12+ y [uv](https://docs.astral.sh/uv/).

```bash
cd services/api
uv sync            # crea .venv e instala dependencias (incluye el grupo dev: pytest, httpx)
```

## Cargar los datos iniciales

```bash
uv run seed
# Seed completed on .../data/suppliers.json: 15 inserted, 0 skipped (already present).
```

El seeder carga los 15 proveedores de `SUPPLIERS_SEED` (copiados en `seed_data.py`). Es idempotente: comprueba cada proveedor por `name` y omite los que ya existen, así que puede ejecutarse varias veces. Cada registro se valida con `SupplierCreate` antes de insertarse.

No es obligatorio ejecutarlo: al arrancar, la API siembra la base automáticamente si está vacía.

## Arrancar la API

```bash
uv run uvicorn main:app --reload --port 8000
```

- Documentación interactiva: <http://localhost:8000/docs>
- Healthcheck: <http://localhost:8000/health>

## Tests

```bash
uv run pytest
```

Los tests de proveedores usan una base TinyDB temporal (`tmp_path`) vía `SUPPLIERS_DB_PATH`, nunca el fichero real.

## Variables de entorno

| Variable            | Por defecto                                   | Descripción                                                                 |
| ------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| `SUPPLIERS_DB_PATH` | `services/api/data/suppliers.json`            | Fichero JSON de TinyDB. Una ruta relativa se resuelve desde el directorio de trabajo. La carpeta `data/` está en `.gitignore`. |
| `CORS_ORIGINS`      | `http://localhost:3000,http://127.0.0.1:3000` | Orígenes permitidos (separados por comas), p. ej. la URL del backoffice.     |

## Estructura

```
services/api/
├── main.py              # Aplicación FastAPI: CORS, routers y lifespan (abre TinyDB y siembra si está vacía)
├── models.py            # Modelos Pydantic: enums, SupplierCreate, Supplier, RateUpdate, StatusUpdate
├── database.py          # Inicialización y acceso a TinyDB (único módulo que toca la base; facilita migrar a Postgres)
├── routes/
│   ├── suppliers.py     # Endpoints del directorio de proveedores (/suppliers)
│   └── incidents.py     # Endpoints de análisis de incidencias (/api/incidents)
├── seed.py              # Carga de datos iniciales (`uv run seed`)
├── seed_data.py         # SUPPLIERS_SEED copiado literalmente del CONTEXT
└── tests/
```

## Modelo de proveedor

| Campo                   | Tipo                                   | Notas                                         |
| ----------------------- | -------------------------------------- | --------------------------------------------- |
| `id`                    | int                                    | `doc_id` de TinyDB. Solo en respuestas.       |
| `name`                  | string, requerido, no vacío            | Único: un alta con nombre repetido da 409.    |
| `country`               | `"Spain"` \| `"USA"`                    |                                               |
| `categories`            | lista, mínimo 1                        | Valores de `VALID_CATEGORIES`.                |
| `monthly_rate`          | float > 0                              |                                               |
| `currency`              | `"EUR"` \| `"USD"`                      | Spain → EUR, USA → USD; otra combinación: 422. |
| `status`                | `"active"` \| `"suspended"`             |                                               |
| `contract_renewal_date` | `YYYY-MM-DD`, opcional                 |                                               |
| `contact_email`         | email, opcional                        |                                               |
| `notes`                 | string, opcional                       |                                               |
| `updated_at`            | datetime UTC ISO 8601                  | Lo genera el sistema al crear y en cada cambio de tarifa. Solo en respuestas. |

El cliente no puede enviar `id` ni `updated_at` (422).

## Endpoints de proveedores (ejemplos con curl)

```bash
API=http://localhost:8000

# Crear (201). 422 si la entrada es inválida, 409 si el nombre ya existe.
curl -X POST $API/suppliers -H 'Content-Type: application/json' -d '{
  "name": "Personio",
  "country": "Spain",
  "categories": ["payroll_and_hr_software", "ats_software"],
  "monthly_rate": 450,
  "currency": "EUR",
  "status": "active",
  "contract_renewal_date": "2027-01-31",
  "contact_email": "sales@personio.example",
  "notes": "En evaluación"
}'

# Listar todos
curl $API/suppliers

# Filtrar por país, por categoría o ambos (valores inválidos → 422)
curl "$API/suppliers?country=Spain"
curl "$API/suppliers?category=ats_software"
curl "$API/suppliers?country=USA&category=office_and_facilities"

# Obtener uno (404 si no existe)
curl $API/suppliers/1

# Actualizar tarifa (actualiza también updated_at). 404 / 422.
curl -X PATCH $API/suppliers/1/rate -H 'Content-Type: application/json' -d '{"monthly_rate": 1250}'

# Activar / suspender. 404 / 422.
curl -X PATCH $API/suppliers/1/status -H 'Content-Type: application/json' -d '{"status": "suspended"}'

# Eliminar (204, 404 si no existe). Preferible suspender: los suspendidos se conservan como historial.
curl -X DELETE $API/suppliers/1
```

## Endpoints de incidencias

```bash
curl -F "file=@../../scripts/incidents-nexova.csv;type=text/csv" $API/api/incidents/analyze
curl -o results.csv $API/api/incidents/results/export
```

## Backoffice

El backoffice (`uis/backoffice`) llama a la API a través de un proxy de Next.js (`/api/suppliers` → `/suppliers`, `/api/incidents` → `/api/incidents`). La URL interna se configura con `API_INTERNAL_URL` (por defecto `http://127.0.0.1:8000`). Para llamar a la API directamente desde el navegador, define `NEXT_PUBLIC_API_URL` y añade ese origen del backoffice a `CORS_ORIGINS`.
