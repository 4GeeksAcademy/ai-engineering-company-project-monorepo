# 📘 Aprendiendo con la IA — Auditoría de rendimiento (Lighthouse)

> **Estudiante:** INES
> **Proyecto:** Nexova — sitio corporativo (`uis/website`, Vite + React) y backoffice (`uis/backoffice`, Next.js)
> **Qué es este documento:** el diario de la auditoría de rendimiento. Aquí está **cómo se hizo, qué decisiones se tomaron y cómo se resolvieron los problemas**, incluidos los **errores que cometí yo** por el camino, porque es de ellos de donde más se aprende.
> Los entregables oficiales para el CTO son [`AUDIT.md`](./AUDIT.md) y [`REPORT.md`](./REPORT.md). Este cuaderno es el complemento para estudiar. Continúa a [`aprendiendo con la ia - AUTH-02.md`](./aprendiendo%20con%20la%20ia%20-%20AUTH-02.md).

---

## 📑 Índice

1. [El encargo, en palabras sencillas](#1-el-encargo-en-palabras-sencillas)
2. [Conceptos que necesitas antes de empezar](#2-conceptos-que-necesitas-antes-de-empezar)
3. [El método: medir → analizar → corregir → volver a medir](#3-el-método)
4. [Paso a paso: qué se hizo](#4-paso-a-paso-qué-se-hizo)
5. [Las decisiones importantes (y por qué)](#5-las-decisiones-importantes-y-por-qué)
6. [Problemas y errores, y cómo se resolvieron](#6-problemas-y-errores-y-cómo-se-resolvieron)
7. [Resultados](#7-resultados)
8. [Archivos que se tocaron](#8-archivos-que-se-tocaron)
9. [Cómo repetirlo tú](#9-cómo-repetirlo-tú)
10. [Glosario](#10-glosario)
11. [Ejercicios para practicar](#11-ejercicios-para-practicar)
12. [Segunda parte: revisar mi trabajo contra la rúbrica](#12-segunda-parte-revisar-mi-trabajo-contra-la-rúbrica)
13. [Tercera parte: prerender del website](#13-tercera-parte-prerender-del-website)
14. [Cuarta parte: rehacer el historial y cumplir la rúbrica](#14-cuarta-parte-rehacer-el-historial-y-cumplir-la-rúbrica)

---

## 1. El encargo, en palabras sencillas

El CTO pidió que el sitio corporativo y el backoffice fueran **rápidos, medibles y mantenibles** (no «más bonitos»). Había que:

1. **Medir** con Lighthouse *antes* de tocar nada.
2. **Revisar el código** buscando lógica duplicada que se pueda reutilizar.
3. **Instalar skills de agente** (guías para la IA) sobre rendimiento web y usarlas.
4. **Corregir** lo que la evidencia señale.
5. **Volver a medir** y comparar.
6. Entregar `AUDIT.md`, `REPORT.md` y capturas de Lighthouse antes/después, con commits.

> 💡 **La idea clave del encargo:** «El objetivo no es un 100 perfecto. El objetivo es un ciclo de mejora documentado y basado en evidencia.» Fíjate en que *no* dice «llega a 100».

---

## 2. Conceptos que necesitas antes de empezar

### 🔦 Qué es Lighthouse

Una herramienta de Google que carga **una página** en un Chrome controlado y la puntúa de 0 a 100 en cuatro categorías: **Performance, Accessibility, Best Practices y SEO**. Ojo: mide **una página a la vez**, no toda la aplicación. Por eso hay que elegir bien *qué* páginas medir (las más pesadas o más usadas).

### 📏 Las métricas de rendimiento (Core Web Vitals)

| Métrica | Qué mide (con un ejemplo cotidiano) | Bueno |
|---|---|---|
| **LCP** (Largest Contentful Paint) | Cuánto tarda en verse lo principal. *Es la sensación de «ya ha cargado».* | < 2,5 s |
| **CLS** (Cumulative Layout Shift) | Cuánto «se mueve» el contenido mientras carga. *Es cuando vas a pulsar un botón y la página salta.* | < 0,1 |
| **INP** (Interaction to Next Paint) | Cuánto tarda en responder cuando pulsas algo. | < 200 ms |
| **TBT** (Total Blocking Time) | Cuánto rato está «atascado» el navegador al cargar. Es el sustituto de laboratorio del INP. | < 200 ms |
| **TTFB** | Tiempo hasta que el servidor empieza a responder. | < 800 ms |

### 🧪 Datos de laboratorio vs. datos reales

Lighthouse es **laboratorio**: un entorno controlado y repetible. Los datos **de campo** (RUM, CrUX) vienen de usuarios reales y son los que Google usa para posicionar. El laboratorio sirve para *comparar antes/después*; no dice cuánto tardará de verdad en tu producción.

### 🧱 Cosas que aparecen en el código

- **SPA** (*Single Page Application*): el HTML inicial está vacío (`<div id="root">`) y JavaScript pinta todo. El website corporativo es así.
- **Skeleton** (esqueleto): un hueco con la forma de lo que va a llegar, para que la página no salte cuando llegue.
- **Custom Hook**: una función de React que empieza por `use…` y guarda lógica reutilizable (estado + efectos).
- **Prefetch**: cargar por adelantado la página a la que enlaza un `<Link>` de Next.js.

---

## 3. El método

```
   MEDIR ──► ANALIZAR ──► CORREGIR ──► VOLVER A MEDIR
     ▲                                       │
     └───────────────────────────────────────┘
```

Reglas que apliqué (valen para cualquier tarea de rendimiento):

1. **Medir antes de tocar.** Sin línea base no hay forma de demostrar que algo mejoró.
2. **Misma herramienta, mismo método, antes y después.** Si cambias cómo mides, no puedes comparar.
3. **Varias ejecuciones y la mediana.** Una sola ejecución de Lighthouse varía mucho.
4. **Buscar la causa raíz, no el síntoma.** Lighthouse decía «hay un `<div>` que se mueve»; la causa eran *tres* cosas distintas.
5. **Un cambio, un motivo, un commit.**
6. **Desconfiar de mis propios resultados.** Es lo que más me evitó errores (ver §6).
7. **Documentar también lo que NO funcionó.**

---

## 4. Paso a paso: qué se hizo

### 4.1 Explorar antes de actuar

Leí el repo: dos frontends distintos (**Vite** el website, **Next.js** el backoffice), cómo arrancan y cómo se autentican. Y un aviso importante en `uis/backoffice/AGENTS.md`: *«Esta versión de Next.js tiene cambios incompatibles, lee la documentación en `node_modules/next/dist/docs/` antes de escribir código»*. Por eso, antes de usar `prefetch` o `robots`, **leí la documentación de esa versión** en vez de fiarme de mi memoria.

### 4.2 Montar el entorno de medición

- Instalé **Chromium** con Playwright y **Lighthouse** *fuera del repo* (en una carpeta temporal) para no ensuciar el proyecto con dependencias de medición.
- Levanté la **API** con los 96 incidentes de ejemplo y compilé ambas apps **en modo producción** (`vite build`, `next build`). *Medir `next dev` no vale:* es mucho más lento y no representa lo que ven los usuarios.
- Escribí `scripts/lighthouse-audit.mjs`: ejecuta Lighthouse 3 veces, guarda la **mediana**, y para las páginas privadas **inicia sesión antes**.

### 4.3 La línea base (antes de cambiar una línea)

| Página | Perf | Access | BP | SEO | Lo llamativo |
|---|---:|---:|---:|---:|---|
| Website `/` | 100 | 100 | 96 | 92 | `robots.txt` inválido, 404 de favicon |
| Backoffice `/incidents` | **87** | 94 | 100 | 100 | **CLS 0,255** |
| Backoffice `/suppliers` | **83** | 96 | 100 | 100 | **CLS 0,351** |

> 💡 **Primera lección:** la web **ya cargaba rápido**. El problema no era la velocidad, era que *el contenido se movía*. Si hubiera empezado a «optimizar velocidad» por intuición, habría perdido el tiempo.

### 4.4 Revisar el código buscando duplicación

Con `grep` busqué qué se repetía. Encontré (todo en `AUDIT.md` §3, P8):

- `inputClass` (estilos de un campo) **definido 5 veces**, y **las copias habían divergido** (el borde de error era de tres colores distintos según el archivo).
- La caja roja de error escrita a mano **7 veces**, aunque ya existía un componente `ErrorBanner`.
- «Cargar datos al montar + loading + error + reintentar» escrito dos veces igual.
- «Spinner + Cargando…» copiado en 6 vistas.
- En el website, el email repetido 3 veces y cada teléfono 2.

### 4.5 Instalar y revisar las skills

Instalé `core-web-vitals` y `performance` (de `addyosmani/web-quality-skills`) y `web-perf` (de `cloudflare/skills`). El propio instalador avisa: *«Revisa las skills antes de usarlas; corren con permisos completos del agente»*. Así que **las leí enteras** antes de seguirlas: son solo documentos Markdown, sin scripts. Dos ideas de `web-perf` guiaron mis decisiones:

- *«Cuantifica el impacto. No priorices cambios con 0 ms de impacto.»*
- *«Un sitio con LCP de 200 ms y CLS 0 ya es excelente: dilo.»*

Y de `core-web-vitals`: para el CLS, no te fíes de qué elemento «se ve afectado»; usa un observador de `layout-shift` con `previousRect`/`currentRect` para ver **qué lo provoca**.

### 4.6 Corregir, de uno en uno

Por orden de impacto, un commit por tema (detalle en `REPORT.md` §3):

1. **CLS del backoffice** (el que movía la nota): esqueleto del panel de resumen + espacio reservado en las tablas + barra lateral fija.
2. **Accesibilidad**: contraste, orden de encabezados, nombre accesible de un botón, enlaces subrayados.
3. **Favicon, `robots.txt` y `sitemap.xml`**, y quitar el prefetch masivo de filas.
4. **Refactor de duplicación**: `Field.tsx` movido a `ui/`, `ErrorBanner`, `LoadingState`, hook `useAsyncResource` (con sus pruebas), y partir el `App.tsx` del website.

### 4.7 Volver a medir… y desconfiar

Aquí pasó lo más instructivo (siguiente sección).

---

## 5. Las decisiones importantes (y por qué)

| Decisión | Por qué |
|---|---|
| **Perfil móvil para el website, escritorio para el backoffice** | El SEO se juzga «mobile-first»; el backoffice es una herramienta interna que se usa en ordenador. Documentado en `AUDIT.md`. |
| **Medir producción, no `dev`** | Es lo que ven los usuarios. |
| **Mediana de 3 ejecuciones** | Una sola varía demasiado. |
| **Reservar espacio en vez de «hacer más rápido»** | La causa del CLS era contenido que llegaba sin hueco reservado; la velocidad no era el problema. |
| **Esqueleto con alturas medidas, no inventadas** | Medí las tarjetas reales (126 y 330 px) con Playwright para que el hueco coincida. |
| **`opacity-80` y no cambiar el diseño de «suspendido»** | Mantener la señal visual de «atenuado» pero cumpliendo el contraste 4,5:1. Calculé el contraste (≈ 4,9). |
| **No tocar la home del website más allá de SEO/a11y** | Ya puntuaba 100. Cambiarla «por si acaso» solo añade riesgo. |
| **No «arreglar» el JS heredado del backoffice** | Verifiqué en la documentación de Next que ya apunta a navegadores modernos: ese código es del framework. |
| **Prerenderizar el website (decisión que cambié)** | Primero lo dejé fuera por miedo a «reestructurar la arquitectura». Después lo reconsideré: el objetivo del CTO es el SEO del sitio, la corrección es dirigida (no cambia componentes, rutas, estado ni Vite), la skill la marca como requerida y puede quitarse fácilmente (son dos commits propios). Está incluido; ver §13 y §14. |
| **Dejar la decisión de `noindex` al equipo** | Es una decisión de despliegue (¿la herramienta está en red privada?), no mía. |
| **Mover `Field.tsx` a `components/ui/`** | Lo usaban inventario, login y proveedores: su sitio natural no es la carpeta de «incidents». |
| **No forzar todas las vistas en el hook nuevo** | `InventoryOrdersPage` carga dos fuentes e `IncidentDetailPage` distingue un 404; meterlas haría el hook más difícil de leer. |

---

## 6. Problemas y errores, y cómo se resolvieron

> Esta es la parte más valiosa del documento. Cada error me enseñó una regla.

### 🔴 Problema 1: la primera medición «autenticada» medía el login

**Qué pasó:** medí `/incidents`, `/suppliers` y `/` con sesión y salieron **resultados casi idénticos** (Performance 100 en todas, sin CLS).
**Cómo lo detecté:** en el informe, el elemento LCP era *«¿No tienes cuenta?»* (un texto de la pantalla de login) y las peticiones incluían `login?next=%2Fincidents`. Lighthouse había sido **redirigido al login**.
**Causa:** inicié sesión con `browser.newPage()` de Playwright, que crea un contexto **aislado**; Lighthouse usa el contexto **por defecto** y no veía el token.
**Solución:** `launchPersistentContext` (inicia sesión en el contexto por defecto) y una **salvaguarda**: el script **aborta** si pides una página protegida y Lighthouse acaba en `/login`.
**Regla:** *cuando varios resultados «distintos» salen casi iguales, sospecha de la medición, no te alegres.*

### 🔴 Problema 2: el script se quedaba colgado

**Qué pasó:** la medición no terminaba; había un Chrome vivo pero ningún Lighthouse.
**Causa:** usé `spawnSync` (que **bloquea** Node) mientras Playwright, en el mismo proceso, tenía que leer de la tubería de Chrome. La tubería se llenaba y Chrome se bloqueaba (un **interbloqueo**).
**Solución:** `spawn` asíncrono con una `Promise`.
**Regla:** *no bloquees el bucle de eventos de un proceso que sirve de intermediario de otro.*

### 🟠 Problema 3: el CLS tenía tres causas, y ninguna era la «obvia»

Lighthouse solo decía «hay un `<div>` que se mueve». Con el observador de `layout-shift` vi:

1. En `/incidents`, el panel de resumen (480 px) se **insertaba encima** de los filtros y la tabla al llegar la API (+512 px).
2. En `/suppliers`, **React reutilizaba el mismo `<div>`** para «Cargando…» (24 px) y la tabla (740 px): el contenedor *crecía*.
3. La **barra lateral medía lo que la página**, así que su bloque de usuario «caía» fuera de pantalla al cargar una tabla larga.

**Regla:** *el elemento que ves moverse suele ser la víctima, no el culpable.*

### 🟠 Problema 4: «optimicé» y empeoró (carga diferida del formulario)

**Qué hice:** separé el formulario de `/talento` con `React.lazy` para aligerar la home.
**Qué midió Lighthouse:** `/talento` pasó de LCP 1423 a 1672 ms (Performance 100 → 99). El chunk se pide *después* de ejecutar el script principal (una «cascada» de red), y esa es justo la página que lo necesita. A cambio ahorraba **0,7 KB** en la home.
**Decisión:** **revertir.** Dejé el formulario en su propio archivo (mejor mantenimiento) pero cargado normalmente. Guardé la medición como evidencia.
**Regla:** *una optimización «que parece lógica» no vale hasta que la mides.*

### 🟠 Problema 5: el SEO del backoffice cayó de 100 a 63 (por mi culpa)

**Qué pasó:** añadí `noindex` y `robots` al backoffice «por buena práctica». Lighthouse lo leyó como «página bloqueada para indexar».
**Reflexión:** nadie lo había pedido, y decidir si una herramienta interna es indexable es una **decisión de despliegue**, no de quien audita rendimiento.
**Solución:** lo **revertí** y lo dejé como recomendación en `REPORT.md`.
**Regla:** *no amplíes el alcance sin que lo pida la evidencia; si algo es una decisión de otros, proponla, no la impongas.*

### 🟡 Problema 6: ¿el LCP empeoró o es ruido?

**Qué pasó:** la ronda final dio LCP más alto en el backoffice (404 → 581 ms). Las ejecuciones de la línea base eran muy estables (387/404/399) y las nuevas no.
**Lo que NO hice:** decir «es ruido» sin comprobarlo.
**Lo que hice:** una comparación **A/B**: compilé el código de la línea base en otra carpeta, lo serví en otro puerto y medí **alternando** ambos builds. Resultado: los rangos se solapan (415 ms vs 431 ms en incidencias; 395 vs 398 en proveedores). Era **deriva de la máquina**.
**Dos detalles técnicos que me encontré montándolo:** Turbopack rechazó un enlace simbólico a `node_modules` («apunta fuera de la raíz») → tuve que **copiar** la carpeta; y al limpiar maté el proceso por *nombre* y no se murió → lo paré **por puerto**.
**Regla:** *si un dato te preocupa, diseña la comparación que lo resuelva (A/B alterno), no lo expliques de memoria.*

### 🟡 Problema 7: Jest en verde, pero `tsc` encontró un error

Al mover `Field.tsx` olvidé importar `inputClass` en `IncidentFilters`. **Jest pasó** (no comprueba tipos), pero `tsc --noEmit` lo detectó al momento.
**Regla:** *ejecuta siempre las pruebas **y** el comprobador de tipos; cada uno ve cosas que el otro no.*

### 🟡 Problema 8: contraste que seguía fallando

Tras cambiar `slate-500` por `slate-400`, `/suppliers` seguía fallando contraste. El color calculado (`#5f6b7f`) **no era** `slate-400`: la **fila entera** de un proveedor suspendido tenía `opacity-60`, que lo atenuaba hasta 3,3:1. Solución: `opacity-80` (≈ 4,9:1).
**Regla:** *mira el color **calculado** del elemento, no solo la clase que crees que tiene.*

### 🟡 Problema 9: cifras que corregí al releerlas

- Dije «caja de error escrita 8 veces»: eran **7**. Corregido en documentos *y* en el mensaje del commit (con un `rebase` para reescribirlo, porque aún no estaba publicado).
- Dije «el prefetch generaba 15 peticiones»: medido, fueron **10 menos** (28 → 18), porque Lighthouse solo ve las filas que entran en pantalla.
**Regla:** *si publicas una cifra, que sea la que mediste, no la que «debería» ser.*

### 🟢 Problema 10: un E2E fallaba… por el entorno

`e2e:guard` falló al final con `ERR_CONNECTION_REFUSED` en `localhost:5173`. No era mi código: el test comprueba que el website público sigue abierto y yo lo tenía en otro puerto. Lo levanté en 5173 y pasó **completo**. (Y de paso validó que el `App.tsx` refactorizado del website funciona.)

---

## 7. Resultados

| Página | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Website `/` | 100 → 100 | 100 → 100 | 96 → **100** | 92 → **100** |
| Website `/talento` | 100 → 100 | 95 → **100** | 96 → **100** | 92 → **100** |
| Backoffice `/login` | 100 → 100 | 91 → **100** | 96 → **100** | 100 → 100 |
| Backoffice `/` | 100 → 100 | 95 → **100** | 100 → 100 | 100 → 100 |
| Backoffice `/incidents` | **87 → 100** | 94 → **100** | 100 → 100 | 100 → 100 |
| Backoffice `/suppliers` | **83 → 100** | 96 → **100** | 100 → 100 | 100 → 100 |

- **CLS**: 0,255 → 0,014 (incidencias) y 0,351 → 0 (proveedores).
- **LCP:** en el backoffice, sin cambio. En el website móvil baja ≈ 100–130 ms (1418 → 1290 ms en la home), y **solo por el CSS inline**; el prerender por sí solo no lo mueve (§13).
- **550 pruebas Jest** (8 nuevas), `tsc` limpio, **149 comprobaciones E2E del backoffice** y **24 del website** (nuevas) sin fallos, sobre el historial definitivo.
- **25 commits de un solo problema**, con Lighthouse medido tras cada uno (`REPORT.md` §2.2).

---

## 8. Archivos que se tocaron

| Qué | Dónde |
|---|---|
| Entregables | `AUDIT.md`, `REPORT.md`, `audit/before/` y `audit/after/` (capturas), `docs/performance/` (JSON, resúmenes A/B, por commit e INP) |
| Scripts de medición | `scripts/lighthouse-audit.mjs`, `scripts/lighthouse-screenshot.mjs`, `scripts/inp-measure.mjs` |
| Skills instaladas | `.claude/skills/{core-web-vitals,performance,web-perf}`, `skills-lock.json` |
| Backoffice (nuevo) | `components/ui/LoadingState.tsx`, `lib/useAsyncResource.ts` (+ test), `app/icon.svg`, `IncidentSummarySkeleton` |
| Backoffice (movido) | `components/incidents/Field.tsx` → `components/ui/Field.tsx` |
| Backoffice (editado) | las vistas con tablas, `Layout.tsx`, `SupplierRow.tsx`, `IncidentTable.tsx`, `jest.config.mjs` y ~15 archivos de estilos |
| Website (nuevo) | `content.ts`, `components.tsx`, `seo.ts`, `TalentForm.tsx`, `public/{robots.txt,sitemap.xml,favicon.svg}`, `entry-server.tsx`, `scripts/prerender.mjs`, `e2e/website.e2e.mjs` |
| Website (reescrito) | `App.tsx` (y unas líneas en `main.tsx`) |

---

## 9. Cómo repetirlo tú

Los comandos completos están en `REPORT.md` §8. La idea:

```bash
node scripts/lighthouse-audit.mjs <url> <etiqueta> 3         # 3 ejecuciones, guarda la mediana
LH_PRESET=desktop LH_LOGIN_URL=... LH_EMAIL=... LH_PASSWORD=... \
  node scripts/lighthouse-audit.mjs <url-privada> <etiqueta> 3   # con sesión
```

Para ver los `layout-shift` tú misma, pega en la consola del navegador el observador de la skill `core-web-vitals` (`references/CLS.md`) y recarga la página.

---

## 10. Glosario

| Término | Significado |
|---|---|
| **Lighthouse** | Herramienta de Google que puntúa una página en 4 categorías. |
| **LCP / CLS / INP / TBT / TTFB** | Métricas de carga, estabilidad, interactividad, bloqueo y servidor (§2). |
| **Layout shift** | El contenido se mueve mientras carga. |
| **Skeleton** | Hueco con la forma del contenido que llegará; evita saltos. |
| **Mediana** | El valor del medio al ordenar; resiste a los valores raros mejor que la media. |
| **A/B** | Comparar dos versiones en las mismas condiciones, alternándolas. |
| **Prefetch** | Cargar por adelantado lo que probablemente se visitará. |
| **SPA** | Aplicación cuyo HTML inicial está vacío y se pinta con JavaScript. |
| **Prerender / SSG** | Generar el HTML con contenido en el *build*, no en el navegador. |
| **RUM** | *Real User Monitoring*: medir con usuarios reales. |
| **WCAG** | Normas internacionales de accesibilidad (AA = el nivel habitual). |
| **Custom Hook** | Función `use…` de React con lógica reutilizable. |
| **Interbloqueo (deadlock)** | Dos partes esperan una a la otra y ninguna avanza (§6, problema 2). |

---

## 11. Ejercicios para practicar

1. **Mide tú** `/incidents` antes y después de quitar el `IncidentSummarySkeleton` (cámbialo temporalmente). ¿Qué CLS sale?
2. **Encuentra la causa** de un layout shift en otra página con el observador de `layout-shift`. ¿Qué elemento es el *culpable* y cuál la *víctima*?
3. **Calcula** el contraste de `#64748b` sobre `#0f172a` con una calculadora WCAG. ¿Cumple 4,5:1? ¿Y `#94a3b8`?
4. **Predicción:** si volvieras a cargar el formulario con `React.lazy` pero con `<link rel="modulepreload">`, ¿mejoraría el LCP de `/talento`? Pruébalo y mide.
5. **Refactor:** `InventoryOrdersPage` carga dos fuentes. ¿Podrías extender `useAsyncResource` para soportarlo sin volverlo ilegible? ¿Merece la pena?
6. **Reflexiona:** ¿por qué la skill dice «no priorices cambios con 0 ms de impacto»? ¿Qué cambio de esta auditoría habrías descartado por esa regla?
7. **Investiga:** ¿qué tendría que cambiar en `App.tsx` del website para poder prerenderizarlo (pista: `window` en `currentPath`)?

---

## 12. Segunda parte: revisar mi trabajo contra la rúbrica

> Cuando me pasaste la lista literal de lo que pedía el trabajo, **no di por bueno mi resumen anterior**: lo contrasté punto por punto. Encontré seis huecos. Esto es lo que aprendí.

### 12.1 Qué faltaba y cómo lo resolví

| Hueco | Solución |
|---|---|
| Las capturas debían estar en `/audit/before/` y `/audit/after/`; yo las tenía en `docs/performance/screenshots/` | `git mv` (conserva el historial) y actualicé todas las referencias |
| El website debía medirse en **escritorio y móvil**; solo había medido móvil | Medí ambos modos, antes y después, con la **misma versión de Lighthouse** |
| Debía **ejecutar las skills** sobre ambos frontends y registrar sus correcciones; yo las había leído y aplicado su criterio, pero no lo había documentado | Sección nueva en `AUDIT.md` con lo que identifican, separado en **requeridas** y **sugerencias**, y qué se hizo con cada una |
| Debía medir **INP**, no usar TBT como sustituto | Script propio (`scripts/inp-measure.mjs`) con interacciones reales y la API Event Timing |
| «Un problema por commit y volver a medir tras **cada** cambio»: había medido por rondas | Compilé y medí cada commit por separado (medición retroactiva, y lo digo) |
| Faltaba, por cada caso de duplicación, **cómo quedaría la abstracción** | Reescribí el apartado con cinco casos: dónde, por qué y el código resultante |

### 12.2 Lecciones

**🟠 Una skill puede pedir algo que el enunciado parece prohibir.**
`core-web-vitals` exige que el LCP esté en el HTML inicial (en una SPA, prerenderizar). El enunciado dice *«no reestructures la arquitectura»*. En esta primera pasada **gané el enunciado** y dejé la mejora en una rama aparte. Más tarde reconsideré la decisión (§14): al leer con calma, el prerender es una corrección dirigida, no una reescritura, y el objetivo del CTO es el SEO.
*Regla:* *cuando dos instrucciones chocan, no elijas en silencio: documenta el conflicto, y vuelve a pensarlo cuando tengas más información.*

**🟠 Las skills no etiquetan «requerida/sugerencia».**
Antes de decidir qué aplicar, escribí **mi criterio**: requerida = incumple un umbral medido o una regla WCAG verificada; sugerencia = elemento de lista sin problema medido. Con eso, la mayoría de las «buenas prácticas» de la skill (preload, AVIF, `font-display`) resultaron **no aplicables**: la app no tiene imágenes, ni fuentes web, ni scripts de terceros (lo comprobé con `grep`).
*Regla:* *define el criterio antes de decidir, y comprueba que el consejo aplica a tu código.*

**🟢 Medir cada commit permite atribuir el impacto.**
Resultado: solo el commit de reservar espacio movió Performance; los de refactor no movieron nada (era lo esperado); y un commit mío (`noindex`) **empeoró** el SEO del backoffice a 63 hasta que lo revertí. Sin la tabla por commit no se vería.
*Y una trampa:* el LCP de `/incidents` dio 523 ms en un commit y 349 ms en el final, que **contiene ese mismo código**. El LCP de una sola medición varía hasta ~170 ms: por eso no se compara por commit.
*Regla:* *atribuye cada cambio a una medición, y desconfía de las métricas que fluctúan sin cambiar el código.*

**🔴 Un bug en mi propio script de INP.**
Apliqué el frenado de CPU **después** de ejecutar las interacciones (y con ratio 1, o sea, sin frenar). Lo vi al releer el código antes de lanzar la medición y lo corregí: el frenado debe activarse tras la carga y antes de interactuar.
*Regla:* *relee tu herramienta de medida con tanto cuidado como el código que mides.*

**🔴 El entorno temporal se borró dos veces.**
Entre sesiones desaparecieron Lighthouse, el entorno de la API y el directorio de trabajo. Solución: poner las herramientas en `~/.cache/perf-audit/`, que sí sobrevive, y **comprobar que la versión de Lighthouse es la misma** (12.8.2) antes de volver a medir.
*Regla:* *no confíes en que lo temporal siga ahí; y si vuelves a medir, verifica que la herramienta es la misma.*

**🟡 Probar el INP me hizo encontrar un fallo real que no buscaba.**
En móvil, el menú desplegable del website queda **tapado por el contenido de la home** (probablemente un `z-10` contra otro `z-10`): el enlace «Talento» se solapa con un texto y el clic no llega. Ya estaba en el código original. No es de rendimiento, así que **lo documenté y no lo corregí** (decisión del equipo).
*Regla:* *un hallazgo fuera de alcance se anota y se comunica; no se arregla en silencio ni se ignora.*

**🟡 Las pruebas con efectos secundarios ensucian el entorno de medida.**
Una prueba E2E anterior había añadido un proveedor, así que en la segunda sesión la tabla tenía 16 filas en vez de 15, y la línea base cambió un poco (CLS 0,351 → 0,388, misma causa). Lo verifiqué contra la API antes de afirmarlo.
*Regla:* *deja el entorno como lo encontraste, o anota en qué se diferencia.*

**🟡 Dos cifras más que corregí al releer.** El email aparecía 3 veces en el website, pero cada teléfono solo 2. Una imprecisión pequeña, pero en un documento técnico cada número debe poder comprobarse.

### 12.3 Ejercicios

1. En `REPORT.md` §2.2, ¿qué commit subió Performance y cuáles no? ¿Por qué los de refactor no la mueven?
2. Escribe tu propio criterio «requerida / sugerencia» para otra skill de la lista de `skills.sh` y aplícalo a un archivo de tu código.
3. Abre `scripts/inp-measure.mjs` y cambia el frenado de CPU a ×1 y ×6. ¿Cómo cambia el INP? ¿Qué te dice sobre el dispositivo del usuario?
4. Reproduce el hallazgo del menú móvil: abre el website a 412 px de ancho, despliega el menú e intenta pulsar «Talento». ¿Qué `z-index` cambiarías y por qué?

---

## 13. Tercera parte: prerender del website

> Era la mejora de SEO más valiosa y la que Lighthouse no puede ver. Primero la dejé en una rama aparte; al final está incluida en la entrega (§14).

### 13.1 El problema, con un ejemplo

El website es una **SPA**: el navegador recibe `<div id="root"></div>` y *después* JavaScript pinta todo. Google ejecuta JavaScript, pero otros (la vista previa de un enlace en LinkedIn o Slack, algunos buscadores) leen **solo el HTML inicial** y ven una página vacía.

**La solución:** en el *build*, generar el HTML ya con el contenido (**prerender / SSG**) y, en el navegador, **hidratar**: React se «engancha» al HTML existente en vez de pintarlo de nuevo.

### 13.2 Cómo se hizo

1. `App` acepta una prop `initialPath` (en el servidor no existe `window`, así que no puede leer la URL).
2. `entry-server.tsx` exporta `render(ruta)` con `renderToString`.
3. `scripts/prerender.mjs` renderiza `/` y `/talento` y escribe `dist/index.html` y `dist/talento/index.html`, cada uno con **su** título, descripción y canonical.
4. `main.tsx` hidrata el HTML existente.
5. `npm run build` hace ahora tres pasos: cliente → servidor → prerender.

### 13.3 Qué aprendí (problemas y reglas)

**🔴 Un error real al probar: React #418 (fallo de hidratación).**
`vite preview` responde a `/talento` (sin barra final) con el HTML de **la home**, así que React intentaba engancharse a un HTML que no correspondía a la ruta.
*Solución:* cada página prerenderizada lleva `data-route="/talento"` y `main.tsx` **solo hidrata si coincide con la URL**; si no, pinta desde cero (lo que hacía antes).
*Regla:* *una optimización no debe poder romper la app si el entorno no es el ideal; diseña la degradación, no solo el caso feliz.*

**🟠 «Lo hice y Lighthouse no se movió».**
Con 3 ejecuciones, el prerender por sí solo **no cambió el LCP** (1431 → 1418 ms en la home móvil): la primera pintura esperaba al CSS (bloqueante), no al contenido.
*Regla:* *una mejora puede ser valiosa aunque la herramienta de medida no la vea. Dilo así: «mejora el SEO, no la nota».*

**🟢 Una decisión que cambió con los datos.**
En la auditoría descarté inlinar el CSS («perdería la caché»). Con el prerender el contexto cambia: el HTML ya tiene contenido, así que quitar la espera del CSS **sí** adelanta la pintura. Medido con 3 ejecuciones: **LCP 1418 → 1290 ms en la home móvil (−9 %)** y 1415 → 1312 ms en `/talento`; en escritorio casi nada. A cambio, +11 KB de HTML y el CSS no se cachea entre las dos páginas.
*Regla:* *una decisión es válida para un contexto; si el contexto cambia, reevalúala. Y apunta el coste, no solo el beneficio.*

**🟡 Lighthouse no sabe de esto, así que lo comprobé a mano.**
Con Playwright cargué la página **con JavaScript desactivado** (lo que ve un rastreador sencillo): `<h1>`, 214 palabras, JSON-LD y metadatos correctos; y `/talento/` con los suyos. También comprobé que la navegación en cliente sigue cambiando título y canonical, y que no hay errores de hidratación.
*Regla:* *cuando la herramienta no mide lo que te importa, diseña tu propia comprobación.*

**🟡 ¿El INP empeoró por el prerender?**
Subió de 64 a 80 ms. En vez de culpar a la hidratación sin más, medí el INP en cada estado (5 repeticiones): **ya había subido a 72 ms antes del prerender**, y las diferencias (8–16 ms) están al nivel de la resolución de la API (8 ms). No es atribuible al prerender, y todo sigue muy por debajo de 200 ms.
*Regla:* *antes de atribuir un cambio a una causa, mide justo antes y justo después de esa causa.*

### 13.4 Lo que queda por comprobar (no depende de mí)

- **El hosting:** `/talento` debe resolver a `talento/index.html` (índice de directorio; nginx `try_files`, Netlify y Vercel lo hacen). No se pudo comprobar en un hosting real.

### 13.5 Ejercicios

1. Abre `dist/index.html` y localiza el `<div id="root" data-route="/">`. ¿Qué pasaría si borraras ese atributo?
2. Desactiva JavaScript en tu navegador y visita la home de producción **antes** y **después** del prerender. ¿Qué cambia?
3. Mide el LCP con el CSS inline y sin él. ¿Con cuántas páginas dejaría de compensar el inlinado?
4. ¿Por qué `vite dev` no prerenderiza y qué hace `main.tsx` en ese caso?

---

## 14. Cuarta parte: rehacer el historial y cumplir la rúbrica

> Me pasaste los criterios de evaluación y la forma de entrega y me dijiste: *«quiero que mi trabajo cumpla con lo que pide el proyecto»*. Eso cambió el listón: ya no bastaba con justificar las desviaciones, había que **corregirlas**.

### 14.1 Qué decidí cambiar, y por qué

| Antes | Ahora | Razón |
|---|---|---|
| El prerender estaba en una rama aparte, fuera de la entrega | **Incluido**, en dos commits propios | La skill lo marca como requerido, el objetivo del CTO es el SEO y la evaluación habla de problemas de hidratación. Es una corrección dirigida, no una reescritura, y es fácil de quitar |
| Commits que agrupaban varios problemas | **25 commits de un solo problema** (con 3 excepciones razonadas) | El enunciado pide «un problema por commit» |
| Lighthouse medido por rondas | **Medido tras cada commit** | El enunciado pide volver a medir tras cada cambio |

### 14.2 Cómo rehice el historial sin perder nada

El historial aún no estaba publicado, así que podía reescribirse. Guardé el trabajo anterior en ramas de respaldo y rehice el historial desde la línea base **reaplicando las mismas operaciones** en commits separados. La comprobación clave: **el código resultante es idéntico al anterior** (`git diff` entre ambos árboles, vacío). Eso garantiza que las 4 verificaciones que ya habían pasado siguen valiendo; aun así, las repetí sobre el historial nuevo (550 pruebas Jest, `tsc`, 149 + 24 comprobaciones E2E).
*Regla:* *cuando reorganizas código que ya funcionaba, demuestra que el resultado es idéntico; no confíes en que lo sea.*

### 14.3 Problemas y lecciones de esta parte

**🔴 Un error silencioso que me hizo perder 20 minutos.**
Mi guion instalaba mal las dependencias de la API (`requirements.txt` lleva una ruta relativa que solo resuelve desde `services/api`) y **silenciaba los errores**. Sin API, todas las mediciones autenticadas fallaron por tiempo.
*Arreglo:* instalar desde el directorio correcto, **abortar si la API no responde al login** y registrar los fallos. *Regla:* *un guion de medida debe fallar ruidosamente, nunca en silencio.*

**🔴 Las tareas en segundo plano se mataban al reiniciarse la sesión.**
Tres veces. Soluciones: hacer el guion **reanudable** (marca de «hecho» por estado), lanzarlo **desacoplado** (`setsid nohup`) para que sobreviva, y guardar las herramientas en una carpeta que no se borra.
*Regla:* *si una tarea larga puede interrumpirse, diséñala para poder retomarla.*

**🟠 «¿Por qué tardas tanto?»**
Tenías razón en preguntarlo. Eran 25 commits × (compilar + Lighthouse 3 veces por página) más mis errores. Lo acorté con un cambio de método **justificado y documentado**: 1 ejecución por página en los commits intermedios, porque las puntuaciones y el CLS habían salido idénticos en todas las ejecuciones anteriores. Consecuencia que dejé a la vista: con 1 ejecución aparecen valores sueltos (Performance 96 y 99) que son ruido.
*Regla:* *recortar el método para ir más rápido es válido si dices qué pierdes.*

**🟢 La línea base se reprodujo.**
Con la base de datos limpia (15 proveedores), las puntuaciones iniciales coinciden exactamente con las de la primera medición (87 con CLS 0,255; 83 con CLS 0,351). Que una medición sea reproducible es lo que la hace creíble.

**🟡 Cada commit atribuye su efecto.**
La tabla por commit (`REPORT.md` §2.2) muestra, por ejemplo, que `/suppliers` no llega a 100 en Accessibility hasta el commit de la opacidad de las filas, o que un commit mío (`noindex`) empeoró el SEO a 63 hasta que lo revertí.

### 14.4 Ejercicios

1. Ejecuta `git log --oneline faf2569..HEAD`. Elige tres commits y explica en una frase qué **único** problema resuelve cada uno.
2. En `REPORT.md` §2.2, localiza el commit que sube `/suppliers` de 83 a 100. ¿Cuál es su causa raíz?
3. Mi guion de medición silenció un error de `pip`. ¿Cómo lo habrías diseñado para que fallara ruidosamente?
4. Si el instructor opina que el prerender «reestructura la arquitectura», ¿qué dos commits quitarías y qué pasaría con las puntuaciones?
