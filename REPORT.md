# REPORT.md

## Resumen
Se realizó una auditoría de Lighthouse sobre el Backoffice de Brasaland en escritorio y móvil. Se aplicaron ajustes de metadatos, idioma, tipografía y reutilización de componentes.

## Comparación Lighthouse

### Escritorio

| Categoría | Antes | Después |
|---|---:|---:|
| Performance | 100 | 100 |
| Accessibility | 95 | 95 |
| Best Practices | 78 | 100 |
| SEO | 100 | 100 |

### Móvil

| Categoría | Antes | Después |
|---|---:|---:|
| Performance | 95 | 97 |
| Accessibility | 100 | 100 |
| Best Practices | 96 | 96 |
| SEO | 100 | 100 |

**Nota sobre las mediciones:** La puntuación de Performance móvil pasó de 95 a 97. Esta diferencia es una variación observada entre ejecuciones y no demuestra por sí sola que los cambios implementados sean su causa.

La primera medición de escritorio se realizó con extensiones activas. La segunda se realizó en incógnito, sin esas extensiones. Por tanto, el cambio de Best Practices de 78 a 100 no se atribuye a una mejora del código.

## Cambios implementados

- Metadatos específicos para Brasaland Backoffice.
- Documento HTML configurado en español.
- Tipografía Geist aplicada al body.
- Creación e integración del componente reutilizable `PageHeader` en la página de perfil.
- Compilación de producción verificada mediante `npm run build`.

## Limitaciones y trabajo pendiente

- Auditar el Website corporativo cuando esté disponible su frontend original.
- Revisar y corregir el contraste señalado por Lighthouse.
- Analizar oportunidades adicionales de optimización del JavaScript propio.
- Configurar HTTPS en un entorno de despliegue con certificado TLS.
- Completar la auditoría global de ambos frontends.

## Evidencias

Las capturas de Lighthouse se encuentran en:

- `audit/before/`
- `audit/after/`

## Conclusión

El Backoffice compila correctamente en producción y presenta puntuaciones altas de Lighthouse en escritorio y móvil. Se incorporaron mejoras de metadatos, accesibilidad semántica del documento y reutilización de componentes. Las diferencias entre mediciones deben interpretarse considerando las condiciones de ejecución. La auditoría del Website corporativo permanece pendiente por falta de su código fuente original.