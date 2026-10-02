## Qué incluye

API de gestión de proveedores de Nexova (FastAPI + TinyDB + Pydantic) con seeder, y la página del directorio en el frontend. Sustituye la hoja de cálculo de Patricia por una única fuente de verdad.

### Estructura de entrega

```
services/api/
  main.py             aplicación FastAPI
  models.py           modelos Pydantic
  database.py         inicialización de TinyDB y acceso a datos
  routes/suppliers.py endpoints del directorio de proveedores
  seed.py             script de carga de datos iniciales (uv run seed)
uis/application/app/suppliers/   página del directorio (page.tsx, SupplierRow.tsx, SupplierForm.tsx, api.ts, types.ts)
```

El modelo, las 9 categorías, los 2 estados y los 15 proveedores del seeder coinciden con el CONTEXT ([`services/api/CONTEXT-suppliers.md`](../services/api/CONTEXT-suppliers.md)).

### Cómo probarlo

```bash
cd services/api
uv run seed                                  # carga los 15 proveedores (no duplica si se repite)
uv run uvicorn main:app --port 8000          # API + Swagger en http://localhost:8000/docs

npm install                                  # desde la raíz, una vez
npm run dev:application                      # http://localhost:5175/suppliers
```

Tests: `cd services/api && uv run --with pytest --with httpx pytest -q` (42) y, con API y app arrancadas y una base recién sembrada, `cd uis/application && npm run e2e` (28 comprobaciones; Chromium y Firefox).

## Capturas

**1. Salida de `uv run seed`** (primera ejecución sobre una base vacía y una repetida: no duplica). Salida real del comando, renderizada como imagen.

![uv run seed](https://raw.githubusercontent.com/ELDER2007/ai-engineering-company-project-monorepo-INES/delivery/suppliers-directory/docs/screenshots/suppliers-seed.png)

**2. Endpoint de filtrado en Swagger UI:** `GET /suppliers?country=USA` devuelve solo los proveedores de USA.

![Swagger filtro por país](https://raw.githubusercontent.com/ELDER2007/ai-engineering-company-project-monorepo-INES/delivery/suppliers-directory/docs/screenshots/suppliers-swagger-filter.png)

**3. Listado en la interfaz web con un filtro aplicado** (país = USA, 7 proveedores; los suspendidos se ven atenuados).

![Listado con filtro](https://raw.githubusercontent.com/ELDER2007/ai-engineering-company-project-monorepo-INES/delivery/suppliers-directory/docs/screenshots/suppliers-ui-filter.png)

## Requisitos del proyecto

| Requisito | Estado |
|---|---|
| Modelo Pydantic con los campos del CONTEXT; `status` solo `active`/`suspended`; tarifa (`monthly_rate`) > 0; `updated_at` lo genera el sistema | Cumple; 422 antes de llegar a TinyDB |
| Moneda coherente con el país (Spain→EUR, USA→USD) | Cumple (422 si no coincide) |
| `POST /suppliers` (201 + objeto con id), `GET /suppliers` (filtros `?country=` y `?category=`), `GET /suppliers/{id}` (404), `PATCH /suppliers/{id}/rate` (sella `updated_at`), `PATCH /suppliers/{id}/status` (422 si no permitido), `DELETE /suppliers/{id}` (404) | Cumple |
| Proveedores suspendidos no se eliminan (CONTEXT) | `DELETE` de un suspendido responde 409 |
| Seeder: `uv run seed`, sin duplicados, confirma en consola los registros insertados | Cumple |
| Persistencia: los datos siguen tras reiniciar el servidor | Comprobado |
| Interfaz: listado desde la API, filtros por país y categoría sin recargar, formulario con validación en cliente y error de la API, edición de tarifa, activar/suspender, activos y suspendidos diferenciados, renovaciones a 60 días destacadas | Cumple (e2e 28/28) |

## Notas

- Las rutas se sirven en `/suppliers` y también en `/api/suppliers` (el proxy de Vite de la app solo reenvía `/api`).
- TinyDB no es fiable con varios procesos escribiendo a la vez; el README de `services/api` lo indica y el plan es migrar a Postgres.
- Se incluye además `docs/aprendiendo-con-la-ia/`, una guía visual de cómo se construyó el proyecto.
