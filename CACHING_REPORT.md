# CACHING_REPORT — Optimización de rendimiento: caching

Rama `feature/caching-optimisation` · monorepo de Nexova (API FastAPI en `services/api`, backoffice Next.js en `uis/backoffice`).

**Resumen.** Se midió antes de cachear. Con el volumen original (96 incidencias, 6 activos, 11 órdenes) ninguna lectura pasa de 4 ms, así que no había nada que cachear. Con un volumen realista (5.000 incidencias, 300 activos, 20.000 órdenes) tres lecturas compartidas salen claramente beneficiadas y se cachean con TTL e invalidación en escritura. Otra, `/inventory/orders`, es la más lenta de todas y **no** se cachea (ver §4). En el frontend se difieren dos componentes y se memoiza un valor. La ganancia de bundle es pequeña y se dice tal cual.

---

## 1. Cómo se midió

| Pieza | Qué hace |
|---|---|
| Middleware de timing (`services/api/main.py`) | Una línea de log por petición: `GET /api/incidents -> 200 \| 41.2ms` (solo el path, nunca la query string). |
| `scripts/seed_load.py` | Seeder de volumen realista y reproducible (`--seed`). Incidencias con plantillas por categoría, pesos realistas, estados válidos según el ciclo de vida y fechas repartidas en 12 meses. Inventario con 4 categorías, 2 oficinas, proveedores y asignatarios variados; las salidas nunca dejan el stock en negativo. Se niega a escribir en un `DATABASE_URL` que no sea SQLite salvo `--allow-remote`. |
| `scripts/bench_endpoints.py` | Llama 50 veces a cada GET con los mismos parámetros y da primera llamada, mediana y p95. Se ejecuta con `CACHE_ENABLED=0` y `=1` sobre los mismos datos. |

Todo se ejecutó en local y en proceso (`TestClient`: coste de la API sin red), con TinyDB temporal y SQLite en un directorio temporal. **No se escribió nada en el Supabase real.**

### Volumen

| Tabla | Antes | Después del seed |
|---|---|---|
| Incidencias (TinyDB) | 96 | 5.000 |
| Activos | 6 | 300 |
| Órdenes (entradas + salidas) | 11 | 20.000 (8.000 + 12.000) |
| Proveedores | 15 | 15 (no se tocó) |

### Latencia sin caché (mediana, ms)

| Endpoint | Filas, antes | Antes del seed | Filas, después | Después del seed |
|---|---|---|---|---|
| `GET /api/incidents/summary` | 1 | 2,7 | 1 | **24,5** |
| `GET /api/incidents` | 96 | 4,1 | 5.000 | **173,5** |
| `GET /api/incidents?status=open` | 17 | 3,0 | 1.112 | **46,7** |
| `GET /inventory/products` | 6 | 3,9 | 300 | **14,9** |
| `GET /inventory/orders` | 11 | 3,6 | 20.000 | **862,1** |
| `GET /suppliers` | 15 | 3,6 | 15 | 3,7 |
| `GET /users`, `GET /profiles/me` | 1 | 2,4 / 2,2 | 1 | 2,3 / 2,2 |

Con 100 filas, medir no habría justificado ningún caché. Es el volumen el que cambia la decisión.

---

## 2. Decisiones en el frontend

### Lazy Loading (`next/dynamic`)

| Componente | Dónde | Por qué diferirlo |
|---|---|---|
| `IncidentSummary` | `/incidents` | Solo se pinta cuando el usuario sube un CSV y llega el análisis (`result !== null`). Antes se descargaba y parseaba en cada visita aunque nadie subiese nada. |
| `SupplierForm` | `/suppliers` | Solo aparece al pulsar «+ Nuevo proveedor»; la mayoría de visitas solo lee la lista. |

Ambos usan `ssr: false`: no existen en el primer render, así que el servidor no tiene nada que pintar. Llevan un `loading` accesible con spinner.

**Beneficio medido** (`next build`, chunks de `.next/static`; se comprobó en el HTML de cada ruta qué scripts carga al inicio):
- `IncidentSummary` pasa a un chunk propio de 5,4 KB (1,7 KB gzip), que ya no aparece en los scripts iniciales de `/incidents`.
- `SupplierForm` pasa a un chunk propio de 3,5 KB (1,4 KB gzip), fuera de los scripts iniciales de `/suppliers`.

Son cifras modestas: son componentes pequeños y el grueso del JS (~620 KB) es React y Next, común a todas las rutas. El criterio de elección fue «no se necesita en la carga inicial», no «el ahorro es grande». Lo valioso es el patrón, que escalará si esos componentes crecen.

**Considerados y no diferidos:**
- `IncidentForm`: es todo el contenido de `/incidents/new`. Diferirlo solo añadiría una segunda petición antes de poder escribir, sin reducir nada de lo que la ruta necesita.
- `FileDrop` y los filtros: son visibles desde el primer pintado. Diferirlos provoca saltos de layout (CLS).

### `useMemo`

`IncidentRow` memoiza `formatIncidentDate(incident.created_at)` con dependencia `[incident.created_at]`.

- **Por qué es costoso:** `formatIncidentDate` construye un `Intl.DateTimeFormat` en cada llamada. Micro-benchmark en Node: ~0,06 ms por fila, **3,0 ms por cada render de una página de 50 filas**. En un móvil gama media esa cifra será varias veces mayor.
- **Por qué importa la frecuencia:** `IncidentRow` no está memoizado, así que cada cambio de estado re-renderiza las 50 filas (actualización optimista, `pending` activado, `pending` desactivado, es decir 3 renders por clic).
- **Por qué la dependencia es correcta:** el texto solo depende de `created_at`. Al sustituir una incidencia, las otras 49 conservan el mismo `created_at` y se saltan el formateo.

**Alternativa que conviene saber:** mover el `Intl.DateTimeFormat` a una constante de módulo baja el coste a 0,09 ms por render (unas 33 veces menos) y haría innecesario el `useMemo`. No lo apliqué porque el encargo pedía un `useMemo` medible y toca una función compartida con `suppliersApi`. Lo recomiendo como siguiente paso. **No se usó el Profiler de React** (no hay navegador en este entorno): el beneficio es el del micro-benchmark, no una medida en la app.

**Considerados y no memoizados** (cálculos triviales): `activeCount` en proveedores (un `filter` sobre decenas de filas), `open` en `IncidentTotals` (una suma), `pct()` y `Math.max` de `IncidentSummary` (diez elementos como mucho). La memoización prematura añade dependencias que mantener sin beneficio.

---

## 3. Decisiones en el backend

### Inventario de endpoints

Coste = mediana después del seed (con 5.000 incidencias, 300 activos y 20.000 órdenes). Frecuencia estimada a partir de cómo los usa el backoffice; **no hay telemetría de producción**, así que no son cifras medidas.

| Endpoint | (a) Coste | (b) Frecuencia | (c) Cambio de datos | ¿Caché? |
|---|---|---|---|---|
| `GET /api/incidents/summary` | 24,5 ms, recorre todo | Cada visita al resumen, más el botón «Actualizar» | Al crear una incidencia o cambiar su estado | **Sí** |
| `GET /api/incidents` (+filtros) | 46–174 ms, valida cada doc con Pydantic | Cada visita a la lista y cada cambio de filtro (hay 3 filtros) | Igual que el resumen | **Sí** |
| `GET /inventory/products` (+`office`) | 12–15 ms, 2 agregados sobre todas las entradas y salidas | La cargan la página de activos y los formularios de entrada y salida | Solo al registrar una orden o crear un activo | **Sí** |
| `GET /inventory/orders` | 862 ms | Baja: una página de historial | Con cada orden | **No** (§4) |
| `GET /suppliers` | 3,7 ms, 15 filas | Media | Raro | No |
| `GET /suppliers/{id}`, `GET /inventory/products/{id}`, `GET /api/incidents/{id}` | Una sola fila (~3 ms, no medido por separado) | Baja | Raro | No |
| `GET /users`, `GET /users/{id}` | 2,3 ms | Baja | Raro | No |
| `GET /profiles/me` | 2,2 ms | Media | Por usuario | **No, privado** |
| `POST/PATCH/PUT/DELETE` | — | — | Son las escrituras | No (invalidan) |
| `POST /api/incidents/analyze`, `GET /api/incidents/results/export` | Depende del CSV | Baja | Cada subida | No |
| `GET /health` | 1,4 ms | Alta (sondas) | Constante | No: no hay nada que ahorrar |

### Endpoints cacheados

Implementados con una caché en proceso (`services/api/cache.py`, clase `TTLCache`).

| Endpoint | Coste medido (sin caché → con caché) | TTL | Invalidación |
|---|---|---|---|
| `GET /api/incidents/summary` | 24,5 → **2,3 ms** (−90%) | 60 s | `create`, `create_many`, `update_status` |
| `GET /api/incidents` (clave = combinación de filtros) | 173,5 → **45,7 ms** (−74%); con `status=open`, 46,7 → 11,4 ms | 30 s | Las mismas |
| `GET /inventory/products` (clave = `office`) | 14,9 → **2,9 ms** (−80%); con `office`, 12,6 → 2,8 ms | 30 s | `create_asset`, `create_entry`, `create_exit` |

**Qué queda sin ahorrar:** la lista de incidencias cacheada sigue costando ~46 ms porque FastAPI serializa 5.000 filas en cada petición. Lo que desaparece es la lectura y validación (~130 ms). La solución de fondo sería paginar en la API, porque el frontend ya muestra 50 de 50. Queda fuera de este encargo.

**Reglas que `TTLCache` impone** (todas con test en `tests/test_cache.py`):
1. **Toda entrada caduca.** `ttl <= 0` lanza error, así que no existe una caché sin expiración.
2. **Invalidación segura ante carreras.** `invalidate()` vacía las entradas y sube un contador de generación. Un lector que empezó antes de una escritura no guarda su resultado, de modo que una lectura lenta no resucita datos viejos. Se invalida **después** de escribir y con el lock del repositorio tomado.
3. **Copias de listas.** Si una ruta muta su resultado, no corrompe lo que verá la siguiente petición.
4. **Acotada** (`max_entries=128`, expulsa caducadas y luego la más antigua) y segura entre hilos. El loader corre fuera del lock, para que una consulta lenta no bloquee otras claves.
5. **Interruptor `CACHE_ENABLED=0`** para medir el «antes» sin tocar el código.

### Estrategia de invalidación

La invalidación está **dentro de las escrituras del repositorio y del servicio**, no en las rutas. Así un endpoint nuevo que escriba no puede olvidarse de invalidar:
- `IncidentRepository`: `create`, `create_many` y `update_status` invalidan lista y resumen. El cambio de estado se invalida en bloque porque mueve una incidencia entre claves de filtro y entre contadores del resumen. Un cambio de estado rechazado (400) **no** invalida: no cambió nada.
- `inventory_service`: `create_asset`, `create_entry` y `create_exit` invalidan tras el `commit`. Una salida rechazada por stock insuficiente hace `rollback` y tampoco invalida.

### Datos privados: nada se comparte

- Solo se cachean respuestas **idénticas para cualquier usuario autenticado**: incidencias, activos y stock son datos de la organización, sin filtro por usuario. Las claves se construyen solo con los **filtros** de la petición, nunca con datos del usuario.
- La autenticación sigue ejecutándose en cada petición, porque la dependencia `get_current_user` va antes del handler y la caché está por debajo. Un test comprueba que, con la caché caliente, una petición sin token recibe 401.
- `GET /profiles/me`, `/users/*` y `/auth/*` **no pasan por la caché**. Si algún día se cachea algo por usuario, la clave debe incluir el id del usuario.
- El log de timing registra solo el path, nunca la query string.

---

## 4. Intercambios reconocidos

### Frescura frente a rendimiento: los TTL elegidos

**Lo principal:** como cada escritura *de este proceso* invalida de inmediato, **el TTL no gobierna lo que ve un usuario tras su propia acción**. Si alguien cambia el estado de una incidencia y recarga, ve el cambio al instante. El TTL solo acota la desactualización causada por escritores que esta caché no ve: otro worker de uvicorn, `scripts/seed_*.py` y ediciones directas en la base.

- **Stock, 30 s.** Es el dato más delicado: se muestra en el formulario de salida. Con varios workers, un worker puede mostrar hasta 30 s un stock que otro ya cambió. Se acepta porque **la comprobación que decide una salida nunca lee la caché**: `create_exit` relee el stock bajo el bloqueo de la fila del activo. Un test lo prueba: con un valor envenenado en caché que dice «hay 100», una salida de 5 sobre un stock real de 2 sigue dando 400. Lo peor que ocurre es una cifra algo vieja en pantalla; nunca un stock negativo. Con 5 s, el acierto de caché sería bajo para una página que se visita de forma esporádica. Con 5 min, la cifra podría contradecir una salida que otro acaba de registrar.
- **Lista de incidencias, 30 s.** Las incidencias se crean y cambian de estado a lo largo del día, y quien gestiona esperaría ver el trabajo de un compañero en poco tiempo. Quien recarga esperando ver el cambio de un compañero lo verá, como mucho, medio minuto después.
- **Resumen, 60 s.** Son totales agregados para dirección, y un desfase de un minuto en un contador no cambia ninguna decisión. Es el doble que la lista porque su coste por llamada es menor y su lectura es más tolerante.
- **Qué se pierde con el volumen original:** con 96 incidencias, la caché ahorra ~1 ms por petición (3,0 frente a 4,1 ms) a cambio de complejidad y de riesgo de datos viejos. Está justificada por el volumen *esperado*, no por el actual. Si no se prevé crecimiento, es una complejidad que no compensa.

### Otros intercambios

- **Caché en proceso, no Redis.** Hay un único servicio FastAPI, y Redis añadiría infraestructura y un punto de fallo para ganar una cosa: invalidación compartida entre workers. Con un solo proceso eso no se necesita. **Cuando se escale a varios workers** (`--workers N`) cada uno tendrá su caché y la invalidación solo llegará a su propio worker, dentro de lo que acota el TTL. En ese momento Redis (o publicar invalidaciones) pasa a ser lo correcto.
- **Memoria.** La lista de 5.000 incidencias se guarda por combinación de filtros (4 filtros posibles, acotado a 128 entradas). A este tamaño son pocos MB.
- **Las mediciones son de SQLite local.** Contra Supabase, cada consulta suma la latencia de red al pooler, así que el ahorro real de `/inventory/products` debería ser **mayor** que el medido. No se midió porque habría implicado escribir miles de filas en la base real.

### Qué no se cacheó y por qué

- **`GET /inventory/orders`, el candidato más tentador (862 ms).** Se descartó porque (1) la frecuencia es baja, es una página de historial y no un formulario que se abra constantemente; (2) la caché no arreglaría la causa: devuelve 20.000 filas sin paginar, y el medio segundo se va en serializar y ordenar esa lista. Con caché, la mediana medida fue 846 ms, casi igual (el coste es el volumen de la respuesta, no la consulta). (3) cambia con **cada** orden, que es justo cuando alguien mira el historial, así que el acierto sería bajo, y (4) guardar 20.000 filas por oficina es memoria mal empleada. La solución correcta es **paginar** (como ya se hizo en la lista de incidencias del frontend). Queda como siguiente paso.
- **`GET /suppliers`.** 3,7 ms con 15 filas y cambios raros. El coste de mantener la invalidación supera lo que se ahorra.
- **`GET /profiles/me`, `/users`, `/auth/*`.** Datos personales y de sesión: cachearlos con clave compartida sería una fuga de datos. Además cuestan ~2 ms.
- **`POST /api/incidents/analyze`.** Es una escritura (subida), el resultado depende de cada archivo y contiene datos de clientes. Además guarda el último resultado en una variable global del módulo (`_last_result`), compartida por todos los usuarios. Es un hallazgo previo a este trabajo, que no se toca aquí pero conviene saber.
- **El stock que decide una salida.** Nunca se cachea (ver §4).

---

## 5. Pruebas

- `services/api/tests/test_cache.py`: **20 tests nuevos**.
  - 10 de `TTLCache`: expiración con reloj falso, claves independientes, invalidación, carrera lectura/escritura, copias, límite de tamaño, interruptor, concurrencia.
  - 6 de incidencias: lista y resumen se invalidan al crear y al cambiar de estado, una transición rechazada no invalida, el 401 se mantiene con caché caliente.
  - 4 de inventario: las órdenes y nuevos activos invalidan, una salida fallida no altera el stock cacheado, el stock envenenado en caché no deja pasar una salida, las claves solo contienen el filtro.
- Suite completa de la API: **341 pasan** (321 previos + 20). Backoffice: `tsc`, `eslint` y 70 tests de Jest limpios, y `next build` correcto.
- `conftest.py` vacía la caché del inventario (es de módulo) en cada test, para que no haya fugas entre tests.

## 6. Cómo reproducirlo

```bash
S=/tmp/bench && mkdir -p $S
export INCIDENTS_DB_PATH=$S/inc.json DATABASE_URL=sqlite:///$S/inv.db USERS_DB_PATH=$S/users.json SUPPLIERS_DB_PATH=$S/sup.json
uv run --project services/api python scripts/seed_load.py --reset          # 5.000 incidencias, 300 activos, 20.000 órdenes
CACHE_ENABLED=0 uv run --project services/api python scripts/bench_endpoints.py   # antes
CACHE_ENABLED=1 uv run --project services/api python scripts/bench_endpoints.py   # después
(cd services/api && uv run pytest)
```

Las medianas pueden variar ±20 % entre ejecuciones; las cifras de este informe son de una ejecución de 50 repeticiones por endpoint en un Codespace.
