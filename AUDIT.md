# AUDIT.md

## Objetivo

Auditoría de rendimiento y calidad del frontend de Brasaland.

## Entorno

- Fecha: 07/11/2026.
- Aplicación medida: Backoffice.
- Next.js: 16.4.3.
- Modo: producción (`npm run build` y `npm run start -- -p 3001`).
- Lighthouse: Navigation, escritorio y móvil.
- URL local: http://localhost:3001.

## Medición inicial de escritorio

| Categoría | Puntuación |
|---|---:|
| Performance | 100 |
| Accessibility | 95 |
| Best Practices | 78 |
| SEO | 100 |

Métricas iniciales:
- FCP: 0,2 s.
- LCP: 0,5 s.
- TBT: 0 ms.
- CLS: 0.
- Speed Index: 0,2 s.

## Medición inicial de móvil

| Categoría | Puntuación |
|---|---:|
| Performance | 95 |
| Accessibility | 100 |
| Best Practices | 96 |
| SEO | 100 |

## Hallazgos iniciales

- Lighthouse señaló 24 solicitudes servidas mediante HTTP.
- Se detectó JavaScript sin utilizar. Una parte importante procedía de extensiones del navegador, entre ellas Adobe Acrobat.
- Se detectaron oportunidades relacionadas con JavaScript, reflow y contraste.
- La cadena crítica de red observada contenía el documento inicial y una hoja CSS.
- La medición local utiliza HTTP y no permite validar el comportamiento HTTPS del despliegue.

## Cambios realizados

- Actualización de metadatos del Backoffice.
- Cambio del idioma del documento de `en` a `es`.
- Aplicación de la fuente Geist al body.
- Creación e integración del componente reutilizable `PageHeader` en la página de perfil.
- Verificación de compilación de producción mediante `npm run build`.

## Limitaciones

- La aplicación Website corporativa no se ha podido auditar porque su código fuente original no está disponible en las ramas revisadas.
- La configuración Docker de desarrollo publica los puertos 3000 y 3001 sin proxy TLS.
- La diferencia entre las mediciones de escritorio de Best Practices debe interpretarse considerando que la primera ejecución tenía extensiones activas y la segunda se realizó en incógnito.
- Quedan pendientes la revisión del contraste y el análisis de oportunidades adicionales de optimización del JavaScript propio.

## Evidencias

- Mediciones iniciales: `audit/before/`
- Mediciones finales: `audit/after/`