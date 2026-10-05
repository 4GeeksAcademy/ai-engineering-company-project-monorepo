# Auditoria de rendimiento frontend

## Alcance y metodo

Se auditaron la home corporativa (`/`) y la vista de incidencias del backoffice (`/incidents`) en escritorio y móvil. Las mediciones se hicieron sobre builds de producción (`next build` + `next start`), con Lighthouse 13.5.0 y Chrome 154.0.8037.57. Se ejecutaron tres navegaciones independientes por combinación y se reportan medianas y rangos. Las capturas PNG corresponden a la primera corrida; cada corrida tiene además su JSON y el primer informe incluye HTML.

Las URLs fueron locales (`127.0.0.1:3100` y `127.0.0.1:3101`), con caché fría. CrUX/RUM no está disponible para estas URLs locales, por lo que los datos siguientes son de laboratorio y no representan percentiles de usuarios reales. TBT se usa como señal de trabajo bloqueante; INP no se obtiene de una navegación Lighthouse sin interacción.

## Linea base

Scores en orden Performance / Accessibility / Best Practices / SEO. Las métricas son medianas (rango entre tres corridas).

| Página | Modo | Scores | LCP | TBT | CLS | TTFB |
| --- | --- | --- | --- | --- | --- | --- |
| Sitio corporativo `/` | Escritorio | 98 / 100 / 96 / 100 | 985 ms (948–999) | 0 ms (0–0) | 0.00339 | 9 ms (6–21) |
| Sitio corporativo `/` | Móvil | 73 / 100 / 96 / 100 | 4,309 ms (4,226–4,375) | 280 ms (17–405) | 0.00019 | 11 ms (10–16) |
| Backoffice `/incidents` | Escritorio | 100 / 95 / 100 / 100 | 585 ms (569–623) | 62 ms (35–77) | 0 | 5 ms (4–20) |
| Backoffice `/incidents` | Móvil | 87 / 95 / 100 / 100 | 1,768 ms (1,593–2,457) | 485 ms (353–541) | 0 | 5 ms (4–6) |

## Hallazgos y causas

### Sitio corporativo

- **LCP móvil por encima de 4 s.** Lighthouse identificó `.heroImage` como elemento LCP. La imagen remota de Unsplash transfirió 303,718 bytes; el desglose registró 2,079 ms de demora de render del elemento, aunque el recurso ya era descubrible, tenía prioridad alta y cargaba eager. La imagen grande y remota ampliaba la carga crítica y su decodificación/render ocurría tarde.
- **Cadena de fuentes de terceros.** `globals.css` usaba `@import` de Google Fonts: el CSS esperaba a `fonts.googleapis.com` y luego descargaba dos WOFF2 (75,504 bytes en total). Lighthouse midió una cadena de red de 542 ms y 380,393 bytes de recursos de terceros en móvil.
- **Error de consola y Best Practices en 96.** La solicitud de `/favicon.ico` devolvía 404. Lighthouse registró ese error en consola.
- **SEO base.** El score SEO fue 100 en las cuatro combinaciones. `robots.txt` no era aplicable a la URL local; se añade una ruta válida para despliegues rastreables, sin atribuirle una mejora de score medida.

### Backoffice

- **TBT móvil elevado.** Mediana de 485 ms, con rango 353–541 ms. El hilo principal dedicó 704 ms a evaluación de scripts en la corrida de detalle; el mayor long task medido duró 328 ms. La ruta completa está marcada `use client` y carga hidratación React/Next para el formulario. El JS transferido fue 141,335 bytes. La medición identifica trabajo de hidratación/runtime, pero no atribuye todo el tiempo a lógica de negocio.
- **Contraste insuficiente.** Lighthouse midió 3.71:1 para `.eyebrow` (`#777f89` sobre `#f4f5f7`), inferior al mínimo WCAG AA de 4.5:1 para texto normal. Esto explica Accessibility 95.
- **Duplicación de presentación.** Las cuatro tarjetas KPI repetían la misma estructura y las listas de categorías y estados repetían el mismo mapeo `Object.entries`. Ambas parejas admitían componentes compartidos.

## Skills consultadas

Se instalaron y revisaron `core-web-vitals`, `performance` y `web-perf`. Se siguió el flujo de medición equivalente antes/después, se trataron los resultados como datos de laboratorio y no se reclamó mejora de CrUX sin datos de campo.

## Evidencia

- [Capturas before](audit/before/): una imagen por frontend y modo.
- [Informes Lighthouse before](audit/before/): HTML/JSON de la primera corrida y JSON de las repeticiones 2 y 3.
- [Skills instaladas](.agents/skills/): instrucciones y referencias utilizadas.