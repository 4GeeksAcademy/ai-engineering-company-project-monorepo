# Informe de mejoras de rendimiento

## Cambios aplicados

- **Sitio corporativo:** sustituida la imagen LCP remota de Unsplash por variantes WebP locales responsive (1600 px: 128,194 bytes; 800 px: 44,148 bytes), con dimensiones explícitas, prioridad alta y decodificación síncrona. Eliminada la cascada `@import` de Google Fonts y la animación de escala del LCP. Añadidos `icon.svg` y `robots.txt` de Next para eliminar el 404 de favicon y ofrecer reglas de rastreo.
- **Backoffice:** extraídos `MetricCard` y `BreakdownList` a `src/app/incidents/components.tsx`, reutilizados por los KPIs, categorías y estados. El color de `.eyebrow` cambió a `#626b75`, que supera el contraste AA medido.
- **Higiene del código:** no se detectaron URLs loopback nuevas ni errores de consola en las corridas Lighthouse posteriores.

## Impacto medido

Scores Lighthouse: medianas de tres corridas, en orden Performance / Accessibility / Best Practices / SEO. Las puntuaciones se redondean a enteros.

Las capturas PNG muestran la primera corrida de cada modo; las tablas usan las medianas de las tres corridas. Por eso el score del backoffice móvil en la captura puede diferir de la mediana final.

| Página | Modo | Before | After | Cambio | Métricas principales before → after |
| --- | --- | --- | --- | --- | --- |
| Sitio corporativo `/` | Escritorio | 98 / 100 / 96 / 100 | 100 / 100 / 100 / 100 | Performance +2; Best Practices +4 | LCP 985 → 606 ms; CLS 0.00339 → 0 |
| Sitio corporativo `/` | Móvil | 73 / 100 / 96 / 100 | 89 / 100 / 100 / 100 | Performance +16; Best Practices +4 | LCP 4,309 → 2,491 ms; bytes transferidos 520,826 → 185,585 |
| Backoffice `/incidents` | Escritorio | 100 / 95 / 100 / 100 | 100 / 100 / 100 / 100 | Accessibility +5 | TBT 62 → 39 ms; CLS 0 → 0 |
| Backoffice `/incidents` | Móvil | 87 / 95 / 100 / 100 | 97 / 100 / 100 / 100 | Performance +10; Accessibility +5 | LCP 1,768 → 1,560 ms; TBT 485 → 199 ms |

### Variación y límites

- El LCP móvil web quedó en 2,491 ms de mediana (rango after 2,415–2,516 ms): mejora 42% y queda justo alrededor del umbral de 2.5 s, no es un margen amplio.
- El TBT móvil web subió de 280 a 364 ms de mediana (rangos 17–405 y 299–395 ms). El score Performance mejora por la reducción de LCP; este TBT no mejora y merece seguimiento.
- El TBT móvil del backoffice bajó 59% (485 a 199 ms); las corridas after dieron 174–234 ms.
- Las páginas se midieron localmente con builds de producción, Lighthouse 13.5.0 y Chrome 154.0.8037.57. No hay CrUX/RUM para estas URLs locales; los cambios de laboratorio no demuestran por sí solos una mejora de experiencia de usuarios reales.

## Verificación

- `npm run lint` y `npm run build` pasan para el backoffice.
- El build de producción del sitio corporativo pasa y genera `/robots.txt` y `/icon.svg`.
- Las cuatro corridas after no tuvieron errores runtime. La consola del sitio dejó de reportar el 404 del favicon.
- [Capturas after](audit/after/) e [informes Lighthouse after](audit/after/) contienen las vistas e informes JSON/HTML; los JSON de `run2` y `run3` preservan el rango de repetición.