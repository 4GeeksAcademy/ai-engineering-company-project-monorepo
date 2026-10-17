# Auditoría de rendimiento — sitio corporativo y backoffice

> **Estado:** línea base medida **antes de tocar código** (rama `perf/lighthouse-audit`, commit `faf2569`).
> Las mejoras aplicadas y su impacto están en [`REPORT.md`](./REPORT.md). La evidencia (JSON de Lighthouse y capturas) está en [`docs/performance/`](./docs/performance/).

## 1. Qué se auditó y cómo

| | Sitio corporativo (`uis/website`) | Backoffice (`uis/backoffice`) |
|---|---|---|
| Stack | Vite + React 19 (SPA, render solo en cliente) | Next.js 16 (App Router) + React 19 |
| Build medido | `vite build` + `vite preview` | `next build` + `next start` (producción, no `next dev`) |
| Páginas | `/` (home, la de más contenido) y `/talento` (formulario) | `/login`, `/` (inicio), `/incidents` (resumen + filtros + tabla de 15 filas) y `/suppliers` (tabla de 15 filas) |
| Perfil de Lighthouse | **Móvil** (el más exigente; el SEO se juzga mobile-first) | **Escritorio** (herramienta interna que se usa en ordenador) |
| Datos | — | API local con las 96 incidencias del histórico y los 15 proveedores de la semilla |

**Método.** Lighthouse 12, Chromium 153 headless. Cada página se mide **3 veces** y se conserva la **mediana** (`scripts/lighthouse-audit.mjs`); una sola ejecución varía demasiado. Las vistas del backoffice son privadas, así que el script inicia sesión primero y reutiliza esa sesión (`--disable-storage-reset`).

### Herramienta y capturas: qué son y qué no son

- **Se usó el Lighthouse CLI (12.8.2) con Chromium 153 headless, no la pestaña Lighthouse de las DevTools de Chrome.** El motor es el mismo, pero la versión integrada en un Chrome de escritorio puede ser otra y dar puntuaciones algo distintas. Se eligió el CLI porque permite repetir cada medición 3 veces, quedarse con la mediana y automatizar el inicio de sesión del backoffice.
- **Las capturas (`audit/before/*.png` y `audit/after/*.png`) son renders del informe, no capturas de la interfaz de DevTools.** Se generan con `scripts/lighthouse-screenshot.mjs` a partir del JSON de cada medición (el generador de informes de Lighthouse, abierto en un navegador headless). Los números coinciden exactamente con los JSON; solo cambia el marco visual. Las de «antes» se generaron con el código sin modificar (commit `faf2569`).
- Quien necesite capturas de la pestaña de DevTools debe repetir la medición a mano; los pasos están en `REPORT.md` §8.

### Dos errores de medición que se detectaron y corrigieron

Se dejan escritos porque son el tipo de trampa que invalida una auditoría sin avisar:

1. **La primera medición «autenticada» medía la pantalla de login.** Las tres vistas daban resultados casi idénticos y el elemento LCP era el texto «¿No tienes cuenta?». Causa: el login se hizo en un contexto aislado de Playwright (`newPage()`), distinto del que usa Lighthouse, que por tanto no veía el token y era redirigido a `/login`. Se rehízo con `launchPersistentContext` y el script **aborta si Lighthouse termina en `/login`** al pedir una página protegida.
2. **El script se colgaba** al usar `spawnSync`: bloqueaba el bucle de eventos de Node, Playwright dejaba de leer la tubería de Chrome y esta se llenaba. Se cambió a `spawn` asíncrono.

### Límites de esta medición (para no sobreinterpretar)

- Es un entorno local con **limitación simulada** de Lighthouse, no tráfico real. Los valores absolutos de LCP/FCP no son los de producción; lo que vale es la **comparación antes/después en las mismas condiciones**.
- **TTFB** se mide contra `localhost` (2–7 ms): no dice nada del servidor real. No se puede auditar sin desplegar.
- Lighthouse en modo *navegación* no mide **INP**; se midió aparte con interacciones reales y es de laboratorio (§4).
- `vite preview` y `next start` no son el servidor de producción: la compresión y las cabeceras de caché de producción **no están auditadas**.

## 2. Puntuaciones iniciales

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Website `/` | móvil | **100** | **100** | **96** | **92** | 1,42 s | 0 | 35 ms |
| Website `/talento` | móvil | **100** | **95** | **96** | **92** | 1,42 s | 0 | 34 ms |
| Website `/` | escritorio | **100** | **100** | **96** | **92** | 0,35 s | 0 | 0 ms |
| Website `/talento` | escritorio | **100** | **95** | **96** | **92** | 0,35 s | 0 | 0 ms |
| Backoffice `/login` | escritorio | **100** | **91** | **96** | **100** | 0,40 s | 0 | 18 ms |
| Backoffice `/` | escritorio | **100** | **95** | **100** | **100** | 0,34 s | 0 | 0 ms |
| Backoffice `/incidents` | escritorio | **87** | **94** | **100** | **100** | 0,40 s | **0,255** | 0 ms |
| Backoffice `/suppliers` | escritorio | **83** | **96** | **100** | **100** | 0,40 s | **0,351** | 0 ms |

Capturas: [`audit/before/`](./audit/before/). Los valores del website en escritorio (y las del resto de páginas) se **reprodujeron en una segunda sesión** con idénticas puntuaciones (`/suppliers` pasó de 83 a 82 y de CLS 0,351 a 0,388 porque en esa sesión la tabla tenía 16 filas: una prueba E2E había añadido un proveedor).

**Lectura general.** Ninguna página falla LCP (< 2,5 s) ni TBT: **la velocidad de carga no es el problema**. Lo que arrastra el rendimiento es la **estabilidad visual** en las dos vistas con tablas del backoffice, que es justo donde trabajan a diario las personas que lo usan. Y en el sitio corporativo el margen está en SEO, accesibilidad y buenas prácticas, no en velocidad.

## 3. Problemas identificados y causa raíz

Ordenados por impacto. «Evidencia» indica cómo se llegó a la causa (no solo qué avisa Lighthouse).

### P1 — Layout shifts en `/incidents` (CLS 0,255) y `/suppliers` (CLS 0,351) · impacto **alto**

El umbral bueno es CLS < 0,1. Es el único problema que baja Performance (a 87 y 83).

Un observador de `layout-shift` con `previousRect`/`currentRect` (técnica de la skill `core-web-vitals`) mostró **tres causas distintas**, ninguna evidente en el informe de Lighthouse, que solo señalaba un `<div>`:

| Causa | Dónde | Evidencia |
|---|---|---|
| **Contenido asíncrono sin espacio reservado.** El panel de resumen (≈ 480 px) se inserta *encima* de los filtros y la tabla cuando responde la API. | `/incidents` | Los filtros pasaron de `y=140` a `y=652` (+512 px) |
| **React reutiliza el mismo `<div>`** para «Cargando…» (24 px) y la tabla, así que el contenedor crece de 24 px a 740 px visibles de golpe. | `/suppliers` | `prev: 1030×24` → `cur: 1030×740` |
| **La barra lateral mide lo que la página**, no lo que la ventana. Al cargar una tabla larga, su bloque de usuario «cae» fuera de pantalla. | ambas | `prev: y=831` → `cur: 0,0,0,0` |

### P2 — Contraste insuficiente en texto secundario · impacto **medio** (Accessibility 91–96)

`text-slate-500` / `text-slate-600` sobre fondos `slate-900/950` dan ≈ 3,7 : 1 (WCAG AA exige 4,5 : 1). Afecta a la etiqueta «Backoffice» del menú, el email del usuario, las cabeceras de tabla, notas y pistas de formulario. **31 usos** repartidos por el código.

### P3 — Falta de `robots.txt` válido (website, SEO 92) · impacto **medio**

No existía `public/robots.txt`: el servidor devuelve el `index.html` de la SPA para esa URL y Lighthouse lo analiza como robots inválido (**«16 errors found»**). Un crawler que lee eso puede interpretar reglas inexistentes.

### P4 — Sin favicon: 404 en consola (Best Practices 96) · impacto **bajo**

`/favicon.ico` devuelve 404 en ambos frontends; el navegador lo pide siempre. Afecta a Best Practices (`errors-in-console`) y a la imagen de marca en pestañas y resultados de búsqueda.

### P5 — Accesibilidad de componentes concretos · impacto **bajo/medio**

| Auditoría | Dónde | Causa |
|---|---|---|
| `heading-order` | `/incidents` | El panel de resumen usa `<h3>` justo después del `<h1>`, saltándose el `<h2>` |
| `label-content-name-mismatch` | `/suppliers` | El botón muestra «Activo» pero su `aria-label` es «Suspender X»: quien use control por voz dice «clic en Activo» y no funciona (WCAG 2.5.3) |
| `link-in-text-block` | website `/talento`, backoffice | Enlaces dentro de texto que solo se distinguen por el color (WCAG 1.4.1) |

### P6 — Metadatos SEO iguales en todas las rutas (website) · impacto **medio** (no lo detecta Lighthouse)

`/talento` conserva el título, la descripción y la URL canónica de la home. Lighthouse no lo marca porque comprueba que existan, no que sean correctos para cada página, pero para un buscador son dos URLs con la misma identidad.

### P7 — Prefetch masivo de filas (backoffice `/incidents`) · impacto **bajo**

El `<Link>` por defecto de Next precarga cada enlace que entra en el viewport. La tabla tiene 15 filas con ruta dinámica: en la carga medida aparecen **28 peticiones `_rsc`** (51 peticiones en total) para enlaces que el usuario abre de uno en uno.

### P8 — Duplicación de código (análisis de refactorización) · impacto **mantenibilidad**

Se revisaron ambos frontends buscando lógica o marcado que se repite y puede extraerse. Se documentan **cinco casos** (la rúbrica pide al menos dos). Las referencias son al código de la línea base (`faf2569`); en `REPORT.md` §3.5 se indica cuáles se aplicaron.

#### Caso 1 — Estilos de campo de formulario (`inputClass`, `selectClass`) · backoffice

- **Dónde aparece:** definida en 5 sitios: `components/incidents/Field.tsx:3` (la «buena», exportada), `views/LoginPage.tsx:11`, `views/RegisterPage.tsx:11`, `views/ProfilePage.tsx:9` y `components/suppliers/SupplierForm.tsx:18`. `selectClass` en 2: `components/incidents/IncidentFilters.tsx:24` y `views/SuppliersPage.tsx:10`.
- **Por qué es candidato:** son la misma cadena de Tailwind y **ya divergieron sin que nadie lo decidiera**: el borde de campo inválido era `rose-400` en `Field.tsx`, `rose-500` en Register y Profile, y no existía en Login ni SupplierForm. Un campo con error se veía distinto según la pantalla.
- **Cómo quedaría:** una sola fuente, en un sitio neutral (la usan inventario, login y proveedores, no solo incidencias):

```ts
// components/ui/Field.tsx
export const inputClass = "w-full rounded-lg border ... aria-[invalid=true]:border-rose-400";
export const selectClass = inputClass.replace("w-full", "w-auto");   // para filtros en fila
// cada vista: import { inputClass } from "../components/ui/Field";  y  className={`${inputClass} mt-1`}
```

#### Caso 2 — Caja de error roja · backoffice

- **Dónde aparece:** escrita a mano **7 veces** (`LoginPage.tsx:87`, `RegisterPage.tsx:142`, `ProfilePage.tsx:42` y `:131`, `SupplierForm.tsx:131`, `SuppliersPage.tsx:104`, `IncidentsAnalysisPage.tsx:71`) aunque el componente `ErrorBanner` ya existía en `Field.tsx:38`.
- **Por qué es candidato:** el componente existe y no se usaba; cambiar el aspecto de un error exigía editar 8 archivos.
- **Cómo quedaría:** `ErrorBanner` acepta un `className` solo para el margen, y cada sitio pasa a una línea:

```tsx
export function ErrorBanner({ message, className = "" }: { message: string; className?: string }) { ... }
// antes (4 líneas)  <div role="alert" className="mt-4 rounded-xl border ...">{error}</div>
// después           {error && <ErrorBanner message={error} className="mt-4" />}
```

#### Caso 3 — «Cargar al montar + loading + error + reintentar» (Custom Hook) · backoffice

- **Dónde aparece:** `components/inventory/useAssets.ts:23` (ya es un hook, con `reload` y `retry`) y `views/SuppliersPage.tsx:25` (escrito a mano con `.then/.catch/.finally`); variantes en `InventoryOrdersPage.tsx:44`, `IncidentDetailPage.tsx:48` e `IncidentsPage.tsx:67`.
- **Por qué es candidato:** `useAssets` y `SuppliersPage` implementan **exactamente lo mismo**, y `useAssets` tiene un detalle fino (que «Reintentar» vuelva a *loading* para no mostrar «no hay datos» mientras reintenta) que `SuppliersPage` no tiene: la copia es peor que el original.
- **Cómo quedaría:** un hook genérico que `useAssets` y `SuppliersPage` reutilizan. Las otras tres vistas **no** se fuerzan (cargan dos fuentes, distinguen un 404 o paginan con filtros): la abstracción no debe doblegar casos distintos.

```ts
// lib/useAsyncResource.ts
export function useAsyncResource<T>(load: () => Promise<T>, initial: T, describeError: (e: unknown) => string) {
  /* devuelve { data, setData, loading, error, setError, reload, retry } */
}
// SuppliersPage:  const { data: suppliers, setData, loading, error, setError } = useAsyncResource(listSuppliers, [], describe);
```

#### Caso 4 — Bloque «spinner + Cargando…» · backoffice

- **Dónde aparece:** 6 copias: `AssetsPage.tsx:98`, `IncidentDetailPage.tsx:66`, `IncidentsAnalysisPage.tsx:65`, `IncidentsPage.tsx:145`, `InventoryOrdersPage.tsx:85`, `SuppliersPage.tsx:111`.
- **Por qué es candidato:** además del código repetido, **impedía arreglar el problema de rendimiento P1 en un solo sitio**: reservar espacio para evitar el CLS exigía tocar las 6.
- **Cómo quedaría:** un componente con una opción que reserva la altura donde aparecerá una tabla:

```tsx
<LoadingState label="Cargando órdenes…" reserveSpace className="mt-8" />   // reserveSpace => min-h-[80vh]
```

#### Caso 5 — Datos de contacto y bloque de sección · website

- **Dónde aparece:** `uis/website/src/App.tsx` (un solo archivo de 47 líneas muy largas): el email aparece **3 veces** (página de talento, sección Contacto y pie) y cada teléfono **2** (Contacto y pie), en las líneas 41, 45 y 46 y el bloque «eyebrow + `<h2>`» **4 veces**.
- **Por qué es candidato:** un cambio de teléfono exige acordarse de dos sitios (y del email, de tres); y el archivo es difícil de revisar.
- **Cómo quedaría:** datos en un módulo y marcado en componentes pequeños:

```ts
// content.ts
export const CONTACT = { email: "contacto@nexova.com", phones: [{ city: "Valencia", display: "+34 960 123 456", href: "tel:+34960123456" }, ...] };
// components.tsx:  <SectionHeading eyebrow="Contacto" title="Hablemos" />   <TextLink href={...}>...</TextLink>
```

### Observaciones que **no** son accionables (y por qué)

Se documentan para no gastar tiempo corrigiéndolas, siguiendo el criterio de la skill `web-perf` («verificar antes de recomendar», «no priorizar cambios de 0 ms»):

- **«Legacy JavaScript» (≈ 14 KiB) y «Unused JavaScript» (≈ 26 KiB) en el backoffice.** Verificado en la documentación de Next: ya apunta por defecto a Chrome 111+/Safari 16.4+ y solo carga polyfills en navegadores que los necesitan. El código marcado está en el chunk del propio framework (React/Next). No hay cambio a nivel de aplicación que lo arregle.
- **`bf-cache` («page prevented back/forward cache restoration»).** Los dos motivos son «desactivado por flags / por línea de comandos»: es el propio entorno de Lighthouse, no la app.
- **«Render blocking requests» y «Network dependency tree» en el website.** Un único CSS de 3,5 KB gzip y un script `module` (que es `defer` por defecto): ahorro estimado de 150 ms sobre una página que ya puntúa 100. **Mientras el HTML inicial esté vacío, inlinar el CSS no ayuda** (sin JavaScript no hay nada que pintar), así que en el diagnóstico inicial se descartó; deja de ser cierto una vez que el HTML trae contenido, y se aplicó después del prerender (`REPORT.md` §3.6).
- **Forced reflow (≈ 34 ms, sin atribución)** en `/login`: sin origen identificable y sin efecto en la puntuación.

### P9 — HTML inicial vacío en el website (SEO) · impacto **alto para SEO, invisible para Lighthouse**

El HTML inicial del sitio corporativo es `<div id="root"></div>`: **todo el contenido (incluido el JSON-LD y el `<h1>`) lo crea JavaScript**. Google ejecuta JS, pero otros consumidores (vistas previas de LinkedIn o Slack, algunos buscadores y rastreadores) leen solo el HTML inicial y ven una página vacía. Lighthouse no lo penaliza porque su navegador sí ejecuta JavaScript.

- **Evidencia:** cargando la página con JavaScript desactivado no hay `<h1>`, ni texto, ni JSON-LD.
- **Por qué importa aquí:** el objetivo declarado del CTO para el sitio corporativo es *apoyar el SEO*. Además, la skill `core-web-vitals` lo lista como fallo de su comprobación de LCP («LCP element in initial HTML, not JS-rendered»).
- **Causa raíz:** la app se renderiza solo en el cliente (`createRoot` sobre un `#root` vacío).
- **Corrección:** prerenderizar las dos rutas en el build y que el cliente *hidrate* ese HTML. Es una corrección dirigida a esta causa (no cambia componentes, rutas, estado ni la herramienta de build), con una salvaguarda: si el servidor devuelve el HTML de otra ruta, el cliente pinta desde cero en lugar de lanzar un error de hidratación. Detalle y medición en `REPORT.md` §3.6.

## 4. INP

Lighthouse en modo navegación no mide INP (necesita interacción). **Se midió aparte**, con la API Event Timing (el observador que propone la skill `core-web-vitals`), ejecutando una serie fija de interacciones reales con la CPU frenada ×4 (`scripts/inp-measure.mjs`):

| Frontend (línea base) | INP (mediana) | Umbral bueno |
|---|---:|---:|
| Website, móvil | **64 ms** | < 200 ms |
| Backoffice, escritorio | **88 ms** | < 200 ms |

Los dos están muy por debajo del umbral. La interacción más lenta es un `pointerdown` con tiempo de procesamiento ≈ 0–2 ms, es decir, no hay trabajo de JavaScript que dominar. TBT (0–62 ms) es coherente. Sigue siendo una medición de **laboratorio**: el INP de campo necesita RUM (ver `REPORT.md`, recomendaciones). El resultado «después» está en `REPORT.md` §2.3.

## 5. Qué identificaron las skills al ejecutarlas sobre ambos frontends

Se ejecutaron las tres skills instaladas (`core-web-vitals`, `performance` de `addyosmani/web-quality-skills` y `web-perf` de `cloudflare/skills`) sobre **los dos frontends**, siguiendo el flujo de `web-perf` (traza → Core Web Vitals → red → accesibilidad → código).

**Qué no se pudo recoger** (la propia skill pide declararlo): no hay servidor MCP de Chrome DevTools en este entorno, así que no hay `performance_start_trace` ni `performance_analyze_insight`; y no hay datos de campo (CrUX/RUM) porque las apps no están desplegadas. Se sustituyeron por: los *insights* del propio informe de Lighthouse (desglose del LCP, `layout-shifts`, árbol de red), el observador de `layout-shift` y de Event Timing que las skills proponen, y la lectura del código.

**Criterio de clasificación.** Las skills no etiquetan sus recomendaciones como «requerida» o «sugerencia», así que se usó este criterio, escrito antes de decidir qué aplicar:

- **Requerida** = incumple un umbral medido (CLS > 0,1, Performance < 90…) o una regla WCAG verificada con el elemento exacto, o es un fallo funcional de la lista de comprobación de la skill con impacto demostrado.
- **Sugerencia** = elemento de una lista de comprobación o de «buenas prácticas» sin problema medido en esta aplicación (o que la propia skill condiciona a evidencia: «preload solo si la traza muestra descubrimiento tardío»).

### Correcciones **requeridas** (aplicadas)

| Skill | Hallazgo | Frontend | Evidencia | Estado |
|---|---|---|---|---|
| `core-web-vitals` (CLS) + `web-perf` fase 2 | Contenido asíncrono sin espacio reservado; contenedor que crece; barra lateral que se desplaza | backoffice | CLS 0,255 / 0,351 > 0,1; rectángulos `prev`/`cur` | **Aplicada** (`REPORT.md` §3.1) |
| `web-perf` fase 4 (accesibilidad) | Contraste < 4,5:1; «elementos interactivos sin nombre accesible» (nombre ≠ texto visible); jerarquía de encabezados | backoffice | `color-contrast`, `label-content-name-mismatch`, `heading-order` | **Aplicada** (§3.2) |
| `web-perf` fase 4 | Enlaces distinguibles solo por color | ambos | `link-in-text-block` | **Aplicada** (§3.2, §3.4) |
| `web-perf` fase 3 (red) | Petición que falla (404) y `robots.txt` inválido | ambos | `errors-in-console`, `robots-txt` (16 errores) | **Aplicada** (§3.3, §3.4) |
| `core-web-vitals` (checklist LCP): «LCP element in initial HTML (not JS-rendered)» | El HTML inicial del website está vacío | website | `<div id="root"></div>`; sin JavaScript no hay contenido | **Aplicada** (P9, `REPORT.md` §3.6) |

> **La requerida que más duda generó, y por qué se aplicó.** La skill exige que el LCP esté en el HTML inicial, lo que en una SPA significa prerenderizar. El enunciado del trabajo dice *«No reestructures la arquitectura de ninguno de los frontends… Aplica correcciones dirigidas… la mejora, no una reescritura»*. Se valoró si choca y se concluyó que **no**: el prerender es una corrección dirigida a una causa concreta y medida, no una reescritura, porque los componentes, las rutas, el estado y la herramienta de build (Vite) no cambian; se añaden dos archivos pequeños (la entrada de servidor y el script de prerender, de unas 40 líneas) y se tocan unas líneas de `main.tsx`, `App.tsx`, `seo.ts` y `package.json` y una salvaguarda que devuelve al comportamiento anterior si el servidor no se comporta como se espera. Se separó en dos commits propios (`feat(website): prerender…` y `perf(website): inline the stylesheet…`) para que sea trivial quitarlo si el equipo opina que cruza la línea. Es la decisión de criterio más discutible de la auditoría y se deja señalada.

### **Sugerencias** (no aplicadas o aplicadas por bajo riesgo)

| Skill | Sugerencia | Decisión y motivo |
|---|---|---|
| `performance` | Evitar prefetch/peticiones innecesarias | **Aplicada** (`prefetch={false}` en filas): −10 peticiones, −7 KB, sin efecto medible en LCP; por `web-perf` («no priorizar cambios de 0 ms») es de baja prioridad y se aplicó solo por tener riesgo nulo. |
| `core-web-vitals` | Critical CSS inline (< 14 KB) | **Aplicada, pero solo tras el prerender** (`REPORT.md` §3.6): el CSS del website son 11 KB; sin HTML con contenido el inlinado no adelanta la pintura, con él sí (−155 ms de LCP en la medición del prerender). |
| `core-web-vitals`, `performance` | Speculation Rules (`prerender`, eagerness `moderate`) | **No aplicada.** El website navega con `pushState` (ya es instantáneo) y en el backoffice un prerender dispararía llamadas a la API antes de navegar (efectos secundarios, que la skill advierte). Sin beneficio medible. |
| `performance` | Code splitting (`lazy`) | **Probada y revertida:** `React.lazy` del formulario empeoró el LCP de `/talento` (1423 → 1672 ms). Next ya divide por ruta. |
| `performance`, `core-web-vitals` | Preload/preconnect, `fetchpriority`, imágenes AVIF/WebP con `srcset`, `font-display: swap`, fuentes variables | **No aplicables, verificado en el código:** no hay etiquetas `<img>`, ni `@font-face`/`next/font`, ni scripts de terceros (`grep` en ambos frontends). Sería código sin problema que resolver. |
| `performance` | Virtualizar listas largas | **No aplicable:** las tablas tienen 15 filas. |
| `performance` | Compresión Brotli/gzip, HTTP/2-3, CDN, `Cache-Control`, Early Hints, TTFB | **No auditable en local** (`vite preview` / `next start` no son el servidor de producción). Recomendado verificarlo desplegado. |
| `web-perf` fase 5 | Polyfills y `browserslist` | **Verificado, sin acción:** Next ya apunta a Chrome 111+ por defecto y carga polyfills solo donde hacen falta; el «JavaScript heredado» marcado es del chunk del framework. |
| `performance` | View Transitions | **No aplicada:** es una mejora de experiencia, no hay problema medido. |
| `core-web-vitals` (INP) | Medir INP con el observador de Event Timing y atribuir | **Hecha:** ver §4 (INP medido con interacciones reales). |
