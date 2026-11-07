# AUDIT — Rendimiento de los frontends (sitio corporativo y backoffice)

Auditoría hecha **contra el build de producción** (`npm run build` + `next start`), nunca con `next dev`.

- Sitio corporativo: `uis/talent-pipeline-tracker` (Next 16.3.5, Tailwind 4) → `:3000`
- Backoffice: `uis/backoffice` (Next 16, CSS global) → `:3001`
- Herramienta: Lighthouse 13.6.0 (CLI programático) con el Chromium de Playwright, `audit/tools/run-lighthouse.mjs`.
- Método: 3 ejecuciones por URL y modo (móvil con throttling simulado por defecto; escritorio con el preset desktop); se reporta la **mediana** por Performance. Entre paréntesis, las 3 pasadas.
- Evidencia: capturas del informe y JSON completos en [`audit/before/`](audit/before/) (después, en [`audit/after/`](audit/after/)).

## 1. Puntuaciones iniciales

P = Performance, A = Accessibility, BP = Best Practices, SEO.

| Página | Modo | P | A | BP | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Web · home `/` | Móvil | 98 (79/98/98) | 96 | 100 | 100 | **2,2 s** | 130 ms | 0 |
| Web · home `/` | Escritorio | 100 | 96 | 100 | 100 | 0,5 s | 0 ms | 0,005 |
| Web · `/candidates/new` | Móvil | 100 | **86** | 100 | 100 | 0,8 s | 50 ms | 0 |
| Web · `/candidates/new` | Escritorio | 100 | **86** | 100 | 100 | 0,2 s | 0 ms | 0 |
| Backoffice · dashboard `/` | Móvil | 100 | **96** | 100 | 100 | 1,0 s | 30 ms | 0 |
| Backoffice · dashboard `/` | Escritorio | 100 | 100 | 100 | 100 | 0,3 s | 0 ms | 0 |
| Backoffice · `/incidents/new` | Móvil | 100 | **96** | 100 | 100 | 1,0 s | 40 ms | 0 |
| Backoffice · `/incidents/new` | Escritorio | 100 | 100 | 100 | 100 | 0,3 s | 0 ms | 0 |
| Backoffice · `/login` | Móvil | 100 | 100 | 100 | 100 | 0,8 s | 30 ms | 0 |
| Backoffice · `/login` | Escritorio | 100 | 100 | 100 | 100 | 0,3 s | 10 ms | 0 |

TTFB no es un problema en ninguna página (documento raíz < 10 ms en local); no se dispone de datos de campo (CrUX/RUM).

### Vistas con datos reales (backoffice)

Se registró una cuenta de prueba y se midió con un token real, sobre la base con 15 proveedores, 96 incidencias y 6 productos. Línea base = código de `b80c33b` servido desde un worktree aparte; evidencia en [`audit/before-data/`](audit/before-data/).

| Página | Modo | P | A | BP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Backoffice · `/suppliers` | Móvil | 98 (75/98/100) | **96** | 100 | 1,1 s | 160 ms | 0,004 |
| Backoffice · `/suppliers` | Escritorio | **96** | **96** | 100 | 0,4 s | 0 ms | **0,118** |
| Backoffice · `/incidents/list` | Móvil | 96 | **96** | **96** | 1,0 s | **220 ms** | 0,001 |
| Backoffice · `/incidents/list` | Escritorio | 100 | 100 | 100 | 0,4 s | 0 ms | 0,009 |
| Backoffice · `/inventory/products` | Móvil | 100 | **96** | 100 | 0,8 s | 30 ms | 0,001 |
| Backoffice · `/inventory/products` | Escritorio | **98** | 100 | 100 | 0,3 s | 0 ms | **0,088** |

### Páginas elegidas y límites de la medición

- **Web:** la home (la página con más componentes: 20+ tarjetas y filtros) y el formulario de alta (la más compleja en formularios).
- **Backoffice:** el dashboard (`/`), `/incidents/new` y `/login` con una sesión sembrada (el guard solo comprueba que `exp` sea futuro), y las vistas con tablas y datos (`/suppliers`, `/incidents/list`, `/inventory/products`) con una cuenta de prueba real (`lighthouse-audit@example.com`, creada en el Supabase del proyecto; conviene borrarla al terminar). Las vistas de entrada/salida de órdenes y de resumen de incidencias no se auditaron.
- **Un error de mi propio arnés, corregido:** la primera medición de `/login` reutilizó el Chrome con el JWT del dashboard, `GuestOnly` redirigió y salió Performance 95 / LCP 2,6 s (falso). Tras limpiar el almacenamiento, el login real es 100 con LCP 0,8 s. Se descartó esa hipótesis y no se tocó `GuestOnly` (commit `b80c33b`).
- Las cifras son de laboratorio, en localhost con latencia simulada por Lighthouse. Son útiles para comparar antes/después, no para predecir cifras de campo. INP no se mide en laboratorio; se usa TBT como indicador aproximado.

## 2. Problemas identificados y causa raíz

Ordenados por impacto en los KPI principales.

### P1 — LCP de la home en móvil: 2,2 s (web) · **KPI principal**
- **Síntoma:** LCP 2,2 s frente a 0,8 s en la otra página del mismo sitio, y una de las tres pasadas cayó a 79. El filmstrip de Lighthouse muestra primero el spinner «Loading candidates…» y después las tarjetas.
- **Causa raíz (cadena de render):**
  1. `app/page.tsx` era un Client Component que leía `useSearchParams()`. En una ruta estática eso fuerza un *bailout* a renderizado en cliente: el HTML servido solo contenía el `Suspense fallback` (el spinner).
  2. La lista solo existía tras **descargar y ejecutar el JS (≈120 KB), hidratar y hacer un `fetch` desde el navegador** a `NEXT_PUBLIC_API_URL`, que en este entorno es una API de terceros (`playground.4geeks.com`).
  3. El elemento LCP (título de la primera tarjeta) dependía de toda esa cadena: el desglose de LCP mostró TTFB ≈ 5 ms y ≈ 205 ms de *render delay*. Y la pasada de 79 se explica por la variabilidad de la API externa dentro de esa cadena.
- No es un problema de servidor ni de imágenes: es de **hidratación / render dependiente de JS** (clase de problema que señala `core-web-vitals`: «LCP element in initial HTML (not JS-rendered)»).

### P2 — Accesibilidad del formulario de alta: 86 (web)
- **Causa raíz:** los 9 `<label>` de `CandidateForm` no estaban asociados a su control (sin `htmlFor`/`id`). Lighthouse marcó `label` y `select-name` (los campos con `placeholder` pasan por casualidad). Un lector de pantalla anuncia «campo de edición» sin nombre.

### P3 — Accesibilidad de la home: 96 (web)
- **Causa raíz (dos):** `landmark-one-main` (el layout raíz no tenía `<main>`; las páginas no tienen landmark de contenido) y `heading-order` (`<h3>` en las tarjetas directamente bajo el `<h1>`, saltándose el `h2`).

### P4 — Barra de navegación del backoffice en móvil: A 96 (dashboard e incident-form)
- **Causa raíz:** `.topbar ul { display:flex }` sin `flex-wrap`. Con 11 enlaces, en 412 px la lista se desborda **fuera de la barra oscura** y los enlaces (`#cfd8ea`) quedan sobre el fondo claro `#f5f7fb`: contraste **1,33:1** (mínimo 4,5:1) y desbordamiento horizontal. Es un fallo real de usabilidad móvil, no solo de la auditoría.

### P5 — CLS de 0,118 en `/suppliers` (escritorio) y 0,088 en productos · **supera el umbral de 0,1**
- **Síntoma:** el único elemento desplazado es `main.wide` completo (1280 px), en escritorio y no en móvil; Performance 96.
- **Causa raíz:** `main` está centrado (`margin: 0 auto`). Al cargar los datos la página pasa de caber en pantalla a medir ~1800 px de alto, **aparece la barra de scroll vertical y todo el contenido se desplaza horizontalmente** unos píxeles. Con tablas largas, ese desplazamiento afecta a casi toda la ventana, de ahí la puntuación alta. Solo ocurre con datos reales: con las páginas vacías no se ve.

### P6 — Contraste insuficiente en proveedores suspendidos: A 96 (`/suppliers`)
- **Causa raíz:** las filas suspendidas se atenúan con `opacity: .55` sobre cada celda. La opacidad desvanece **todo** (texto, chips, enlaces «Editar tarifa», badge) y los reduce a 2,3–3,75:1 frente al mínimo de 4,5:1. Con datos de ejemplo no había proveedores suspendidos visibles en la medición vacía.

### P7 — `/favicon.ico` 404 en consola (ambas apps)
- **Causa raíz:** no hay icono de aplicación; el navegador lo pide y recibe 404, que Lighthouse registra como error de consola. Bajó Best Practices a 96 en una pasada de `/incidents/list` móvil (intermitente, no reproducible a voluntad).

### P8 — CSS que bloquea el render (ambas apps) · **investigado, descartado**
- `render-blocking-insight` estimaba 110–150 ms en móvil. Hipótesis: `experimental.inlineCss` lo elimina. Se probó en la web y **no mejoró** (FCP 0,7 → 0,8 s; BP de la home móvil 100 → 96). Se revirtió; evidencia en `audit/iterations/05-website-inline-css/`. En el backoffice no se probó: la propia documentación de Next lo desaconseja para usuarios recurrentes (pierden la caché del CSS), que es el caso de una herramienta diaria.

### Observados y **no** corregidos (impacto nulo o fuera de alcance)
| Hallazgo | Por qué no se actúa |
|---|---|
| `unused-javascript` 24–49 KiB | Son los *chunks* del runtime de React/Next, no código propio; no se puede eliminar sin reestructurar. |
| `network-dependency-tree` | Informativo (cadena JS→JS normal del App Router); sin ahorro estimado. |
| `/incidents/list` móvil: TBT 220–230 ms, Performance 96 | Son las 96 filas × 7 columnas renderizadas en el hilo principal tras hidratar. Reducirlo exige paginación o virtualización de la tabla, que cambia el producto y la arquitectura de la vista; ya está por encima de 90 y de los umbrales de LCP/CLS. Se documenta como siguiente paso. |
| Speculation Rules / preloads (sugeridos por las skills) | Son *sugerencias*: el LCP ya es < 1 s y no hay imagen LCP que priorizar. Se mide impacto antes de añadir complejidad. |
| Imágenes, fuentes y CLS | No hay imágenes rasterizadas (solo SVG inline) ni fuentes web (se usa la pila del sistema): CLS = 0 en todas las páginas. Se verificó, no se asume. |

## 3. Uso de las skills de agente

Instaladas a nivel de proyecto con `npx skills add` (`.claude/skills/`, registradas en `skills-lock.json`): `core-web-vitals` y `performance` (addyosmani/web-quality-skills) y `web-perf` (cloudflare/skills). Se leyeron antes de usarlas. No hay servidor MCP de Chrome DevTools en este entorno, así que se aplicó su flujo con Lighthouse como alternativa de laboratorio (que `core-web-vitals` contempla expresamente).

- `web-perf`: fases 2–3 (desglose de LCP, *render blocking*, dependencias de red, accesibilidad) → origen de P1–P7 y del experimento P8; su regla «no priorizar cambios con 0 ms de impacto» → descarte de P8 y de los hallazgos no corregidos.
- `core-web-vitals`: sección «Client-side rendering delays» y checklist LCP («LCP element in initial HTML, not JS-rendered») → solución de P1; «medir antes y después en las mismas condiciones» → método.
- `performance`: flujo de medición (`references/MEASUREMENT.md`) → medianas de 3 pasadas y comparación en condiciones equivalentes.

Las correcciones aplicadas son las que respaldan una auditoría fallida **medida** (P1–P4). Lo que las skills proponen como práctica general sin evidencia local (Speculation Rules, preloads, inline CSS) se trató como sugerencia.

## 4. Análisis de refactorización (código duplicado)

### R1 — Patrón de carga de datos duplicado en el backoffice → hook `useLoader`
- **Dónde aparece:** `useState(data)` + `useState(loading)` + `useState(error)` + `useCallback(load)` + `useEffect(load)` con el mismo `try/catch/finally` en **6 sitios** que cargan datos al montar: `inventory/products/page.tsx`, `inventory/orders/page.tsx`, `lib/useAssets.ts`, `suppliers/page.tsx`, `incidents/list/page.tsx` y `components/IncidentTotals.tsx`. (`incidents/page.tsx` también usa `loading/error`, pero para subir un CSV bajo demanda, no es el mismo patrón.)
- **Por qué refactorizar:** cada copia repite el mismo `eslint-disable` de la regla de efectos y es fácil que diverjan (ya lo hacían: `useAssets` no vaciaba la lista al fallar; los demás sí). Un cambio de comportamiento (p. ej. cancelar peticiones obsoletas) hoy exigiría tocar 6 archivos.
- **Abstracción:**
  ```ts
  const { data, setData, loading, error, reload } = useLoader(fetcher, initial);
  ```
  `fetcher` estable (`useCallback` con los filtros); en error `data` vuelve a `initial` y `error` lleva el mensaje legible de `getUserMessage`.
- **Alcance aplicado:** productos, historial de órdenes y `useAssets` (usado por entrada y salida). `suppliers` queda fuera porque las filas escriben en `error` (`onError={setError}`), `incidents/list` porque protege contra respuestas fuera de orden con un contador de petición, y `IncidentTotals` por usar un mensaje de error propio. Se dejaron como siguiente paso en lugar de forzar el hook.

### R2 — `StatusFilter` y `StageFilter` idénticos en la web → `SelectFilter`
- **Dónde:** `components/StatusFilter.tsx` y `components/StageFilter.tsx`: 46–49 líneas cada uno, iguales salvo `id`, texto de la etiqueta y lista de opciones.
- **Por qué:** cualquier ajuste de estilo, accesibilidad o comportamiento del `<select>` había que hacerlo dos veces.
- **Abstracción:** `SelectFilter({ id, label, value, onChange, options })`; los dos componentes originales son ahora envoltorios de una línea que conservan su API pública y sus opciones por defecto, así que ningún consumidor cambia.

### Candidatos detectados y no aplicados
- Los `<select>` de estado/etapa de `CandidateForm` repiten las mismas listas de opciones que los filtros (podrían compartir constantes).
- El patrón *cargar-detalle + estados de error* se repite en `candidates/[id]/page.tsx` y `candidates/[id]/edit/page.tsx`.
