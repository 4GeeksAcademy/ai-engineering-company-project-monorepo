# REPORT — Mejoras aplicadas y su impacto medido

Análisis y causas raíz en [AUDIT.md](AUDIT.md). Todas las cifras: Lighthouse 13.6.0 sobre el **build de producción**, mediana de 3 pasadas, mismo script y mismas URLs antes y después. Capturas e informes JSON: [`audit/before/`](audit/before/) y [`audit/after/`](audit/after/); resumen tras cada cambio en [`audit/iterations/`](audit/iterations/).

## Resumen

El punto de partida ya era sano en laboratorio (Performance 98–100 en todas las páginas), así que el margen real estaba en **dos sitios**: el LCP de la home móvil (2,2 s) y la accesibilidad (86–96). Ambos se corrigieron atacando su causa raíz.

| Frontend | Mejora principal medida |
|---|---|
| Sitio corporativo | LCP home móvil **2,2 s → 0,7 s** (−68 %); Accessibility home 96 → **100**; Accessibility formulario 86 → **100** |
| Backoffice | Accessibility móvil 96 → **100** (dashboard e incident-form); **CLS de `/suppliers` en escritorio 0,118 → 0,008** (superaba el umbral de 0,1); Accessibility de `/suppliers` 96 → **100** |

## Comparativa antes / después

P = Performance, A = Accessibility, BP = Best Practices, SEO. Entre paréntesis, las 3 pasadas de Performance.

| Página | Modo | P antes → después | A antes → después | BP | SEO | LCP antes → después |
|---|---|---|---|---|---|---|
| Web · home | Móvil | 98 → 99 (79/98/98 → 99/99/99) | 96 → **100** | 100 → 100 | 100 → 100 | 2,2 s → **0,7 s** |
| Web · home | Escritorio | 100 → 100 | 96 → **100** | 100 → 100 | 100 → 100 | 0,5 s → 0,2 s |
| Web · nueva candidatura | Móvil | 100 → 99 (98/99/99) | 86 → **100** | 100 → 100 | 100 → 100 | 0,8 s → 0,7 s |
| Web · nueva candidatura | Escritorio | 100 → 100 | 86 → **100** | 100 → 100 | 100 → 100 | 0,2 s → 0,2 s |
| Backoffice · dashboard | Móvil | 100 → 100 | 96 → **100** | 100 → 100 | 100 → 100 | 1,0 s → 0,8 s |
| Backoffice · dashboard | Escritorio | 100 → 100 | 100 → 100 | 100 → 100 | 100 → 100 | 0,3 s → 0,3 s |
| Backoffice · incident-form | Móvil | 100 → 100 | 96 → **100** | 100 → 100 | 100 → 100 | 1,0 s → 0,8 s |
| Backoffice · incident-form | Escritorio | 100 → 100 | 100 → 100 | 100 → 100 | 100 → 100 | 0,3 s → 0,3 s |
| Backoffice · login | Móvil | 100 → 100 | 100 → 100 | 100 → 100 | 100 → 100 | 0,8 s → 0,8 s |
| Backoffice · login | Escritorio | 100 → 100 | 100 → 100 | 100 → 100 | 100 → 100 | 0,3 s → 0,3 s |

### Vistas con datos reales (backoffice, sesión real)

Línea base medida sobre el código de `b80c33b` (worktree aparte); «después» = código final. Mismos datos en la base (15 proveedores, 96 incidencias, 6 productos).

| Página | Modo | P antes → después | A antes → después | BP | CLS antes → después | TBT antes → después |
|---|---|---|---|---|---|---|
| `/suppliers` | Móvil | 98 → 99 | 96 → **100** | 100 → 100 | 0,004 → 0,003 | 160 → 100 ms |
| `/suppliers` | Escritorio | 96 → **100** | 96 → **100** | 100 → 100 | **0,118 → 0,008** | 0 → 0 ms |
| `/incidents/list` | Móvil | 96 → **99** | 96 → **100** | 96 → **100** | 0,001 → 0,001 | 220 → **110 ms** |
| `/incidents/list` | Escritorio | 100 → 100 | 100 → 100 | 100 → 100 | 0,009 → 0 | 0 → 0 ms |
| `/inventory/products` | Móvil | 100 → 100 | 96 → **100** | 100 → 100 | 0,001 → 0,001 | 30 → 50 ms |
| `/inventory/products` | Escritorio | 98 → **100** | 100 → 100 | 100 → 100 | **0,088 → 0,003** | 0 → 0 ms |

`/incidents/list` en móvil mejora con la paginación en cliente (corrección 9); una de las 3 pasadas finales fue atípica (83), la mediana es 99.

CLS = 0 en todas las páginas sin datos antes y después (0,005 en la home de escritorio antes, 0 después).

## Correcciones aplicadas (una por commit)

| # | Commit | Problema → solución | Impacto medido (misma URL) |
|---|---|---|---|
| 1 | `5a6c324` | **LCP home móvil.** La lista solo aparecía tras hidratar + `fetch` en el navegador (y `useSearchParams` forzaba CSR). `page.tsx` es ahora un Server Component que obtiene los candidatos (caché de 30 s) y los pinta en el HTML; `CandidatePipeline` hidrata con esos datos y refresca en silencio; los filtros viven en estado y se reflejan en la URL con `history.replaceState`. | LCP 2,2 → **0,7 s**; FCP 0,8 → 0,7 s; Performance 98 → 99; pasadas 79/98/98 → 98/99/100. |
| 2 | `a04fc92` | **A11y home.** `<main>` en el layout raíz (y sin `<main>` anidados en `error`/`not-found`); tarjetas `h3` → `h2`. | Accessibility 96 → **100**. |
| 3 | `89eba74` | **A11y formulario.** 9 `label` asociados a su control con `htmlFor`/`id` (`useId`). | Accessibility 86 → **100**. |
| 4 | `263c352` | **Backoffice móvil.** `.topbar ul` con `flex-wrap`: los enlaces ya no se desbordan sobre fondo claro (contraste 1,33:1) ni generan scroll horizontal. | Accessibility 96 → **100**; LCP 1,0 → 0,8 s. |
| 5 | `16b684f` | **CLS en escritorio (vistas con datos).** Al cargar la tabla aparecía la barra de scroll y el `<main>` centrado se desplazaba lateralmente. `html { scrollbar-gutter: stable }` reserva ese hueco. | `/suppliers` CLS 0,118 → **0,008** (Performance 96 → 100); productos 0,088 → **0,003**. |
| 6 | `e63902a` | **Contraste en proveedores suspendidos.** `opacity: .55` en las celdas bajaba texto, chips y enlaces a 2,3–3,75:1; ahora se atenúa con color de texto y fondo (≥ 4,5:1), conservando la pista visual. | `/suppliers` Accessibility 96 → **100** (móvil y escritorio). |
| 7 | `048b9ed` | **`/favicon.ico` 404** en ambas apps: se añade `app/icon.svg`. Es higiene (el 404 bajó BP a 96 en una sola pasada, no es reproducible a voluntad). | Sin ganancia demostrable en una sola ejecución; BP 100 en todas las medidas finales. |
| 9 | `perf(backoffice): paginate…` | **TBT en la lista de incidencias (móvil).** Se renderizaban las 96 incidencias de golpe (hidratación + layout en una tarea larga). Se muestran por tandas de 50 con «Mostrar más (N restantes)»; cambiar un filtro reinicia la tanda. Antes se probó `content-visibility: auto` en las filas: ganancia marginal (TBT 230 → 200 ms), descartado. | Performance 96 → **99**; TBT 220 → **110 ms**. |
| 10 | `1f27bc8` | **Experimento descartado:** `inlineCss` en la web. Sin ganancia (FCP 0,7 → 0,8 s) y Best Practices de la home móvil 100 → 96. Revertido; evidencia guardada. | Sin mejora → no se aplica. |
| R1 | `2e6acc4` | **Refactor:** hook `useLoader` (`lib/useLoader.ts`) para el patrón carga/loading/error; aplicado a productos, historial de órdenes y `useAssets`. | −59 líneas netas en las 3 páginas/hooks (+35 del hook compartido), sin cambio de comportamiento salvo que `useAssets` ahora vacía la lista si falla una recarga. 70/70 tests, lint y tipos OK. |
| R2 | `5a6f0c4` | **Refactor:** componente `SelectFilter` compartido por `StatusFilter` y `StageFilter` (API pública intacta). | Sin impacto en métricas; elimina ~45 líneas duplicadas. |

## Qué tuvo mayor impacto

1. **Corrección 5 (`scrollbar-gutter`)** fue la única que arregló un Core Web Vital **por encima del umbral**: CLS 0,118 en `/suppliers` (escritorio) pasa a 0,008, y sube Performance de 96 a 100. Una línea de CSS, pero solo era visible al medir con datos reales: en las páginas vacías el problema no existe. Es la lección más útil de la auditoría.
2. **Corrección 1 (renderizar la lista en el servidor)** fue la de mayor impacto en tiempo: LCP −1,5 s en móvil en la home, y además **estabilizó** la página (la pasada de 79 desapareció al dejar de depender de la cadena JS + API externa en el camino crítico de render). Es una causa de fondo —*render dependiente de hidratación*—, no un ajuste cosmético.
3. **Las correcciones de accesibilidad (2, 3, 4, 6)** movieron más puntos de Accessibility (+4, +14, +4, +4); la 4 corrige además un fallo real de uso en móvil, y la 6 un fallo de legibilidad (contraste de 2,3:1) en una vista que usa el equipo a diario.
4. **Lo que no ayudó:** `inlineCss` (se midió, empeoró ligeramente y se descartó) y el favicon (higiene, sin ganancia demostrable).

## Verificación de no-regresión

- Tras cada cambio se reconstruyó en producción y se volvió a ejecutar Lighthouse en las mismas URLs.
- La línea base de las vistas con datos se midió sobre el código original (worktree de `b80c33b`), no por inferencia.
- Sitio: `eslint` y `tsc --noEmit` limpios; prueba funcional manual con Chromium sobre el build de producción de la home (enlace con filtros, cambio de estado/etapa, búsqueda, «Limpiar filtros», URL sincronizada) sin errores de JS.
- Backoffice: `eslint`, `tsc --noEmit` y `npm test` (70 tests) en verde tras el refactor; build de producción OK en cada iteración (los cambios 5–7 son CSS y un icono); el 9 se probó en el navegador: 50 filas iniciales, «Mostrar más» carga el resto, cambiar el filtro reinicia la tanda, sin errores de JS.
- No se reestructuró la arquitectura de ningún frontend: son cambios dirigidos (un archivo de página dividido en servidor + cliente, una línea de CSS, atributos de accesibilidad, dos extracciones).

## Limitaciones y notas honestas

- **Variabilidad:** la mediana es lo que se reporta, pero hay pasadas atípicas (home móvil: 79 en la medición inicial y 74 en una intermedia; 99/99/99 en la final). Con servidor y API externa recién arrancados, la primera petición no tiene la caché de 30 s caliente; es una hipótesis razonable, no comprobada.
- **Ruido entre mediciones:** el LCP del login móvil dio 1,0 s en una medición intermedia y 0,8 s en la final sin tocar nada del login; diferencias de ±0,2 s o ±1–2 puntos de Performance no se interpretan como cambio.
- **Cambio de UX en `/incidents/list`:** ya no se ven todas las incidencias a la vez; hay que pulsar «Mostrar más» tras las primeras 50 (el contador sigue mostrando el total). Con pocos datos no se nota; con muchos, la tabla escala.
- **Resultado a medias de «mejora en Performance»:** como la línea base ya era ≥ 98, el score global de Performance apenas se mueve (98 → 99). La mejora medible está en LCP y en Accessibility, no en un salto de Performance.
- **Cobertura del backoffice:** dashboard, login y formulario con sesión sembrada; `/suppliers`, `/incidents/list` e `/inventory/products` con una cuenta de prueba real (`lighthouse-audit@example.com`, creada en el Supabase del proyecto; **conviene borrarla**). No se auditaron entrada/salida de activos, historial de órdenes ni el resumen de incidencias.
- **Dependencia externa:** la home depende de `NEXT_PUBLIC_API_URL` (API de terceros). El servidor ahora cachea 30 s y, si falla, el cliente muestra sus estados de carga/error de siempre.
- **Comportamiento nuevo a tener en cuenta:** al filtrar, la URL se actualiza con `replaceState` (antes `router.push`), así que cada filtro ya no crea una entrada en el historial del navegador; a cambio, el cambio de filtro es inmediato y sin viaje al servidor.
- **Pendiente (siguiente paso):** aplicar `useLoader` a `suppliers`, `incidents/list` e `IncidentTotals`; compartir las opciones de estado/etapa de `CandidateForm`; medir INP con datos de campo (RUM) cuando haya tráfico real.

## Reproducir

```bash
# 1. Servidores de producción
(cd uis/talent-pipeline-tracker && npm run build && npx next start -p 3000) &
(cd uis/backoffice              && npm run build && npx next start -p 3001) &
# 2. Lighthouse (dependencias fuera del repo)
mkdir /tmp/lh && cd /tmp/lh && npm i lighthouse@13.6.0 chrome-launcher puppeteer-core
AUDIT_JWT=<token real, para las vistas con datos> CHROME_PATH=<ruta a chromium> node <repo>/audit/tools/run-lighthouse.mjs <repo>/audit/after
```
