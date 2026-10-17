# Informe de mejoras de rendimiento — sitio corporativo y backoffice

> Análisis previo y causa raíz de cada problema: [`AUDIT.md`](./AUDIT.md). Evidencia (JSON de Lighthouse, resúmenes y capturas): [`docs/performance/`](./docs/performance/) y [`audit/`](./audit/).
> Rama: `perf/lighthouse-audit`. Un problema por commit y Lighthouse medido tras cada uno (§2.2); las excepciones y el resto de desviaciones del enunciado están en §9.

## 1. Resumen

El ciclo fue **medir → analizar → corregir → volver a medir**, con la misma herramienta y el mismo método antes y después (Lighthouse 12.8.2, build de producción, mediana de 3 ejecuciones en la línea base y el estado final).

- **Las cuatro puntuaciones están en 100 en las ocho combinaciones auditadas** (backoffice: login, inicio, incidencias y proveedores; website: inicio y `/talento`, en móvil y escritorio).
- El único problema de **rendimiento** real eran los *layout shifts* de las dos vistas con tablas del backoffice (CLS 0,255 y 0,351, umbral bueno < 0,1), que bajaban Performance a 87 y 83. Ahora el CLS es 0,014 y 0, y Performance es 100.
- En el **sitio corporativo** el margen estaba en SEO, accesibilidad y buenas prácticas (92, 95 y 96), y en algo que Lighthouse no ve: el HTML inicial estaba vacío, un problema para el SEO que el CTO quiere reforzar. Se corrigió con un prerender dirigido y, después, el CSS inline adelanta el LCP unos 100–130 ms en móvil.
- El resto son mejoras de **mantenibilidad** del código duplicado, que no mueven ninguna puntuación (y no se vendieron como si lo hicieran).
- Dos intentos se **revirtieron** porque la medición los desaconsejó (§5). Se dejan documentados, y uno de ellos está en el historial a propósito.

### Valoración: qué tuvo mayor impacto

1. **Mayor impacto en rendimiento: reservar espacio en el backoffice** (`63dda4f`, `a4a9e9b`, `c788198`). Es lo único que mueve Performance (87 → 100 y 83 → 100) y lo único que arregla algo que el usuario nota: la página «salta» mientras carga. Medido commit a commit en §2.2.
2. **Mayor impacto para el objetivo del CTO (SEO): el prerender** (`857f9a9`). Pasa el HTML de `<div id="root"></div>` a traer el `<h1>`, 214 palabras, el JSON-LD y los metadatos de cada ruta. Lighthouse **no puede verlo** (su navegador ejecuta JavaScript), así que no mueve ninguna puntuación; se comprobó con JavaScript desactivado.
3. **Mayor impacto por esfuerzo: `robots.txt` y favicon** (`24cc5c8`, `f3a70fc`). Tres archivos estáticos y cero lógica: SEO 92 → 100 y Best Practices 96 → 100 en todas las páginas del website.
4. **El único cambio que acelera la carga: el CSS inline** (`38a2dca`), LCP −128 ms en la home móvil (§2.1). Solo compensa porque el prerender ya había puesto contenido en el HTML.
5. **Impacto medio: accesibilidad** (contraste, enlaces, nombre accesible, encabezados): Accessibility de 91–96 a 100 en todo. Es lo que más personas puede afectar.
6. **Sin efecto en las puntuaciones: refactorizar la duplicación y quitar el prefetch.** Se justifican por mantenibilidad (y −10 peticiones), no por Lighthouse.

## 2. Puntuaciones: antes → después

Línea base (`faf2569`, antes de cambiar nada) frente al estado final, medidos en la misma sesión (mediana de 3 ejecuciones). Lighthouse CLI 12.8.2, no la pestaña de DevTools; las capturas son renders del informe (`AUDIT.md` §1): [`audit/before/`](./audit/before/) y [`audit/after/`](./audit/after/). La línea base se reprodujo: son las mismas puntuaciones que las de la primera medición, hecha antes de tocar nada (`docs/performance/lighthouse/*-before.*`).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
|---|---|:---:|:---:|:---:|:---:|
| Backoffice `/login` | escritorio | 100 → **100** | 91 → **100** | 96 → **100** | 100 → **100** |
| Backoffice `/` | escritorio | 100 → **100** | 95 → **100** | 100 → **100** | 100 → **100** |
| Backoffice `/incidents` | escritorio | **87 → 100** | 94 → **100** | 100 → **100** | 100 → **100** |
| Backoffice `/suppliers` | escritorio | **83 → 100** | 96 → **100** | 100 → **100** | 100 → **100** |
| Website `/` | móvil | 100 → **100** | 100 → **100** | 96 → **100** | 92 → **100** |
| Website `/` | escritorio | 100 → **100** | 100 → **100** | 96 → **100** | 92 → **100** |
| Website `/talento` | móvil | 100 → **100** | 95 → **100** | 96 → **100** | 92 → **100** |
| Website `/talento` | escritorio | 100 → **100** | 95 → **100** | 96 → **100** | 92 → **100** |

### Métricas

| Métrica | Antes | Después | Comentario |
|---|---|---|---|
| **CLS** `/incidents` | 0,255 | **0,014** | umbral bueno < 0,1 |
| **CLS** `/suppliers` | 0,351 | **0** | |
| CLS en el resto de páginas | 0 | 0 | sin cambios |
| **LCP** website móvil (`/`, `/talento`) | 1422, 1417 ms | **1270, 1294 ms** | solo por el CSS inline (ver §2.1) |
| LCP backoffice | — | — | **sin cambio medible** (ver §2.1) |
| INP | ver §2.3 | ver §2.3 | bueno en todos los estados |
| Peticiones `/incidents` | 51 (28 `_rsc`) | 41 (18 `_rsc`) | −10 peticiones de prefetch |
| Bytes transferidos `/incidents` | 29 KB | 22 KB | |

### 2.1 LCP y TBT: qué se movió y qué es ruido

**Backoffice.** Una sola medición de LCP no sirve para comparar commits: `/incidents` dio 523 ms en un commit intermedio y 349 ms en el estado final, que contiene ese mismo código. Por eso se hizo una comparación **A/B alterna** (línea base y estado final servidos a la vez y medidos por turnos, 3 rondas × 2 ejecuciones; [`docs/performance/lighthouse/ab/`](./docs/performance/lighthouse/ab/)):

| Página | Build | LCP mediana (rango) | TBT mediana (rango) | Performance | CLS |
|---|---|---|---|:---:|:---:|
| `/incidents` | línea base | 415 ms (395–428) | 0 ms (0–3) | 87 | 0,255 |
| `/incidents` | después | 431 ms (365–471) | 0 ms (0–3) | **100** | 0,014 |
| `/suppliers` | línea base | 395 ms (344–430) | 9 ms (0–24) | 83 | 0,351 |
| `/suppliers` | después | 398 ms (325–534) | 0 ms (0–40) | **100** | 0 |

Los rangos de LCP y TBT se solapan: **no hay diferencia en carga ni en bloqueo del hilo principal**. Performance y CLS, en cambio, son deterministas (idénticos en las 6 ejecuciones de cada configuración) y sí cambiaron.

**Website.** Aquí sí hay un cambio de LCP, y se atribuyó con 3 ejecuciones por estado ([`docs/performance/lighthouse/lcp/`](./docs/performance/lighthouse/lcp/)):

| Estado | `/` móvil | `/talento` móvil | `/` escritorio | `/talento` escritorio |
|---|---:|---:|---:|---:|
| Antes del prerender (`ef8c167`) | 1431 ms | 1417 ms | 356 ms | 350 ms |
| + prerender (`857f9a9`) | 1418 ms | 1415 ms | 352 ms | 356 ms |
| + CSS inline (`38a2dca`) | **1290 ms** | **1312 ms** | 355 ms | **315 ms** |

- **El prerender por sí solo no cambia el LCP**: la primera pintura sigue esperando a la hoja de estilos (bloqueante).
- **El CSS inline adelanta el LCP −128 ms en la home móvil y −103 ms en `/talento` móvil** (≈ −9 %); en escritorio solo mejora `/talento` (−41 ms) y no la home. Es lógico: con la red móvil simulada, quitar una petición de la ruta crítica pesa más.
- **TBT del website móvil:** sube unos 10–30 ms (39 → 48 y 8 → 35 ms) por ejecutar la hidratación; sigue muy por debajo del umbral de 200 ms.

### 2.2 Impacto de cada commit (Lighthouse tras cada cambio)

Cada commit se compiló y se midió en el mismo entorno y con el mismo método (backoffice en escritorio, website en móvil y escritorio). La línea base y el estado final llevan 3 ejecuciones con mediana; **los commits intermedios, 1 ejecución por página**, porque las puntuaciones y el CLS salieron idénticos en todas las ejecuciones medidas (el LCP, el único que oscila, no se compara aquí). Se midió **después de reorganizar el historial en commits de un solo problema, no en el momento de escribir cada cambio** (ver §9). Datos en [`docs/performance/lighthouse/by-commit/`](./docs/performance/lighthouse/by-commit/).

**Backoffice** (escritorio) — Performance / Accessibility / Best Practices / SEO · CLS

| Commit | Cambio | `/incidents` | `/suppliers` | `/login` |
|---|---|---|---|---|
| `faf2569` | Línea base | 87 / 94 / 100 / 100 · CLS 0,255 | 83 / 96 / 100 / 100 · CLS 0,351 | 100 / 91 / 96 / 100 · CLS 0 |
| `63dda4f` | esqueleto del panel de resumen | **100** / 94 / 100 / 100 · CLS **0,024** | 83 / 96 / 100 / 100 · CLS 0,351 | — |
| `a4a9e9b` | reservar el espacio de las tablas (`LoadingState`) | 100 / 94 / 100 / 100 · CLS **0,014** | **100** / 96 / 100 / 100 · CLS **0,006** | — |
| `c788198` | barra lateral a la altura de la ventana | 100 / 94 / 100 / 100 · CLS 0,014 | 100 / 96 / 100 / 100 · CLS **0** | — |
| `a39bb96` | contraste AA del texto secundario | 100 / **98** / 100 / 100 · CLS 0,014 | 100 / 96 / 100 / 100 · CLS 0 | 100 / **95** / 96 / 100 · CLS 0 |
| `85fbb45` | `h2` en el resumen de incidencias | 100 / **100** / 100 / 100 · CLS 0,014 | 100 / 96 / 100 / 100 · CLS 0 | — |
| `97cf34b` | nombre accesible del botón de estado | 100 / 100 / 100 / 100 · CLS 0,014 | 100 / 96 / 100 / 100 · CLS 0 | — |
| `9b19b2a` | icono de la app (favicon) | 100 / 100 / 100 / 100 · CLS 0,014 | 100 / 96 / 100 / 100 · CLS 0 | **96** / 95 / **100** / 100 · CLS 0 |
| `0f29a79` | sin prefetch de las filas | 100 / 100 / 100 / 100 · CLS 0,014 | 100 / 96 / 100 / 100 · CLS 0 | — |
| `94d69fc` | experimento: `noindex` + `robots.ts` | 100 / 100 / 100 / **63** · CLS 0,014 | 100 / 96 / 100 / **63** · CLS 0 | **100** / 95 / 100 / **63** · CLS 0 |
| `4a455cf` | se revierte el `noindex` | 100 / 100 / 100 / **100** · CLS 0,014 | 100 / 96 / 100 / **100** · CLS 0 | 100 / 95 / 100 / **100** · CLS 0 |
| `8702034` | contraste de las filas suspendidas | 100 / 100 / 100 / 100 · CLS 0,014 | 100 / **100** / 100 / 100 · CLS 0 | — |
| `b2fe738` | enlaces subrayados en login/registro | 100 / 100 / 100 / 100 · CLS 0,014 | 100 / 100 / 100 / 100 · CLS 0 | 100 / **100** / 100 / 100 · CLS 0 |
| `1b3534d` | refactor: `Field.tsx` a `components/ui` | 100 / 100 / 100 / 100 · CLS 0,014 | 100 / 100 / 100 / 100 · CLS 0 | — |
| `91102a0` | refactor: `inputClass`/`selectClass` únicos | 100 / 100 / 100 / 100 · CLS 0,014 | 100 / 100 / 100 / 100 · CLS 0 | 100 / 100 / 100 / 100 · CLS 0 |
| `5d86cab` | refactor: `ErrorBanner` en todas partes | 100 / 100 / 100 / 100 · CLS 0,014 | 100 / 100 / 100 / 100 · CLS 0 | 100 / 100 / 100 / 100 · CLS 0 |
| `5294b7a` | refactor: hook `useAsyncResource` (estado final) | 100 / 100 / 100 / 100 · CLS 0,014 | 100 / 100 / 100 / 100 · CLS 0 | 100 / 100 / 100 / 100 · CLS 0 |

**Website** — Performance / Accessibility / Best Practices / SEO

| Commit | Cambio | `/` móvil | `/` escritorio | `/talento` móvil | `/talento` escritorio |
|---|---|---|---|---|---|
| `faf2569` | Línea base | 100 / 100 / 96 / 92 | 100 / 100 / 96 / 92 | 100 / 95 / 96 / 92 | 100 / 95 / 96 / 92 |
| `24cc5c8` | `robots.txt` válido y sitemap | 100 / 100 / 96 / **100** | 100 / 100 / 96 / **100** | 100 / 95 / 96 / **100** | 100 / 95 / 96 / **100** |
| `f3a70fc` | favicon | **99** / 100 / **100** / 100 | 100 / 100 / **100** / 100 | 100 / 95 / **100** / 100 | 100 / 95 / **100** / 100 |
| `f899dbd` | refactor: dividir `App.tsx` | **100** / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 95 / 100 / 100 | 100 / 95 / 100 / 100 |
| `65cc546` | título, descripción y canonical por ruta | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 95 / 100 / 100 | 100 / 95 / 100 / 100 |
| `ef8c167` | enlaces subrayados | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / **100** / 100 / 100 | 100 / **100** / 100 / 100 |
| `857f9a9` | prerender (contenido en el HTML) | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `38a2dca` | CSS inline | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `5294b7a` | estado final | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |


Los números en **negrita** son los que cambian respecto al commit anterior; «—» significa que esa página no se midió en ese commit (no podía verse afectada).

**Cómo leer estas tablas:**

- Cada mejora se atribuye a **un commit concreto**. Los commits de refactor (`f899dbd`, `1b3534d`, `91102a0`, `5d86cab`, `5294b7a`) **no mueven ninguna puntuación**, como se esperaba.
- El commit `94d69fc` (`noindex`) **empeora el SEO del backoffice a 63** y `4a455cf` lo revierte. Se deja a la vista a propósito (§5).
- **Dos valores sueltos son ruido de una sola ejecución**, no efectos de un commit: Performance 96 en `/login` en `9b19b2a` y 99 en `/` móvil en `f3a70fc`. Con una sola ejecución Performance puede oscilar 1–4 puntos; el commit siguiente, sin ningún cambio que lo explique, vuelve a 100. Es el precio de medir con 1 ejecución en los intermedios, y por eso la línea base y el final llevan 3.
- Los commits del prerender (`857f9a9`, `38a2dca`) no cambian puntuaciones porque el website ya estaba en 100; su efecto está en §2.1 (LCP) y §3.6 (contenido en el HTML).

### 2.3 INP medido (interacciones reales)

Lighthouse en modo navegación no interactúa y no mide INP. Se midió con la API Event Timing (el observador de la skill `core-web-vitals`) con una serie fija de interacciones y la CPU frenada ×4: [`scripts/inp-measure.mjs`](./scripts/inp-measure.mjs), datos en [`docs/performance/lighthouse/inp/`](./docs/performance/lighthouse/inp/).

| Frontend | Escenario | Estado | INP (mediana) | Umbral bueno |
|---|---|---|---:|---:|
| Backoffice (escritorio) | nueva incidencia, ordenar, paginar, buscar, ir a proveedores, nuevo proveedor | línea base | 88 ms | < 200 ms |
| Backoffice (escritorio) | ídem | final | 80 ms | < 200 ms |
| Website (móvil) | abrir/cerrar menú ×2, ir a `/talento`, escribir, enviar con errores, radio y casilla | línea base | 64 ms | < 200 ms |
| Website (móvil) | ídem | antes del prerender (`ef8c167`) | 72 ms | < 200 ms |
| Website (móvil) | ídem | + prerender (`857f9a9`) | 80 ms | < 200 ms |
| Website (móvil) | ídem | + CSS inline (`38a2dca`) | 80 ms | < 200 ms |

**Conclusión:** INP es **bueno en todos los estados**. El del website sube de 64 a 72–80 ms, pero **ya subió antes del prerender** (72 ms en `ef8c167`) y la diferencia (8–16 ms) está al nivel de la resolución de Event Timing (8 ms) y de la variación entre ejecuciones (por ejemplo 128/80/72/88/72 en una misma configuración), así que no se atribuye al prerender. La interacción más lenta es siempre un `pointerdown` con tiempo de procesamiento ≈ 0–2 ms: no hay trabajo de JavaScript que optimizar. Es una medición de **laboratorio**, no de campo.

## 3. Mejoras aplicadas

### 3.1 Estabilidad visual del backoffice — `63dda4f`, `a4a9e9b`, `c788198` · **lo que mueve Performance**

*Causa (`AUDIT.md` P1):* contenido asíncrono sin espacio reservado, un `<div>` que React reutiliza entre «Cargando…» y la tabla, y una barra lateral que mide lo que la página. Una causa por commit:

- `63dda4f` — `IncidentSummarySkeleton`: mismas rejillas y alturas de tarjeta (106/126 y 290/330 px) que el panel real. `/incidents`: CLS 0,255 → 0,024 y Performance 87 → 100.
- `a4a9e9b` — `LoadingState` (antes copiado en 6 vistas) con `reserveSpace`: mantiene ≈ 80 vh donde aparecerá una tabla. `/suppliers`: CLS 0,351 → 0,006 y Performance 83 → 100; `/incidents`: 0,024 → 0,014.
- `c788198` — barra lateral `sticky` + `h-screen`. `/suppliers`: CLS 0,006 → 0.

*Residual:* 0,014 en `/incidents` (los desplegables de filtro cambian de ancho al llegar la lista de sucursales). Muy por debajo del umbral; no compensa la complejidad.

### 3.2 Accesibilidad del backoffice — `a39bb96`, `85fbb45`, `97cf34b`, `8702034`, `b2fe738`

| Commit | Problema | Corrección |
|---|---|---|
| `a39bb96` | Contraste ≈ 3,7:1 (`text-slate-500/600`) | `text-slate-400` (≈ 7:1) en 31 usos |
| `85fbb45` | `<h3>` justo tras el `<h1>` | `<h2>` |
| `97cf34b` | Botón «Activo» con `aria-label` «Suspender X» (WCAG 2.5.3) | «Activo: suspender X» |
| `8702034` | Fila suspendida con `opacity-60` (texto a 3,3:1) | `opacity-80` (≈ 4,9:1): sigue atenuada |
| `b2fe738` | Enlaces «Regístrate» / «Inicia sesión» distinguibles solo por color | subrayados |

Los commits están separados porque **cada uno resuelve una auditoría distinta**, y la tabla de §2.2 muestra cuál sube Accessibility y en qué página (por ejemplo, `/suppliers` no llega a 100 hasta `8702034`).

### 3.3 Favicon y prefetch del backoffice — `9b19b2a`, `0f29a79`

- `9b19b2a` — `app/icon.svg` elimina el 404 de consola (Best Practices 96 → 100 en `/login`).
- `0f29a79` — `prefetch={false}` en los enlaces de fila de incidencias: **−10 peticiones** (28 → 18 `_rsc`) y −7 KB. Abrir una fila sigue funcionando; se carga bajo demanda.

### 3.4 Website: SEO y accesibilidad — `24cc5c8`, `f3a70fc`, `65cc546`, `ef8c167`

| Commit | Cambio | Efecto medido |
|---|---|---|
| `24cc5c8` | `public/robots.txt` (permite todo, apunta al sitemap) y `public/sitemap.xml` | «robots.txt not valid, 16 errors» desaparece → SEO 92 → 100 |
| `f3a70fc` | `public/favicon.svg` + enlace en `index.html` | sin 404 en consola → Best Practices 96 → 100 |
| `65cc546` | `seo.ts` (`usePageMeta`): título, descripción y canonical por ruta | `/talento` ya no se hace pasar por la home (**Lighthouse no lo mide**) |
| `ef8c167` | `TextLink`: enlaces en texto subrayados | `link-in-text-block` resuelto → Accessibility 95 → 100 en `/talento` |

### 3.5 Duplicación de código — `f899dbd`, `1b3534d`, `91102a0`, `5d86cab`, `5294b7a`

Los cinco casos están analizados en `AUDIT.md` P8 (dónde aparece, por qué es candidato y cómo queda la abstracción).

| Commit | Antes | Después |
|---|---|---|
| `1b3534d` | `Field.tsx` en `components/incidents/`, usado también por inventario, login y proveedores | movido a `components/ui/` (solo cambian los imports) |
| `91102a0` | `inputClass` definido 5 veces (con diferencias accidentales: el borde de campo inválido era `rose-400`, `rose-500` o inexistente) y `selectClass` 2 | una sola definición |
| `5d86cab` | caja de error escrita a mano 7 veces, existiendo `ErrorBanner` | `ErrorBanner` con `className`, usado en todas partes |
| `5294b7a` | «cargar al montar + loading + error + reintentar» escrito dos veces | hook `useAsyncResource` (+ 8 pruebas, 100 % de cobertura, umbral del 90 % en Jest) en `useAssets` y `SuppliersPage` |
| `f899dbd` | `App.tsx` de líneas larguísimas; email ×3 y cada teléfono ×2; bloque «eyebrow + h2» ×4 | `content.ts`, `components.tsx`, `TalentForm.tsx`; `App.tsx` se lee de arriba abajo |

`InventoryOrdersPage` e `IncidentDetailPage` **conservan su lógica de carga a propósito**: cargan dos fuentes o distinguen un 404, y forzarlas en el hook lo haría más difícil de leer.

### 3.6 Website: prerender y CSS inline — `857f9a9`, `38a2dca`

*Causa (`AUDIT.md` P9):* el HTML inicial era `<div id="root"></div>`; todo el contenido lo creaba JavaScript.

- `857f9a9` — **prerender**: `npm run build` construye además `src/entry-server.tsx` (`vite build --ssr`) y ejecuta `uis/website/scripts/prerender.mjs`, que escribe el HTML de `/` y `/talento` en `dist/` con el título, la descripción y el canonical de cada ruta. `App` acepta un `initialPath` opcional (en el servidor no hay `window`) y `main.tsx` **hidrata solo si la ruta marcada en el HTML (`data-route`) coincide con la URL**; si no, pinta desde cero (el comportamiento anterior). Esa salvaguarda existe porque `vite preview` responde a `/talento` (sin barra final) con el HTML de la home y React lanzaba el error de hidratación #418.
- `38a2dca` — **CSS inline**: `prerender.mjs` sustituye el `<link rel="stylesheet">` por un `<style>` con el archivo (11 KB, 3,5 KB gzip). Coste: el HTML pasa de 12 a 23 KB y el CSS no se cachea entre las dos páginas.

*Verificado con JavaScript desactivado:* `/` trae su `<h1>`, 214 palabras, el JSON-LD y los metadatos; `/talento/` trae su propio `<h1>`, título y canonical. Sin errores de hidratación ni de consola en `/`, `/talento/` ni `/talento`.

*Por qué no es «reestructurar»:* componentes, rutas, estado y la herramienta de build (Vite) no cambian; se añaden la entrada de servidor, un script de unas 40 líneas y unas líneas en `main.tsx` y `App.tsx`. Aun así es la decisión de criterio más discutible de la auditoría (`AUDIT.md` §5), y está en commits propios para que sea fácil quitarla.

**Requisito de despliegue:** el servidor debe resolver `/talento` a `talento/index.html` (índice de directorio), como hacen nginx con `try_files`, Netlify y Vercel. Si no, la app sigue funcionando (pinta en el navegador) pero esa ruta pierde el contenido en el HTML. **No se pudo comprobar en un hosting real.**

## 4. Verificación de que no se rompió nada

Sobre el historial definitivo (`5294b7a`), con builds de producción:

| Comprobación | Resultado |
|---|---|
| Jest (backoffice) | **550 pruebas pasan** (542 existentes + 8 nuevas), umbrales de cobertura cumplidos |
| `tsc --noEmit` (backoffice y website) | sin errores |
| E2E del backoffice (`e2e`, `e2e:incidents`, `e2e:guard`, `e2e:token`, `e2e:profile`, `e2e:register`, `e2e:inventory`) | **149 comprobaciones, 0 fallos** |
| E2E del website (**nuevo**, `uis/website/e2e/website.e2e.mjs`, `npm run e2e`), contra el build **con prerender** | **24 comprobaciones, 0 fallos**: navegación, metadatos por ruta, datos de contacto compartidos, menú móvil y el formulario de `/talento` de principio a fin |

El website no tenía ninguna prueba propia: se escribió (`f8c23b8`) después de refactorizar `App.tsx` y antes del prerender, y se volvió a pasar contra el build final. Nota: Jest **no** detecta un `import` roto (`tsc` sí): por eso se ejecutan ambos.

## 5. Intentos revertidos (también son resultados)

1. **Carga diferida (`React.lazy`) del formulario de `/talento`.** Parecía razonable para aligerar la home. Medido: el chunk se pide *después* de ejecutar el script principal (cascada de red) y en `/talento` —la única página que lo necesita— el LCP pasó de 1423 a 1672 ms (Performance 100 → 99), a cambio de ahorrar 0,7 KB gzip en la home. **No se aplicó.** Medición en `docs/performance/lighthouse/website-talento-experiment-lazy.*` y mención en `f899dbd`.
2. **`noindex` + `robots.ts` en el backoffice** (`94d69fc`, revertido en `4a455cf`). Lo añadí sin que la auditoría lo pidiera y Lighthouse lo penalizó (`is-crawlable`: SEO 100 → 63). Además, si una herramienta interna es indexable es una **decisión de despliegue** (puede estar tras una red privada). Se dejó en el historial como commit y reversión para que la medición sea visible.

## 6. Qué no se hizo y por qué

- **«Legacy/Unused JavaScript»** del backoffice (≈ 14 y 26 KiB): está en el chunk del propio framework; Next ya apunta por defecto a Chrome 111+. No hay cambio de aplicación que lo arregle.
- **`bf-cache`**: lo bloquea el propio entorno de Lighthouse.
- **TTFB, compresión y cabeceras de caché**: no auditables en local (`vite preview` / `next start` no son el servidor de producción).
- **INP de campo**: Lighthouse no lo mide; el INP de §2.3 es de laboratorio.

## 7. Recomendaciones (en orden de valor)

1. **Comprobar el prerender en el hosting real**: que `/talento` resuelva a `talento/index.html`, y repetir `curl` o una carga con JavaScript desactivado para ver el contenido en el HTML.
2. **Decidir la política de indexación del backoffice** (`robots` / `noindex`): una línea, pero es una decisión de despliegue. Lighthouse penalizará el SEO de esas páginas (63), que es lo esperado y correcto para una herramienta interna.
3. **Medir en producción real**: TTFB, compresión (gzip/brotli) y `Cache-Control` de los estáticos. Añadir **RUM** con la librería `web-vitals` para tener INP y CLS de usuarios reales, que es el dato que Google usa.
4. **Lighthouse en CI** (`scripts/lighthouse-audit.mjs` ya está) con un presupuesto mínimo (por ejemplo CLS < 0,1 y Performance ≥ 90) para que una regresión rompa la integración.
5. **Corregir el menú móvil del website** (hallazgo de §9): subir el `z-index` del desplegable.
6. Si las tablas crecen (cientos de filas), **paginar o virtualizar**: hoy son 15 filas y no hay problema.

## 8. Cómo reproducir

```bash
# Chromium (una vez) y Lighthouse
npx playwright install chromium
npm i -g lighthouse            # o LIGHTHOUSE_BIN=/ruta/al/binario
export CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())")

# Website (móvil y, con LH_PRESET=desktop, escritorio)
npm run build && npm --workspace uis/website run preview -- --port 4173 &
node scripts/lighthouse-audit.mjs http://127.0.0.1:4173/ website-home 3
node scripts/lighthouse-audit.mjs http://127.0.0.1:4173/talento/ website-talento 3   # barra final: resuelve al HTML prerenderizado

# Backoffice (escritorio, con sesión; necesita la API en :8000 con datos)
npm run build:backoffice && npm --workspace uis/backoffice run start &
LH_PRESET=desktop LH_LOGIN_URL=http://127.0.0.1:5174/login LH_EMAIL=... LH_PASSWORD=... \
  node scripts/lighthouse-audit.mjs http://127.0.0.1:5174/incidents backoffice-incidents 3

# INP (interacciones reales) y captura PNG de un informe
node scripts/inp-measure.mjs website http://127.0.0.1:4173 website-inp 3
LIGHTHOUSE_DIR=<carpeta con node_modules/lighthouse> \
  node scripts/lighthouse-screenshot.mjs docs/performance/lighthouse/<informe>.median.json <salida>.png
```

El script **aborta** si pides una página protegida y Lighthouse termina en `/login` (ver `AUDIT.md` §1).

## 9. Cumplimiento del enunciado y desviaciones

Contraste con la lista de requisitos del trabajo y con sus criterios de evaluación. Se marcan sin adornos los puntos donde no se hizo exactamente lo pedido.

| Requisito | Estado | Dónde / comentario |
|---|---|---|
| Medir contra el servidor de **producción** (`build` + `start`), nunca `dev` | Cumplido | `vite build` + `vite preview`; `next build` + `next start` |
| Website en **escritorio y móvil**, home + otra vista, 4 puntuaciones por página y modo | Cumplido | §2 |
| Backoffice: dashboard principal o vista con más elementos | Cumplido | `/` (inicio), `/incidents` (la de más elementos), `/suppliers`, `/login` |
| Capturas en `/audit/before/` y `/audit/after/` y commit | Cumplido | [`audit/before/`](./audit/before/), [`audit/after/`](./audit/after/). *Son renders del informe, no capturas de DevTools (`AUDIT.md` §1).* |
| `AUDIT.md`: problemas con causa raíz, no solo lo que marcó Lighthouse | Cumplido | `AUDIT.md` §3 (P1–P9) |
| Al menos dos casos de duplicación documentados (dónde, por qué, cómo quedaría) | Cumplido | `AUDIT.md` P8: cinco casos |
| Componente o Custom Hook extraído **e integrado** | Cumplido | `useAsyncResource` (en `useAssets` y `SuppliersPage`), `LoadingState`, `Field`/`ErrorBanner`, `SectionHeading`… |
| Instalar las skills indicadas y evidencia de su uso | Cumplido | `.claude/skills/`, `skills-lock.json`; `AUDIT.md` §5 |
| Ejecutar el agente sobre ambos frontends y registrar sus correcciones | Cumplido | `AUDIT.md` §5, con requeridas y sugerencias y el criterio usado |
| Aplicar las correcciones **requeridas** de las skills | Cumplido | la discutible («LCP en el HTML inicial») se aplicó: §3.6 |
| Priorizar KPI (TTFB, LCP, CLS, INP, Performance) | Cumplido con límites | INP medido (§2.3); **TTFB solo contra `localhost`**, no informativo |
| **Un problema por commit** | Cumplido, con las excepciones de abajo | 25 commits de código y herramientas, §2.2 |
| **Volver a ejecutar Lighthouse tras cada cambio** | Cumplido, **a posteriori** | §2.2; ver abajo |
| Extraer al menos un componente o hook y que la calidad se mantenga | Cumplido | §4 |
| `REPORT.md`: mejora medible en al menos una puntuación por frontend | Cumplido | §2: backoffice (Performance 87→100, 83→100) y website (SEO, Best Practices, Accessibility) |
| Valoración de qué tuvo mayor impacto | Cumplido | §1 |
| Las correcciones atacan causas reales, no cambios que inflan puntuaciones | Cumplido, con un matiz | ver abajo |
| **«No reestructures la arquitectura»** | Cumplido, con una decisión de criterio | el prerender: §3.6 y `AUDIT.md` §5 |

**Desviaciones y matices, dichos con claridad:**

1. **Un problema por commit: excepciones.** El primer commit (`faf2569`) es preparatorio y agrupa las herramientas de medición, la línea base y la instalación de las skills (no corrige ningún problema). `a4a9e9b` extrae `LoadingState` (refactor) y la usa para reservar el espacio de las tablas (la misma causa de CLS) en un solo commit, porque son inseparables. `f899dbd` divide `App.tsx` en tres módulos, que es un único refactor. Para el resto, cada commit resuelve una sola auditoría o una sola causa.
2. **La re-medición tras cada cambio se hizo a posteriori.** El trabajo se midió por rondas (lo que permitió descubrir el contraste pendiente y el `noindex`); después **se reorganizó el historial, aún sin publicar, en commits de un solo problema** y se compiló y midió cada uno (§2.2). Es el mismo método y el mismo entorno, y atribuye el efecto de cada cambio, pero no es medir en el momento. Además, los commits intermedios llevan 1 ejecución (y no 3) por página; los valores sueltos que eso produjo están señalados en §2.2.
3. **Matiz sobre «causas reales».** La mejora de Performance del backoffice es real y de causa raíz (CLS). Pero el website ya puntuaba 100 en Performance, así que sus mejoras son de SEO, accesibilidad y buenas prácticas (reales: un `robots.txt` que devolvía HTML, un favicon con 404, enlaces distinguibles solo por color) y, sobre todo, el contenido en el HTML. No había imágenes que optimizar ni fuentes web (verificado en el código), y los problemas de hidratación solo existen a raíz del prerender, que ya incluye su salvaguarda.
4. **INP, de laboratorio.** Sin datos de campo (CrUX/RUM): las apps no están desplegadas.
5. **Herramienta:** Lighthouse CLI 12.8.2, no la pestaña de DevTools; las skills no pudieron usar el servidor MCP de Chrome DevTools (no disponible) y se sustituyó por los *insights* de Lighthouse y los observadores de la propia skill.

### Hallazgo fuera de alcance (no corregido)

**En móvil, el menú desplegable del website queda tapado por el contenido de la home.** Al abrirlo, el enlace «Talento» se solapa con el texto «TALENTO QUE IMPULSA EL FUTURO» y el contenido de la home intercepta el clic (Playwright no consigue pulsar el enlace). Existe ya en la línea base y el refactor conservó las clases tal cual. Causa probable: el menú es `absolute z-10` y el contenedor de la home es `relative z-10` y va después en el DOM, así que pinta encima. Corrección probable: subir el `z-index` del menú o de la cabecera (`z-20`). **No se aplicó**: no es un problema de rendimiento y cambia comportamiento visible; se deja como decisión del equipo.
