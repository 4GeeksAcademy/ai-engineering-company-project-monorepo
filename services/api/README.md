# TrackFlow Supplier Directory API

Backend FastAPI con almacenamiento ligero en TinyDB para gestionar proveedores.

## Ejecutar

Desde la carpeta `services/api`:

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Seeder

Desde la carpeta `services/api`:

```bash
uv run seed
```

El seeder es idempotente: no duplica proveedores ya existentes.

## Endpoints

- `POST /suppliers` crea un proveedor.
- `GET /suppliers` lista proveedores, con filtros opcionales `country` y `category`.
- `GET /suppliers/{id}` devuelve un proveedor por ID.
- `PATCH /suppliers/{id}/rate` actualiza `rate_per_shipment` y registra `updated_at`.
- `PATCH /suppliers/{id}/status` cambia estado (`active` o `suspended`).
- `DELETE /suppliers/{id}` elimina un proveedor.
