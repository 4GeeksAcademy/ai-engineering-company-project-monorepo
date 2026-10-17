# Brasaland Backoffice

Panel interno realizado con Next.js, React y TypeScript.

Permite cargar el CSV de incidencias de Brasaland, visualizar métricas y descargar los resultados.

## Ejecutar

Primero debe estar funcionando FastAPI en el puerto 8000.

Después:

```bash
npm install
npm run dev -- --hostname 0.0.0.0
```

La aplicación utiliza un rewrite de Next.js para comunicarse con FastAPI.
