# CACHING_REPORT — Optimización de caching (rama `feature/caching-optimisation`)

Informe técnico para el tech lead y el equipo: qué se midió, qué se cacheó, durante cuánto tiempo, cómo se invalida, y qué se decidió **no** cachear. Toda cifra sale de una medición reproducible (sección 8); las estimaciones están marcadas como tales.

## 1. Resumen

| | Antes | Después |
|---|---|---|
| `GET /inventory/orders` (30 000 órdenes, 9,8 MB) | **914 ms** | **20 ms** (HIT) |
| `GET /api/incidents/summary` (8 000 incidencias) | **99 ms** | **2,0 ms** |
| `GET /api/incidents/facets` | **79 ms** | **1,8 ms** |
| `GET /api/incidents?page=1…` (lista) | **96 ms** | **2,1 ms** |
| `GET /inventory/products` (800 activos) | **37 ms** | **2,3 ms** |
| Historial de órdenes: cambiar un filtro (30 000 filas) | ~83 ms | ~0,8 ms |

Cinco endpoints de lectura cacheados, con TTL de 30 s a 5 min, invalidación explícita en cada escritura y 25 tests nuevos. En el frontend: Lazy Loading de tres formularios/paneles y un `useMemo` en dos pasos. El Lazy Loading **no** mejora de forma medible el bundle inicial (sección 3): se explica con cifras.

**Lo más importante que enseñó la medición:** con el volumen original (96 incidencias, 6 activos, 11 órdenes) *todo* respondía en menos de 1 ms y no había nada que cachear. El problema aparece con volumen real (sección 2).

## 2. Evidencia: cómo se identificaron los candidatos

### 2.1 Instrumentación
- Middleware de timing en [`services/api/main.py`](services/api/main.py): una línea por petición (`GET /api/incidents/summary → 200 | 41.2ms | cache HIT`). Incluye la query string, porque la clave de caché depende de ella, y el estado `X-Cache` cuando existe.
- [`scripts/seed_load.py`](scripts/seed_load.py): *seeder* determinista (`--seed 42`) con datos coherentes, no filas "test" repetidas. Incidencias repartidas en ~2 años, 5 categorías, 4 estados con historial de ciclo de vida válido, clientes con distribución de cola larga, agentes AGT-01…40; activos por familia × modelo × oficina, órdenes generadas de modo que el stock nunca es negativo (misma regla que la API); proveedores con moneda acorde al país. Cada incidencia pasa por `IncidentRecord`.
- [`scripts/bench_endpoints.py`](scripts/bench_endpoints.py): repite N peticiones idénticas por endpoint (como un panel con muchos usuarios) y mide 1.ª llamada, mediana, p95, media, tamaño y aciertos de caché.

### 2.2 Volumen antes y después del seed

| Dataset | incidencias / activos / órdenes | summary | facets | lista p1 | products | orders |
|---|---|---:|---:|---:|---:|---:|
| Seed original | 96 / 6 / 11 | 1,0 ms | 0,4 ms | 0,5 ms | 0,3 ms | 0,6 ms |
| Seed de carga | 8 001 / 800 / 30 000 | 94,3 ms | 81,2 ms | 95,3 ms | 32,7 ms | 920 ms |

(Coste del servicio sin HTTP, mediana de 15 ejecuciones; también hay 315 proveedores frente a 15. Datos en [`docs/caching/volume-small-vs-large.md`](docs/caching/volume-small-vs-large.md).) Con 80× más incidencias y 2 700× más órdenes, las latencias suben entre 100× y 1 500×.

### 2.3 Dónde se va el tiempo
Perfilado por capas con el seed de carga:

- **Incidencias** (TinyDB): `store.all_docs()` tarda ~87 ms de ~97 ms. TinyDB **relee y parsea el fichero JSON entero en cada operación**; el filtrado (2 ms) y la agregación son casi gratis. Por eso `summary`, `facets` y la lista cuestan lo mismo (~80-100 ms) aunque hagan cosas distintas.
- **`/inventory/orders`**: ~850 ms de consultas y construcción de 30 000 `OrderOut` + ~120 ms de serialización + 9,8 MB de respuesta.
- **`/inventory/products`**: ~48 ms de subconsultas correlacionadas `SUM` sobre todas las órdenes.

## 3. Decisiones en el frontend

### 3.1 Lazy Loading (`next/dynamic`)

Next ya divide por ruta, así que no tiene sentido diferir páginas enteras. Se difirieron componentes que **solo existen tras una acción del usuario**:

| Componente | Dónde | Por qué está justificado |
|---|---|---|
| `IncidentForm` | [`IncidentsPage`](uis/backoffice/src/views/IncidentsPage.tsx) y [`IncidentDetailPage`](uis/backoffice/src/views/IncidentDetailPage.tsx) | Solo se monta al pulsar «Nueva incidencia» / «Editar». La mayoría de visitas a la lista no lo usan. Chunk propio: 5,4 KB (2,1 KB gzip). |
| `MetricsSummary` | [`IncidentsAnalysisPage`](uis/backoffice/src/views/IncidentsAnalysisPage.tsx) | Solo se dibuja cuando ya se subió y analizó un CSV; en la primera visita es código muerto. Chunk: 3,9 KB. |
| `SupplierForm` | [`SuppliersPage`](uis/backoffice/src/views/SuppliersPage.tsx) | Solo tras «Nuevo proveedor». |

Detalle de implementación: los botones que abren el formulario lo **precargan al `hover`/`focus`**, así el usuario rara vez espera a la descarga; mientras tanto se muestra `LoadingState`.

**Resultado medido (JS inicial por ruta, `scripts/bundle-size.mjs`):**

| Ruta | Antes (raw / gzip) | Después (raw / gzip) |
|---|---|---|
| `/incidents` | 604,2 / 187,2 KB | 603,4 / 187,5 KB |
| `/incidents/analysis` | 587,6 / 182,5 KB | 588,1 / 183,4 KB |
| `/inventory/products` (control, sin cambios) | 594,5 / 185,3 KB | 594,5 / 185,6 KB |
| `/suppliers` | 592,8 / 184,1 KB | 593,6 / 185,0 KB |

**Conclusión honesta: el efecto en el bundle inicial es nulo dentro del ruido de medida (±1 KB).** Los componentes diferidos pesan 4-5 KB y el runtime de React/Next (~580 KB) domina todas las rutas; el cargador de `next/dynamic` compensa casi lo que se ahorra. Lo que sí queda comprobado: los chunks existen, no aparecen en el HTML inicial y se sirven bajo demanda. El patrón compensará cuando esos componentes crezcan (o si se añade una librería pesada de gráficos o CSV); hoy es una decisión de arquitectura, no una mejora de rendimiento. Si el equipo prefiere no pagar la complejidad, es fácil revertirlo.

### 3.2 `useMemo`

**Aplicado — [`InventoryOrdersPage`](uis/backoffice/src/views/InventoryOrdersPage.tsx).** Ya había un `useMemo` que filtraba **y ordenaba** en cada cambio de filtro. Ordenar es lo caro: el comparador crea dos `Date` por comparación. Medido con 30 000 órdenes (Node, microbenchmark):

| Operación | Tiempo |
|---|---:|
| Cambiar filtro (antes: filtrar + reordenar) | ~83 ms |
| Cambiar filtro (después: filtrar una lista ya ordenada) | ~0,8 ms |
| Ordenar una vez al cargar (se paga igual antes y después) | ~228 ms |

Dos `useMemo` encadenados: `sorted` depende solo de `[orders]`; `visible` depende de `[sorted, type, office]`. Test determinista que cuenta las llamadas al comparador y falla si se vuelve a ordenar al cambiar el filtro (comprobado quitando el memo).

**Medido y descartado:**
- `AssetsPage`: separar el sort del filtro. Ordenar 800 activos desde cero cuesta 0,4 ms y 5 000, ~4 ms (y filtrar+ordenar por pulsación, 0,15 ms y ~0,8 ms): no hay nada que ahorrar.
- Memoizar las `<option>` de `AssetSelect`: 6,9 → 5,6 ms por pulsación con 800 activos (29 → 21 ms con 5 000; jsdom). Gana menos de 2 ms al volumen actual; es memoización prematura.

**Límite que este informe no resuelve:** el cuello real de esa página es **renderizar 30 000 filas** y descargar 9,8 MB; la solución es paginar (o virtualizar), no memoizar.

## 4. Decisiones en el backend

### 4.1 Mecanismo — [`core/cache.py`](services/api/core/cache.py)
Caché **en proceso** con TTL y LRU acotada, sin Redis. La app es de un solo proceso con TinyDB/SQLite (el propio `incident_store` documenta que un segundo worker necesitaría una base real), así que Redis añadiría un servicio sin ganar consistencia. Se guardan los **bytes JSON ya serializados**: un acierto se salta consulta, construcción de modelos y validación/serialización del `response_model`; por eso `orders` pasa de 914 a 20 ms y no a ~120 ms. Cabecera `X-Cache: HIT|MISS` y línea en el log de timing.

Reglas: toda entrada tiene TTL (un TTL ≤ 0 lanza error); tamaño acotado; cada caché pertenece a un grupo de invalidación (`incidents`, `inventory`); y un contador de *generación* evita que una lectura iniciada antes de una escritura repueble la caché con el dato viejo tras la invalidación.

### 4.2 Inventario de endpoints (coste × frecuencia × estabilidad)

Costes medidos con el seed de carga (mediana, 30 peticiones). **Frecuencias estimadas** a partir del código del frontend, no de telemetría real (no hay telemetría en el repo). «Estabilidad» = qué cambia el dato.

| Endpoint | (a) Coste | (b) Frecuencia (estimada) | (c) Cambia cuando… | Decisión |
|---|---:|---|---|---|
| `GET /api/incidents` | 96 ms | carga de la pantalla + cada filtro/orden/página (con debounce de 300 ms) | alta/edición/cambio de estado | **Cache 30 s** |
| `GET /api/incidents/summary` | 99 ms | siempre junto a la lista | ídem | **Cache 60 s** |
| `GET /api/incidents/facets` | 79 ms | carga + tras crear | solo si aparece sucursal/cliente/agente nuevo | **Cache 300 s** |
| `GET /inventory/orders` | 914 ms, 9,8 MB | cada visita al historial | cada orden registrada | **Cache 30 s** |
| `GET /inventory/products` | 37 ms | pantalla de stock + ambos formularios de orden (recargan tras cada orden) | cada orden / alta de activo | **Cache 30 s** |
| `GET /api/incidents/{id}` | 120 ms | una por detalle abierto | cada edición de esa incidencia | No (ver 6) |
| `GET /inventory/products/{id}` | < 10 ms (no medido; consulta por clave) | justo antes y después de cada orden | cada orden | No (ver 6) |
| `GET /suppliers`, `/suppliers/search/*`, `/suppliers/{id}` | 3-5 ms | por visita | altas/ediciones | No (ver 6) |
| `GET /users/directory` | 1,7 ms | por visita al historial | altas/bajas | No |
| `GET /auth/me`, `GET /profiles/me` | ~2 ms | por sesión | edición de perfil | No: datos del usuario |
| `GET /users`, `/profiles`, `/users/{id}`, `/profiles/{id}` | no medido | raro (admin) | altas/ediciones | No |
| `POST /auth/login` | ~300 ms (bcrypt) | por login | — | No: el coste es deliberado |
| `POST /api/incidents/analyze`, `GET …/results/export` | depende del CSV | por subida | — | No: dependen del fichero subido |
| Todos los `POST/PUT/PATCH/DELETE` | — | — | — | Nunca; **invalidan** |

### 4.3 Endpoints cacheados: TTL e invalidación

| Endpoint | Clave | TTL | Tamaño máx. | Invalidación |
|---|---|---:|---:|---|
| `/api/incidents` | filtros + orden + página | 30 s | 256 | `incident_store` (insert / replace / truncate / insert_many) |
| `/api/incidents/summary` | filtros | 60 s | 128 | ídem |
| `/api/incidents/facets` | — | 300 s | 1 | ídem |
| `/inventory/products` | oficina × categoría | 30 s | 32 | `inventory.service`: alta de activo, orden de entrada, orden de salida (tras el *commit*) |
| `/inventory/orders` | oficina × tipo | 30 s | 4 (≈40 MB como máximo) | ídem |

**Estrategia de invalidación: por escritura, centralizada.** En incidencias, todas las escrituras pasan por `incident_store.py`, que limpia el grupo; así ninguna vía (API, lifecycle, script de seed ejecutado en el mismo proceso) puede olvidarse. En inventario, tras cada `commit` exitoso. El usuario ve su propio cambio al instante (*read-your-writes*): un test crea una incidencia con la caché caliente y comprueba que el total sube de inmediato. El TTL actúa como **red de seguridad**, no como mecanismo de consistencia: acota la obsolescencia de escrituras que la invalidación no ve (otro worker, otro proceso).

**Seguridad.** Se cachean solo respuestas idénticas para cualquier usuario autenticado: ninguna lista de incidencias/inventario depende de quién pregunta (los emails de cliente van enmascarados en las listas; `user_uuid` de las órdenes lo ve cualquier sesión hoy). La autenticación es una dependencia del router y se ejecuta **antes** del handler, por lo que una caché caliente nunca sirve a una petición anónima (test: 401 sin cabecera `X-Cache`). No se cachea ningún endpoint por-usuario (`/auth/me`, `/profiles/me`); si se hiciera, `user_key()` mete el id en la clave. Los endpoints de escritura **nunca leen de la caché**: la comprobación de stock de una salida va siempre contra la base de datos, bajo bloqueo (test: con la caché diciendo stock 0 y 5 unidades reales, la salida de 3 se acepta y la siguiente se rechaza con 400).

### 4.4 Resultado (30 peticiones idénticas por endpoint; [`docs/caching/`](docs/caching/))

| Endpoint | 1.ª (MISS) | Mediana antes → después | Media 30 llamadas antes → después | Aciertos |
|---|---:|---:|---:|---:|
| `/api/incidents/summary` | 175 ms | 98,7 → **2,0 ms** | 104,6 → 7,9 | 29/30 |
| `/api/incidents/facets` | 90 ms | 79,3 → **1,8 ms** | 85,7 → 4,9 | 29/30 |
| `/api/incidents?page=1&page_size=15` | 107 ms | 96,1 → **2,1 ms** | 102,2 → 5,7 | 29/30 |
| `/api/incidents?status=open&category=TECHNICAL…` | 106 ms | 81,1 → **2,6 ms** | 84,4 → 6,2 | 29/30 |
| `/inventory/products` | 65 ms | 36,5 → **2,3 ms** | 38,4 → 4,4 | 29/30 |
| `/inventory/orders` | 942 ms | 913,7 → **19,7 ms** | 925,9 → 51,0 | 29/30 |
| Control sin caché: `/suppliers`, `/users/directory`, `/profiles/me`, `/auth/me` | — | sin cambios (2-5 ms) | — | 0/30 |

Dos matices: la **primera** llamada tras cada invalidación o expiración (MISS) cuesta lo mismo que antes, más la serialización a bytes; en esta medición no es distinguible del ruido (p. ej. `orders`: 1,0 s antes, 0,94 s después), pero no es más rápida. Y el 97 % de aciertos es el de una ráfaga de peticiones idénticas: en uso real depende de la frecuencia por clave (estimación: con 2 peticiones por minuto a la misma vista y un TTL de 60 s, un MISS cada dos peticiones, ≈ 50 %), y cada alta/edición vacía el grupo.

También se comprobó la cadena completa a través del *proxy* de Next: `MISS` → `HIT` → crear incidencia por el proxy → el resumen pasa de 8 000 a 8 001 (`MISS`).

## 5. Intercambios reconocidos (frescura vs. rendimiento)

**TTL de 30 s en `/inventory/products` (el caso delicado).** El stock es el dato sobre el que se decide (equivalente al saldo en el ejemplo del enunciado), así que es el TTL más corto del sistema. Con un solo proceso la obsolescencia efectiva es **cero**, porque cada orden vacía el grupo. Con varios workers sobre Postgres, otro worker puede mostrar un stock de hasta 30 s de antigüedad. Es aceptable porque (1) la pantalla es informativa: la decisión se toma al registrar una salida, que valida contra la base de datos real y rechaza el exceso con 400 aunque la caché mienta; (2) los formularios de orden usan `GET /products/{id}`, no cacheado, para mostrar el stock justo antes de enviar; (3) 30 s es corto frente al ritmo de reposición de material de oficina. Se descartó 5 min (el usuario podría ver «hay 3 unidades» durante cinco minutos tras agotarse) y 5 s (la tasa de aciertos cae y el beneficio también, con el coste de 37 ms que ya es bajo).

**TTL de 300 s en `facets`.** Solo alimenta desplegables; un valor nuevo tardando hasta 5 min en aparecer en otro worker no tiene consecuencias, y los datos casi no cambian. Es la combinación coste alto (79 ms) × estabilidad máxima, donde conviene un TTL largo.

**TTL de 60 s en `summary` y 30 s en la lista.** El resumen es una cifra de panel que se lee, no se opera; 60 s es tolerable. La lista sí se usa para actuar (abrir una incidencia, cambiar su estado), de ahí 30 s, y su clave incluye filtros y página.

**Obsolescencia por escrituras fuera de proceso.** `scripts/seed_incidents.py` y el *seeder* de carga escriben en el fichero desde otro proceso: la API en marcha no se entera y sirve datos viejos **hasta 30-300 s**. Es un intercambio asumido y está probado (`test_a_write_made_outside_the_api_is_seen_only_after_the_ttl`). Tras un seed masivo, reiniciar la API o esperar al TTL.

**Memoria.** `orders` guarda ~10 MB por clave; `maxsize=4` acota el peor caso a ~40 MB por proceso. Es el síntoma de que esa respuesta debería paginarse.

**Estampida de caché.** Si 20 peticiones llegan a la vez con la caché fría, las 20 calculan. No se añadió *single-flight* porque con 1 proceso y ráfagas pequeñas la complejidad no compensa; se anota como mejora.

## 6. Qué no se cacheó y por qué

- **`GET /api/incidents/{id}` (120 ms) — el candidato descartado más tentador.** Es lento (por la misma causa: releer el JSON entero), pero se pide una vez por detalle abierto, con claves distintas por incidencia (poca reutilización) y debe reflejar al instante la edición que el usuario acaba de hacer. Cachearlo daría pocos aciertos y mucha invalidación. La solución es de almacenamiento (índice o base SQL, o una instantánea en memoria del fichero), no de caché por endpoint.
- **`GET /inventory/products/{id}`.** Los formularios lo leen justo antes y después de registrar una orden para mostrar el stock real; cachearlo rompería esa garantía.
- **Proveedores, `users/directory`, `auth/me`, `profiles/me` (2-5 ms).** Coste de cómputo ≈ coste de almacenamiento: no compensa. `auth/me` y `profiles/me` además dependen del usuario.
- **`POST /auth/login` (~300 ms).** El coste lo introduce bcrypt a propósito; cachearlo sería un riesgo de seguridad.
- **`/api/incidents/analyze` y `results/export`.** Dependen del fichero que sube cada usuario.
- **Lazy Loading de `IncidentSummaryPanel`.** Está sobre el pliegue, y diferirlo reintroduciría el desplazamiento de layout (CLS) que la auditoría de Lighthouse ya corrigió con su *skeleton*.
- **Lazy Loading de rutas completas.** Next ya divide el código por ruta.

## 7. Pruebas

- Backend: **749 pasan** (724 previas + 25 nuevas en [`tests/test_caching.py`](services/api/tests/test_caching.py)), 7 xfailed previos. Las 25 cubren expiración por TTL con reloj inyectado, evicción LRU, aislamiento por grupo, la carrera de generación, `MISS→HIT`, invalidación tras crear/editar/cambiar estado/registrar orden/crear activo, claves distintas por filtro, 401 con caché caliente, la comprobación de stock contra la base de datos y la obsolescencia fuera de proceso.
- Se comprobó por mutación que los tests detectan el fallo: quitando las llamadas a `invalidate`, fallan 6 tests; quitando el memo de órdenes, falla el test de frontend.
- `conftest.py` vacía todas las cachés antes y después de cada test (la caché es global al proceso, las bases de datos de los tests no).
- Frontend: typecheck correcto y **551 tests** pasan (550 previos + 1 nuevo).
- **No verificado en navegador:** Chromium no arranca en este Codespace (faltan librerías del sistema) y los e2e de Playwright no se ejecutaron. La interacción del formulario diferido se comprobó a nivel de build (chunks separados, servidos con 200) y de HTTP, no con clics reales; conviene una pasada manual por «Nueva incidencia», «Editar» y «Nuevo proveedor».

## 8. Cómo reproducir

```bash
# API con datos de volumen (usa un SECRET_KEY de 32+ caracteres)
cd services/api
.venv/bin/python ../../scripts/seed_load.py --reset          # 8 000 incidencias, 800 activos, 30 000 órdenes, +300 proveedores
SECRET_KEY=$(openssl rand -hex 32) AUTH_INITIAL_EMAIL=dev@nexova.com AUTH_INITIAL_PASSWORD='DevPass12345!' \
  .venv/bin/python -m uvicorn main:app --port 8000
.venv/bin/python ../../scripts/bench_endpoints.py --repeat 30 --label "mi-medicion"
# Bundle del frontend
npm run build:backoffice && node scripts/bundle-size.mjs
# Tests
cd services/api && .venv/bin/python -m pytest -q ; cd ../.. && npm run test:backoffice
```

Para reproducir el «antes»: `git stash` de los cambios de `services/api` (o `git checkout main -- services/api`), reinicia la API y repite el benchmark; el resultado original está en [`docs/caching/benchmark-before.md`](docs/caching/benchmark-before.md) y el posterior en `benchmark-after.md`.

## 9. Mejoras recomendadas (fuera de este alcance)

1. **Paginar `GET /inventory/orders`** (y el historial del frontend): 9,8 MB por petición es el problema de fondo; la caché lo oculta, no lo resuelve.
2. **Cambiar el almacenamiento de incidencias**: releer un JSON de 8 000 documentos en cada operación explica ~90 % de la latencia de todo el módulo, incluido `GET /{id}`.
3. **Redis o equivalente si se despliega con varios workers**: hoy la invalidación es por proceso y solo el TTL acota el resto.
4. *Single-flight* para evitar la estampida con caché fría.
5. Telemetría real de frecuencias (el middleware de timing ya deja el rastro) para sustituir las estimaciones de la sección 4.2.
