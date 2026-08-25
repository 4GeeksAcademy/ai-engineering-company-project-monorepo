# Brasaland Backoffice

Panel interno realizado con Next.js, React y TypeScript.

Incluye:

- Módulo de incidencias: carga de CSV, métricas y descarga de resultados.
- Módulo de proveedores: listado, filtros por país/categoría, alta de proveedor, actualización de tarifa y cambio de estado.

## Ejecutar

Primero debe estar funcionando FastAPI en el puerto 8000.

Después:

```bash
npm install
npm run dev -- --hostname 0.0.0.0
```

La aplicación utiliza un rewrite de Next.js para comunicarse con FastAPI.
