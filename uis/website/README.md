# Sitio web público de Nexova

Sitio corporativo estático de Nexova, ubicado en `uis/website/` conforme a la guía de `uis/`. El idioma base de esta etapa es español.

## Archivos actuales

- `index.html`: landing inicial con metadatos, marcado Schema.org, header adaptable y hero.
- `application.html`: destino del CTA con una estructura inicial; el formulario se añadirá en una etapa posterior.

## Tecnologías

- HTML5 semántico.
- Tailwind CSS v4 Browser CDN, cargado en cada página con el script oficial indicado para este proyecto. No se añadieron dependencias ni archivos de configuración de Tailwind.
- Sin framework frontend ni JavaScript de aplicación en esta etapa.

> Tailwind Browser CDN requiere conexión a Internet y está pensado para desarrollo/prototipos, no como configuración de producción.

## Ejecutar desde la raíz del monorepo

Para ver la web con recarga automática al guardar cambios, desde la raíz del monorepo ejecuta:

```bash
npx --yes live-server uis/website --port=8080 --no-browser
```

`live-server` sirve los archivos estáticos y vigila cambios; al guardar `index.html`, `application.html` u otro archivo de la carpeta, el navegador conectado se recarga automáticamente. Abre `http://127.0.0.1:8080` en un entorno local. En Codespaces o un contenedor remoto, usa la pestaña **Ports** de VS Code para reenviar el puerto `8080` y abre la URL que allí se muestra.

La opción `--no-browser` evita intentar abrir un navegador en el entorno donde corre el servidor. `npx --yes` puede descargar `live-server` temporalmente si no está en la caché de npm; no lo añade como dependencia del proyecto ni modifica `package.json` o un lockfile. La primera ejecución necesita acceso a npm. Para detener el servidor, pulsa `Ctrl+C` en la terminal.

Tailwind CSS v4 se carga desde jsDelivr, así que el navegador también necesita acceso a Internet para compilar/aplicar las clases de Tailwind.

Este comando proporciona servidor estático y recarga en vivo; no es un build ni una suite de pruebas. No hay configuración propia de servidor de desarrollo o tests en esta etapa.
