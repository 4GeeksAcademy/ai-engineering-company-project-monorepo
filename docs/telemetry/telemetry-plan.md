# Plan de Telemetría — Nexova Backoffice

> Respuesta al RFI del equipo de gestión. Documento de diseño: **no incluye código**. Esquemas formales en [`event-schemas.json`](./event-schemas.json) (JSON Schema draft-07), generados desde la misma fuente que las tablas de este documento.

| | |
|---|---|
| **Eventos diseñados** | **30** (5 obligatorios · 25 oportunidades identificadas) |
| **Categorías** | 6 (negocio/inventario, negocio/incidencias, autenticación, rendimiento, errores, navegación) |
| **Entrega** | 8 en *stream*, 22 en *batch* |
| **Sistema analizado** | API FastAPI (`services/api`), backoffice Next.js (`uis/backoffice`), inventario en Supabase vía SQLModel, usuarios e incidencias en TinyDB |

> **Alineado con `empresa-BRIEFING.md` de Nexova.** Las 5 métricas obligatorias de la sección 3 del BRIEFING son el piso del plan (sección 1.1) con sus nombres, hipótesis y decisiones literales. Las preguntas adicionales del tech lead (validaciones por producto, logins fallidos, secciones visitadas, flujos abandonados) se cubren con eventos *identificados*. El BRIEFING describe un inventario de **material formativo y kits de incorporación**; el código actual modela activos genéricos, así que la sección 0.1 lista los **huecos del modelo de datos** que hay que cerrar para poder emitir los campos obligatorios.

---

## 0. Cómo está construido el sistema (lo que condiciona el diseño)

Hallazgos del código que afectan a qué se puede medir y dónde:

| Hecho en el código | Consecuencia para la telemetría |
|---|---|
| Auth con **JWT sin estado**, sin sesiones ni cookies (`routes/auth.py`) | No existe `sessionId` en servidor. Lo genera el cliente (UUID por pestaña en `sessionStorage`) y viaja en `X-Session-Id`. |
| `userId` = `sub` del JWT (id interno TinyDB). En órdenes ya se guarda como `user_uuid`, nunca del cuerpo | Seudónimo estable y fiable para eventos autenticados. En login fallido no hay usuario: `anonymous`. |
| **Ninguna ruta edita stock**; `current_stock` = entradas − salidas, calculado (`inventory_service.py`). Los esquemas usan `extra="forbid"` | Un intento «directo» solo puede manifestarse como **422 `extra_forbidden`** (cuerpo con `current_stock`/`stock`) o **405** (PUT/PATCH/DELETE en `/inventory/products/{id}`). Ahí se instrumenta `direct_stock_edit_rejected`. |
| `create_exit` bloquea la fila del activo, comprueba stock y escribe en una transacción; si no alcanza lanza `InsufficientStock` (400) | Punto único y exacto para `order_validation_failed` (insufficient_stock) y para calcular `stock_before/After` y `stock_threshold_triggered`. |
| El mínimo de stock **solo existe en el frontend** (`LOW_STOCK_MAX = 5`) y el modelo no tiene programa, costo ni moneda | Ver 0.1: son prerrequisitos de datos para los 5 eventos obligatorios |
| `timing_middleware` ya registra `método ruta -> status \| ms` sin query string | Base ideal de `api_latency_recorded` y lugar natural para generar `requestId`. |
| `apiFetch` centraliza **todas** las llamadas del frontend; `ApiError` distingue `network/timeout/parse/http`; 401 → `clearToken()` + redirect | Un único punto para `X-Request-Id`, `api_request_failed` y `session_expired`. |
| Error boundaries: `app/error.tsx`, `(protected)/error.tsx`, `global-error.tsx` | Punto para `frontend_error_captured` (hoy el error solo va a la consola del navegador). |
| `CACHING_REPORT.md`: «no hay telemetría de producción, no son cifras medidas» | `api_latency_recorded` y `cache_lookup_recorded` cierran esa laguna. |
| Rutas del backoffice: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/incidents/*`, `/suppliers`, `/inventory/*`, `/account/*` | Base de `route_template` en `page_viewed`. |

### 0.1 Huecos entre el BRIEFING y el código actual

El BRIEFING exige campos mínimos en todo evento de inventario: `office`, `product_id`, `product_category`, `programme_id`, `quantity`, `currency`. El código hoy no los puede emitir todos:

| El BRIEFING exige | El código actual | Cambio necesario antes de instrumentar |
|---|---|---|
| `programme_id` (p. ej. `ventas-b2b`, `liderazgo-basico`) | `Asset` no tiene programa | Columna `programme_id` (slug) en `Asset`, obligatoria en el alta |
| `product_category` ∈ `training_kit`, `certification`, `onboarding_equipment` | `AssetCategory` = `hardware`, `peripherals`, `office_supplies`, `training_materials` | Migrar o mapear. Propuesta: `hardware`, `peripherals` → `onboarding_equipment`; `training_materials` → `training_kit`; `certification` es nueva; **`office_supplies` no tiene equivalente** → decisión de Elena y Patricia |
| `currency` = `EUR` (Valencia) / `USD` (Miami), sin conversión | No hay moneda | La moneda se **deriva en servidor de la oficina** (nunca la envía el cliente) y se guarda con cada entrada |
| Costo unitario (`kit_cost_variance_detected`, «con qué costo») | `AssetEntry` no guarda precio | Columna `unit_cost` en `AssetEntry`, obligatoria en la orden de entrada |
| «Mínimo configurado» por producto | Solo existe `LOW_STOCK_MAX = 5` en el frontend (`lib/inventory.ts`), global; el backend no lo conoce. La UI trata `≤ 5` como bajo, el BRIEFING dice «por debajo del mínimo» | Columna `min_stock` por producto en el backend; fijar la regla `stock_after < min_stock` (con `min_stock = 6` se reproduce el comportamiento actual de la UI) |
| `office` = `valencia` / `miami` (minúsculas) | La API usa `Valencia` / `Miami` | Normalizar a minúsculas **al emitir**; el contrato de la API no cambia |
| Tipo de destinatario (cliente, candidato, consultor, agente) | Solo `exit_type` (allocation/consumption) y `assigned_to` libre | Opcional: `recipient_type` (el evento lo declara como propiedad opcional) |

Reglas del BRIEFING que el plan respeta:

- **Sin datos personales:** ningún evento lleva nombres de candidatos, clientes o consultores; solo ids de programa, producto y orden.
- **Moneda de la oficina:** los importes se registran tal cual, sin convertir; la comparación de `kit_cost_variance_detected` solo se hace dentro de la misma moneda.
- **Idioma ≠ oficina:** `office` sale siempre del producto/orden, jamás del idioma de la interfaz; el idioma, si se captura, va aparte (`ui_language` en `page_viewed`).
- **Agregación futura:** los eventos de inventario llevan `office` y `programme_id` para el dashboard de L&D y el reporte semanal.
- **Trazabilidad:** toda modificación de stock es una orden con `user_id`; el stock no se edita directamente.
- **Nombres:** las propiedades de los eventos están en `snake_case`, como los campos del BRIEFING; el envelope conserva los nombres camelCase que fija el enunciado (`eventId`, `sessionId`…).

---

## 1. Fase 1 — Catálogo de oportunidades de datos

### 1.1 Métricas obligatorias (el piso)

Las 5 métricas de la sección 3 del BRIEFING, con su hipótesis y decisión tal como figuran allí:

| # | `event_type` | Se dispara cuando… | Hipótesis (BRIEFING) | Decisión que habilita (BRIEFING) |
|---|---|---|---|---|
| 1 | `inbound_order_created` | Llega un nuevo lote de material de formación o de incorporación desde un proveedor | Necesitamos saber cuánto material se produce/compra, para qué programa y con qué costo | Planificar la producción de material según demanda esperada de matrículas (Elena) |
| 2 | `outbound_order_created` | Se entrega un kit o certificado a un cliente, candidato, consultor o agente | Necesitamos saber qué programas consumen más material y a qué ritmo | Anticipar necesidades de reposición antes de una ola grande de matrículas (Elena) |
| 3 | `stock_threshold_triggered` | El stock de un ítem cae por debajo del mínimo configurado | Necesitamos saber con qué frecuencia un programa se queda sin material disponible | Ajustar el umbral mínimo o acelerar la reimpresión/reproducción de ese material |
| 4 | `direct_stock_edit_rejected` | Un usuario intenta modificar el stock directamente (fuera de una orden) y el sistema lo rechaza | Necesitamos saber si el personal intenta saltarse el control de trazabilidad del material | Reforzar capacitación o permisos en la oficina donde ocurre más (Patricia) |
| 5 | `kit_cost_variance_detected` | El costo unitario de una orden de entrada varía más de un umbral (10 %) respecto al histórico del mismo material/proveedor | Necesitamos saber cuándo un proveedor sube precios de forma anómala | Alertar a Elena y a Laura para renegociar o buscar proveedor alterno |

**Campos mínimos de inventario** (BRIEFING) presentes en los 5 como propiedades: `office`, `product_id`, `product_category`, `programme_id`, `quantity`, `currency`. Excepción documentada: en `direct_stock_edit_rejected` un alta no tiene aún producto, así que `product_id`, `product_category`, `programme_id` y `quantity` admiten `null`.

**Definición de `kit_cost_variance_detected`:** al registrar una entrada se compara `unit_cost` con la **media** del costo unitario de las órdenes de entrada previas del mismo `product_id` y mismo proveedor normalizado **en la misma moneda**, con un mínimo de 3 órdenes previas. Si `|unit_cost − media| / media > 10 %` se emite el evento (en ambas direcciones; `direction` distingue subida de bajada). Con menos de 3 órdenes no hay histórico y no se emite.

**Preguntas adicionales del tech lead** (no están en el BRIEFING; cubiertas como *identificadas*):

| Pregunta | Evento identificado |
|---|---|
| ¿Qué productos acumulan más errores de validación? | `order_validation_failed` |
| ¿Cuántos intentos de login fallidos hay por día? | `login_failed` |
| ¿Qué secciones visitan más los operadores? | `page_viewed` |
| ¿Hay flujos que se abandonan a la mitad? | `flow_abandoned` (+ `form_started` como denominador) |

### 1.2 Mapa del flujo de gestión de inventario

Desde que un usuario autenticado entra hasta que completa una orden de salida (la entrada es idéntica cambiando el endpoint):

```
 [1] /login ──POST /auth/login──► 200 ► token en localStorage      (401 ► login_failed)
        │
        ▼
 [2] /inventory/orders/outbound  ──────────────────────────────►  page_viewed
        │   GET /inventory/products (caché TTL 30 s)               api_latency_recorded, cache_lookup_recorded
        ▼
 [3] usuario elige activo y escribe un dato                       form_started
        │   GET /inventory/products/{id}  (stock mostrado)
        ▼
 [4] cantidad > stock mostrado → aviso «Supera el stock»          stock_warning_shown
        │
        ▼
 [5] Enviar ─► POST /inventory/orders/outbound  (Bearer, X-Request-Id)
        │
        ├─ 401 token caducado ─────────────────────────────────►  session_expired (+ flow_abandoned)
        ├─ 400 stock insuficiente / 404 / 422 ─────────────────►  order_validation_failed
        ├─ 422 con current_stock en el cuerpo / 405 en /products/{id}
        │                                                         direct_stock_edit_rejected
        ├─ 5xx ────────────────────────────────────────────────►  api_error_unhandled (+ api_request_failed en cliente)
        └─ 201 ─────────────────────────────────────────────────►  outbound_order_created
                 │
                 └─ stock cae por debajo del mínimo ─────────────►  stock_threshold_triggered
        │
        ▼
 [6] el usuario sale sin enviar con éxito ────────────────────►  flow_abandoned
```

**Puntos de instrumentación (≥ 5 exigidos; aquí 10):**

| Punto | Dónde (archivo) | Evento | Tipo de punto |
|---|---|---|---|
| P1 | Cambio de ruta del layout protegido (`(protected)/layout.tsx`) | `page_viewed` | navegación |
| P2 | Primer `change` en `outbound/page.tsx` e `inbound/page.tsx` | `form_started` | flujo |
| P3 | Cálculo `exceeds` en `outbound/page.tsx` | `stock_warning_shown` | validación en cliente |
| P4 | `create_exit` / `create_entry` en `inventory_service.py` (rama `InsufficientStock`, `AssetNotFound`) y handler de 422 | `order_validation_failed` | **validación fallida** |
| P5 | Handler 422 `extra_forbidden` y 405 de `/inventory/products*` (middleware o `exception_handler`) | `direct_stock_edit_rejected` | **intento directo de modificar stock, rechazado** |
| P6 | Tras `session.commit()` en `create_exit` | `outbound_order_created` | éxito de negocio |
| P7 | Justo después, comparando `stock_before`/`stock_after` con el umbral | `stock_threshold_triggered` | **activación de umbral mínimo** |
| P8 | `apiFetch` en la rama 401 (`apiClient.ts`) | `session_expired` | autenticación |
| P9 | `pagehide`/desmontaje del formulario con `form_started` previo y sin éxito | `flow_abandoned` | abandono |
| P10 | Tras `session.commit()` en `create_entry` (flujo de entrada, mismo patrón que el de salida) | `inbound_order_created` y, si procede, `kit_cost_variance_detected` | éxito de negocio y anomalía de costo |

> Nota sobre P5: hoy la API **no rechaza explícitamente** esos intentos con un mensaje propio; lo hace por construcción (`extra="forbid"` y ausencia de rutas). Por eso el evento se dispara desde los handlers de 422/405 filtrando por ruta `/inventory/products*` y por campos conocidos (`current_stock`, `stock`, `quantity`).

### 1.3 Otras secciones del backoffice que aportan datos

Más allá del inventario, cada parte de la aplicación que alguien (humano o proceso) toca:

| Área | Qué hay hoy | Oportunidades que se capturan | Eventos |
|---|---|---|---|
| **Autenticación** | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account/change-password`, JWT en `localStorage`, caducidad | Fallos y éxitos de login, caducidad de sesión en mitad de una tarea, logout vs caducidad, altas de usuario, embudo de recuperación de contraseña, intentos de cambio de contraseña con sesión posiblemente robada | `login_failed`, `login_succeeded`, `session_expired`, `logout_completed`, `user_registered`, `password_reset_requested`, `password_reset_completed`, `password_change_failed` |
| **Rendimiento** | `timing_middleware`, cachés TTL (30 s), Lighthouse en laboratorio, paginación 50 en 50 | Latencia real por endpoint, tasa real de aciertos de caché, Core Web Vitals reales por pantalla y dispositivo | `api_latency_recorded`, `cache_lookup_recorded`, `page_load_measured` |
| **Errores** | Error boundaries que ocultan el error al usuario, handler global 500, `ApiError` (network/timeout/parse), `email_service` que solo escribe en el log | Errores de render no capturados, fallos de red/timeout vistos solo por el cliente, 500 inesperados, correos de recuperación que no salen | `frontend_error_captured`, `api_request_failed`, `api_error_unhandled`, `email_delivery_failed` |
| **Navegación** | `NavMenu` con 11 enlaces, 10 formularios, «Mostrar más» en incidencias | Secciones más usadas, orden de visita, formularios iniciados/abandonados y dónde, profundidad de paginación | `page_viewed`, `form_started`, `flow_abandoned`, `list_load_more_clicked` |
| **Incidencias** | Gestor con estados `open → in_progress → resolved/discarded`, SLA de 24 h | Entrada por categoría/origen/sede, tiempo en cada estado | `incident_created`, `incident_status_changed` |
| **Catálogo de inventario** | Alta de activos con SKU único | Ritmo de altas, duplicados (409) | `product_created`, `product_creation_rejected`, `inbound_order_created` |

### 1.4 Catálogo completo y clasificación

**30 eventos: 5 obligatorios (del BRIEFING) + 25 oportunidades identificadas.**

| # | event_type | Clase | Categoría | Origen | Entrega |
|---|---|---|---|---|---|
| 1 | `outbound_order_created` | **obligatorio** | negocio/inventario | backend | batch |
| 2 | `direct_stock_edit_rejected` | **obligatorio** | negocio/inventario | backend | stream |
| 3 | `stock_threshold_triggered` | **obligatorio** | negocio/inventario | backend | stream |
| 4 | `kit_cost_variance_detected` | **obligatorio** | negocio/inventario | backend | stream |
| 5 | `inbound_order_created` | **obligatorio** | negocio/inventario | backend | batch |
| 6 | `order_validation_failed` | identificada | negocio/inventario | backend | batch |
| 7 | `login_failed` | identificada | autenticación | backend | stream |
| 8 | `page_viewed` | identificada | navegación | frontend | batch |
| 9 | `flow_abandoned` | identificada | navegación | frontend | batch |
| 10 | `product_created` | identificada | negocio/inventario | backend | batch |
| 11 | `product_creation_rejected` | identificada | negocio/inventario | backend | batch |
| 12 | `stock_warning_shown` | identificada | negocio/inventario | frontend | batch |
| 13 | `incident_created` | identificada | negocio/incidencias | backend | batch |
| 14 | `incident_status_changed` | identificada | negocio/incidencias | backend | batch |
| 15 | `user_registered` | identificada | autenticación | backend | batch |
| 16 | `login_succeeded` | identificada | autenticación | backend | batch |
| 17 | `session_expired` | identificada | autenticación | frontend | batch |
| 18 | `logout_completed` | identificada | autenticación | frontend | batch |
| 19 | `password_reset_requested` | identificada | autenticación | backend | batch |
| 20 | `password_reset_completed` | identificada | autenticación | backend | batch |
| 21 | `password_change_failed` | identificada | autenticación | backend | stream |
| 22 | `api_latency_recorded` | identificada | rendimiento | backend | batch |
| 23 | `page_load_measured` | identificada | rendimiento | frontend | batch |
| 24 | `cache_lookup_recorded` | identificada | rendimiento | backend | batch |
| 25 | `frontend_error_captured` | identificada | errores | frontend | stream |
| 26 | `api_request_failed` | identificada | errores | frontend | batch |
| 27 | `api_error_unhandled` | identificada | errores | backend | stream |
| 28 | `email_delivery_failed` | identificada | errores | backend | stream |
| 29 | `form_started` | identificada | navegación | frontend | batch |
| 30 | `list_load_more_clicked` | identificada | navegación | frontend | batch |

Reparto por categoría:

| Categoría | Total | Obligatorios | Identificadas |
|---|---|---|---|
| negocio/inventario | 9 | 5 | 4 |
| autenticación | 8 | 0 | 8 |
| navegación | 4 | 0 | 4 |
| negocio/incidencias | 2 | 0 | 2 |
| rendimiento | 3 | 0 | 3 |
| errores | 4 | 0 | 4 |

### 1.5 Hipótesis y decisión de cada evento

Regla de oro aplicada a todos: *«Capturamos [event_type] porque necesitamos saber [hipótesis], lo que nos permite tomar la decisión [decisión]»*. Ningún evento del catálogo quedó sin completar la frase; los que no podían completarse se descartaron (sección 4).

1. **`outbound_order_created`** (obligatorio): *Capturamos `outbound_order_created` porque necesitamos saber qué programas consumen más material y a qué ritmo, lo que nos permite tomar la decisión de anticipar necesidades de reposición antes de una ola grande de matrículas (Elena).*
2. **`direct_stock_edit_rejected`** (obligatorio): *Capturamos `direct_stock_edit_rejected` porque necesitamos saber si el personal intenta saltarse el control de trazabilidad del material, lo que nos permite tomar la decisión de reforzar capacitación o permisos en la oficina donde esto ocurre con más frecuencia (Patricia).*
3. **`stock_threshold_triggered`** (obligatorio): *Capturamos `stock_threshold_triggered` porque necesitamos saber con qué frecuencia un programa se queda sin material disponible, lo que nos permite tomar la decisión de ajustar el umbral mínimo o acelerar la reimpresión/reproducción de ese material.*
4. **`kit_cost_variance_detected`** (obligatorio): *Capturamos `kit_cost_variance_detected` porque necesitamos saber cuándo un proveedor de material sube precios de forma anómala, lo que nos permite tomar la decisión de alertar a Elena y a Laura para renegociar o buscar proveedor alterno.*
5. **`inbound_order_created`** (obligatorio): *Capturamos `inbound_order_created` porque necesitamos saber cuánto material se produce/compra, para qué programa y con qué costo, lo que nos permite tomar la decisión de planificar la producción de material según demanda esperada de matrículas (Elena).*
6. **`order_validation_failed`** (identificada): *Capturamos `order_validation_failed` porque necesitamos saber qué productos y qué programas acumulan más errores de validación y en qué campos (pregunta del tech lead), lo que nos permite tomar la decisión de corregir el formulario o los datos maestros del producto problemático, o ajustar el umbral de reposición.*
7. **`login_failed`** (identificada): *Capturamos `login_failed` porque necesitamos saber cuántos intentos fallidos hay por día y si se concentran sobre una misma cuenta, lo que nos permite tomar la decisión de activar bloqueo o rate-limit por cuenta, avisar al usuario afectado y detectar ataques de fuerza bruta.*
8. **`page_viewed`** (identificada): *Capturamos `page_viewed` porque necesitamos saber qué secciones visitan más los operadores y en qué orden, lo que nos permite tomar la decisión de priorizar mejoras en las secciones más usadas, reordenar el menú (`NavMenu`) y retirar las que nadie usa.*
9. **`flow_abandoned`** (identificada): *Capturamos `flow_abandoned` porque necesitamos saber qué flujos se abandonan a la mitad y en qué campo, lo que nos permite tomar la decisión de simplificar o dividir el formulario con más abandono, o reubicar el campo donde se abandona.*
10. **`product_created`** (identificada): *Capturamos `product_created` porque necesitamos saber a qué ritmo crece el catálogo y en qué categorías/oficinas, lo que nos permite tomar la decisión de revisar si hace falta una política de alta de activos o consolidar SKUs.*
11. **`product_creation_rejected`** (identificada): *Capturamos `product_creation_rejected` porque necesitamos saber si los operadores no encuentran un activo existente y lo vuelven a dar de alta, lo que nos permite tomar la decisión de mejorar la búsqueda de activos o mostrar el SKU existente en el error.*
12. **`stock_warning_shown`** (identificada): *Capturamos `stock_warning_shown` porque necesitamos saber cuántas veces el aviso en cliente evita (o no) el rechazo del servidor y si el stock mostrado está desactualizado, lo que nos permite tomar la decisión de decidir si el aviso debe bloquear el envío y si hay que refrescar el stock más a menudo.*
13. **`incident_created`** (identificada): *Capturamos `incident_created` porque necesitamos saber cuántas incidencias entran por categoría, origen y sede, lo que nos permite tomar la decisión de reasignar personal de soporte a la sede o categoría que más crece.*
14. **`incident_status_changed`** (identificada): *Capturamos `incident_status_changed` porque necesitamos saber cuánto tarda cada fase del ciclo de vida y cuántas se descartan, lo que nos permite tomar la decisión de atacar el cuello de botella con más espera y revisar el SLA de 24 h.*
15. **`user_registered`** (identificada): *Capturamos `user_registered` porque necesitamos saber a qué ritmo se crean cuentas y si coincide con altas de personal, lo que nos permite tomar la decisión de detectar altas inesperadas y dimensionar el soporte de onboarding.*
16. **`login_succeeded`** (identificada): *Capturamos `login_succeeded` porque necesitamos saber cuántos operadores activos hay por día/hora y cuántos `login_failed` de la misma sesión preceden a un éxito (el pipeline lo calcula por `sessionId`), lo que nos permite tomar la decisión de definir horarios de soporte y calibrar el umbral de bloqueo de `login_failed`.*
17. **`session_expired`** (identificada): *Capturamos `session_expired` porque necesitamos saber si los operadores pierden la sesión en mitad de una tarea y cuánto dura una sesión útil, lo que nos permite tomar la decisión de ajustar la caducidad del JWT o añadir renovación silenciosa.*
18. **`logout_completed`** (identificada): *Capturamos `logout_completed` porque necesitamos saber cuántas sesiones terminan en logout frente a caducidad, lo que nos permite tomar la decisión de decidir si recordar o alargar la sesión.*
19. **`password_reset_requested`** (identificada): *Capturamos `password_reset_requested` porque necesitamos saber cuántos usuarios olvidan la contraseña y si hay solicitudes masivas sobre un email, lo que nos permite tomar la decisión de activar rate-limit en el endpoint y evaluar SSO.*
20. **`password_reset_completed`** (identificada): *Capturamos `password_reset_completed` porque necesitamos saber qué porcentaje de enlaces se convierte en contraseña cambiada y cuántos caducan, lo que nos permite tomar la decisión de alargar la validez del enlace o simplificar el correo.*
21. **`password_change_failed`** (identificada): *Capturamos `password_change_failed` porque necesitamos saber si una sesión robada intenta adivinar la contraseña actual, lo que nos permite tomar la decisión de cerrar la sesión y forzar un restablecimiento si hay varios fallos seguidos.*
22. **`api_latency_recorded`** (identificada): *Capturamos `api_latency_recorded` porque necesitamos saber qué endpoints son lentos y si los cachés TTL reducen la latencia en producción (hoy solo hay medidas de laboratorio), lo que nos permite tomar la decisión de decidir qué endpoint optimizar o cachear y detectar regresiones tras un despliegue.*
23. **`page_load_measured`** (identificada): *Capturamos `page_load_measured` porque necesitamos saber qué pantallas tienen tiempos de carga reales peores que los de Lighthouse y en qué dispositivos, lo que nos permite tomar la decisión de priorizar la optimización (carga diferida, paginación) de las pantallas con p75 fuera de umbral.*
24. **`cache_lookup_recorded`** (identificada): *Capturamos `cache_lookup_recorded` porque necesitamos saber la tasa real de aciertos y si el TTL de 30 s es adecuado para incidencias e inventario, lo que nos permite tomar la decisión de subir, bajar o eliminar el TTL de un caché.*
25. **`frontend_error_captured`** (identificada): *Capturamos `frontend_error_captured` porque necesitamos saber qué pantallas fallan en producción sin que nadie lo reporte y si un despliegue introdujo una regresión, lo que nos permite tomar la decisión de revertir o corregir el despliegue; priorizar el componente con más fallos.*
26. **`api_request_failed`** (identificada): *Capturamos `api_request_failed` porque necesitamos saber qué endpoints fallan desde el navegador del usuario aunque el servidor no lo registre (CORS, proxy, red), lo que nos permite tomar la decisión de ajustar timeouts, reintentos o el proxy de Next.js.*
27. **`api_error_unhandled`** (identificada): *Capturamos `api_error_unhandled` porque necesitamos saber qué rutas lanzan errores inesperados y si coinciden con un despliegue o con la base de datos de Supabase, lo que nos permite tomar la decisión de avisar a la persona de guardia y corregir o revertir.*
28. **`email_delivery_failed`** (identificada): *Capturamos `email_delivery_failed` porque necesitamos saber si los usuarios que piden recuperar la contraseña nunca reciben el enlace, lo que nos permite tomar la decisión de corregir la configuración del proveedor o activar un canal alternativo.*
29. **`form_started`** (identificada): *Capturamos `form_started` porque necesitamos saber cuántos formularios se inician (denominador de `flow_abandoned`) y cuántos terminan con éxito, lo que nos permite tomar la decisión de calcular la tasa de conversión por formulario y priorizar el rediseño del peor.*
30. **`list_load_more_clicked`** (identificada): *Capturamos `list_load_more_clicked` porque necesitamos saber cuántas páginas recorren realmente los usuarios y si 50 es un buen tamaño de página, lo que nos permite tomar la decisión de cambiar el tamaño de página o añadir filtros por defecto.*

---

## 2. Fase 2 — Event Envelope y esquemas

### 2.0 Event Envelope (común a los 30 eventos)

Todo evento es un objeto JSON con **exactamente** estas claves de primer nivel (`additionalProperties: false`):

| Campo | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `eventId` | string (UUID v4) | sí | UUID generado en origen; clave de idempotencia (el pipeline descarta duplicados). |
| `timestamp` | string (ISO 8601 UTC, ms) | sí | Instante del hecho: `2026-11-24T10:15:30.123Z`. Lo pone el origen; el pipeline añade `receivedAt` aparte (no forma parte del envelope emitido). |
| `sessionId` | string | sí | UUID v4 por pestaña (`sessionStorage`), rotado tras logout. En backend se toma del header `X-Session-Id`; si falta, `none`. Existe porque la API es sin estado. |
| `userId` | string | sí | `sub` del JWT (id interno). `anonymous` si no hay sesión. |
| `event_type` | string | sí | Taxonomía `entidad_acción` (ver abajo). |
| `schemaVersion` | string (SemVer) | sí | Versión del esquema de ese `event_type`. Hoy `1.0.0`. |
| `requestId` | string (UUID v4) | sí | Correlación frontend ↔ backend ↔ logs: el frontend lo crea en `apiFetch` y lo envía en `X-Request-Id`; la API lo reutiliza (o genera uno si falta) y lo escribe en cada línea de log. Eventos de UI sin petición llevan un UUID propio. |
| `source` | `frontend` \| `backend` | sí | Extensión propia al mínimo pedido: quién emitió el evento. |
| `properties` | object | sí | Payload específico, restringido por el **allowlist** del evento. Puede ser `{}` solo si el evento no define propiedades (ninguno de los actuales). |

Ejemplo (`stock_threshold_triggered`, mínimos de inventario del BRIEFING):

```json
{
  "eventId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "timestamp": "2026-11-24T10:15:30.123Z",
  "sessionId": "3f2b8c1a-9d4e-4b7a-8c11-2d5e6f708192",
  "userId": "usr_01HZX4",
  "event_type": "stock_threshold_triggered",
  "schemaVersion": "1.0.0",
  "requestId": "b1e2c3d4-5f60-4a71-8b92-0c1d2e3f4a5b",
  "source": "backend",
  "properties": {
    "triggering_order_id": 981, "product_id": 12, "product_sku": "KIT-VB2B-01", "product_category": "training_kit",
    "programme_id": "ventas-b2b", "office": "valencia", "quantity": 3, "currency": "EUR",
    "level": "low", "stock_before": 7, "stock_after": 4, "min_stock": 6
  }
}
```

### 2.1 Taxonomía `entidad_acción`

- `entidad` en snake_case y singular (`order`, `asset`, `stock`, `login`, `session`, `page`, `form`, `incident`, `cache`, `api`); `acción` en **participio pasado**: `created`, `rejected`, `triggered`, `failed`, `expired`, `viewed`, `started`, `abandoned`, `changed`, `recorded`, `measured`, `captured`, `completed`, `requested`, `shown`, `clicked`.
- **Verbos con significado fijo:** `created` = persistido con éxito · `rejected` = el sistema se negó por regla de negocio · `failed` = falló una operación técnica o de credenciales · `recorded`/`measured` = medición técnica · `shown`/`clicked`/`viewed` = interacción de UI.
- Los 5 `event_type` obligatorios conservan **exactamente** el nombre del BRIEFING, aunque no todos sigan el patrón estricto (`direct_stock_edit_rejected`, `stock_threshold_triggered`, `kit_cost_variance_detected`).
- Un `event_type` **nunca cambia de significado**; si cambia el payload se sube `schemaVersion` (patch: descripción; minor: propiedad opcional nueva; major: propiedad quitada o con otro tipo → el pipeline acepta N y N−1 durante 30 días).

### 2.2 Allowlist de propiedades (regla de seguridad)

1. Cada evento declara en `event-schemas.json` (`x-propertyAllowlist` y `properties.additionalProperties: false`) la lista **cerrada** de claves permitidas. Lo que no está, **no se emite**.
2. El emisor construye `properties` **a mano, clave por clave** (nunca con `model_dump()`, `{...request.body}` ni `JSON.stringify(error)`), de modo que añadir un campo al modelo no lo filtra a telemetría por accidente.
3. El validador del pipeline rechaza (y cuenta en una métrica `telemetry_rejected_total`) cualquier evento con claves fuera del allowlist, valores fuera de enum o strings más largos que `maxLength`.
4. Prohibido siempre, en cualquier evento: contraseñas, tokens JWT o de recuperación, emails en claro, `title`/`description` de incidencias, `assigned_to`, cuerpos de petición, mensajes de excepción, trazas, query strings.

### 2.3 Datos sensibles y sanitización por evento

Técnicas usadas: **omisión** (el dato no se emite), **hash con pepper** (`email_hash` = 16 primeros hex de HMAC-SHA256(email en minúsculas, `TELEMETRY_PEPPER`); el pepper va en variable de entorno y se rota anualmente, lo que corta la correlación histórica a propósito), **normalización** (trim/minúsculas/truncado), **plantilla de ruta** (`/inventory/products/{asset_id}`, nunca la URL con ids ni query).

| Evento | PII / datos sensibles y cómo se sanean |
|---|---|
| `outbound_order_created` | No se emite el nombre del destinatario (`assigned_to`, cliente, candidato, consultor, agente). Solo `has_assignee` y, si el sistema lo registra, `recipient_type`. |
| `direct_stock_edit_rejected` | Sin PII. No se emite el valor intentado en bruto: `quantity` es el número intentado solo si es entero (o `null`). |
| `stock_threshold_triggered` | Sin PII. |
| `kit_cost_variance_detected` | Sin PII. Importes en la moneda de la oficina; **no se convierte moneda**: el histórico solo se compara dentro de la misma moneda. |
| `inbound_order_created` | `supplier` es el nombre de una empresa en texto libre: se normaliza (trim, minúsculas, máx. 80) y la ingesta descarta valores con forma de email o teléfono. Los importes van en la moneda de la oficina, sin conversión. |
| `order_validation_failed` | Sin PII. Nunca se emite el texto del error ni el valor de `assigned_to`; solo nombres de campo del allowlist. |
| `login_failed` | El email NO se emite. `email_hash` = primeros 16 hex de HMAC-SHA256(email en minúsculas, `TELEMETRY_PEPPER`); el pepper vive en variables de entorno, nunca en el repo. `userId` = `anonymous`. |
| `page_viewed` | Solo `route_template` sin query string ni hash (`?productId=` se descarta). |
| `flow_abandoned` | Nunca se emite el contenido de los campos, solo cuántos y cuál fue el último con foco (nombre de campo del allowlist). |
| `product_created` | Sin PII. |
| `product_creation_rejected` | El SKU duplicado no es PII; no se emite el nombre libre. |
| `stock_warning_shown` | Sin PII. |
| `incident_created` | No se emiten `title` ni `description` (texto libre, pueden contener datos de clientes). |
| `incident_status_changed` | Sin PII. |
| `user_registered` | Sin email ni nombre. `userId` del usuario creado. |
| `login_succeeded` | Sin email. `userId` = id interno (seudónimo). |
| `session_expired` | Sin PII. |
| `logout_completed` | Sin PII. |
| `password_reset_requested` | El email NO se emite: solo `email_hash` (misma técnica que `login_failed`). No se revela si la cuenta existe. |
| `password_reset_completed` | El token NO se emite. |
| `password_change_failed` | Sin contraseñas ni longitudes. |
| `api_latency_recorded` | Solo `route_template` (nunca path con ids ni query string, como ya hace el middleware). |
| `page_load_measured` | Sin PII. `device_class` es una categoría, no el user-agent. |
| `cache_lookup_recorded` | Sin PII; la clave de caché nunca se emite (puede contener filtros). |
| `frontend_error_captured` | Nunca el `message` ni el stack (pueden contener URLs con tokens o datos): solo `error_name`, `fingerprint` (SHA-1 del mensaje normalizado, sin números ni ids) y el `digest` de Next.js. |
| `api_request_failed` | Solo la ruta plantilla, nunca la URL completa. |
| `api_error_unhandled` | No se emite el traceback ni el mensaje de la excepción (quedan en el log del servidor con el mismo `requestId`). |
| `email_delivery_failed` | Ni destinatario ni asunto: solo plantilla y causa. |
| `form_started` | Sin contenido de campos. |
| `list_load_more_clicked` | Sin PII. |

`userId` es un identificador interno seudónimo (no email ni nombre): es dato personal en sentido RGPD (Nexova opera en España), por lo que la retención de telemetría con `userId` se limita a **13 meses** y se documenta como tratamiento de «seguridad y mejora del servicio».

### 2.4 Esquema detallado por evento

Aplican a todos los eventos las propiedades del envelope de 2.0; abajo solo se listan las `properties` específicas. La versión máquina-legible, con patrones, mínimos y máximos, está en `event-schemas.json`.

### 2.4.1 `outbound_order_created`

- **Clase:** obligatorio (BRIEFING) · **Categoría:** negocio/inventario · **Emite:** backend · **Entrega:** batch (diario (carga horaria))
- **Descripción:** Se entrega un kit o certificado a un cliente, candidato, consultor o agente (orden de salida registrada con éxito).
- **PII / sanitización:** No se emite el nombre del destinatario (`assigned_to`, cliente, candidato, consultor, agente). Solo `has_assignee` y, si el sistema lo registra, `recipient_type`.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `order_id` | integer | sí | id de la orden de salida (asset_exit.id) |
| `product_id` | integer | sí | id del producto |
| `product_category` | enum (training_kit, certification, onboarding_equipment) | sí | categoría del producto |
| `programme_id` | string | sí | programa de formación o certificación (p. ej. ventas-b2b) |
| `office` | enum (valencia, miami) | sí | oficina de la orden (no depende del idioma de la interfaz) |
| `quantity` | integer | sí | unidades entregadas |
| `currency` | enum (EUR, USD) | sí | moneda de la oficina: EUR para valencia, USD para miami (sin conversión) |
| `product_sku` | string | sí | SKU del producto |
| `exit_type` | enum (allocation, consumption) | sí | allocation o consumption |
| `stock_after` | integer | sí | stock calculado tras la orden |
| `has_assignee` | boolean | sí | true si la salida es una asignación a una persona |
| `recipient_type` | enum (client, candidate, consultant, support_agent) | no | tipo de destinatario; solo si el sistema lo registra (hoy no existe, ver 0.1) |

### 2.4.2 `direct_stock_edit_rejected`

- **Clase:** obligatorio (BRIEFING) · **Categoría:** negocio/inventario · **Emite:** backend · **Entrega:** stream (< 10 s)
- **Descripción:** Un usuario intenta modificar el stock directamente (enviar `current_stock`/`stock` en el alta de un producto, o PUT/PATCH/DELETE sobre `/inventory/products/{asset_id}`) y el sistema lo rechaza. El stock solo cambia por `InboundOrder`/`OutboundOrder`.
- **PII / sanitización:** Sin PII. No se emite el valor intentado en bruto: `quantity` es el número intentado solo si es entero (o `null`).

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `product_id` | integer o null | sí | id del producto de la ruta; null en un alta (no existe aún) |
| `product_category` | enum o null (training_kit, certification, onboarding_equipment) | sí | categoría si viene en el cuerpo; si no, null |
| `programme_id` | string o null | sí | programa del producto si se conoce; si no, null |
| `office` | enum (valencia, miami) | sí | oficina del usuario/producto (la del producto si existe; si no, la del cuerpo) |
| `quantity` | integer o null | sí | cantidad numérica que se intentó fijar; null si no era un entero |
| `currency` | enum (EUR, USD) | sí | moneda de la oficina |
| `attempt_kind` | enum (extra_field_on_create, method_not_allowed_on_product) | sí | forma del intento detectada |
| `http_method` | enum (POST, PUT, PATCH, DELETE) | sí | método HTTP |
| `route_template` | string | sí | ruta con plantilla, p. ej. /inventory/products/{asset_id} |
| `http_status` | enum (405, 422) | sí | estado devuelto |
| `offending_field` | enum (current_stock, stock, quantity) | no | campo prohibido enviado |
| `suppressed_count` | integer | sí | intentos iguales descartados por throttle desde el último evento |

### 2.4.3 `stock_threshold_triggered`

- **Clase:** obligatorio (BRIEFING) · **Categoría:** negocio/inventario · **Emite:** backend · **Entrega:** stream (< 30 s)
- **Descripción:** Tras una orden de salida, el stock de un producto cae por debajo del mínimo configurado (`stock_after < min_stock`).
- **PII / sanitización:** Sin PII.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `triggering_order_id` | integer | sí | orden de salida que cruzó el mínimo |
| `product_id` | integer | sí | id del producto |
| `product_category` | enum (training_kit, certification, onboarding_equipment) | sí | categoría del producto |
| `programme_id` | string | sí | programa de formación o certificación (p. ej. ventas-b2b) |
| `office` | enum (valencia, miami) | sí | oficina de la orden (no depende del idioma de la interfaz) |
| `quantity` | integer | sí | unidades de la orden de salida que provocó el cruce |
| `currency` | enum (EUR, USD) | sí | moneda de la oficina: EUR para valencia, USD para miami (sin conversión) |
| `product_sku` | string | sí | SKU del producto |
| `level` | enum (low, out) | sí | low (0 < stock < min_stock) u out (stock = 0) |
| `stock_before` | integer | sí | stock antes de la orden |
| `stock_after` | integer | sí | stock tras la orden |
| `min_stock` | integer | sí | mínimo configurado vigente para el producto |

### 2.4.4 `kit_cost_variance_detected`

- **Clase:** obligatorio (BRIEFING) · **Categoría:** negocio/inventario · **Emite:** backend · **Entrega:** stream (< 60 s)
- **Descripción:** El costo unitario de una orden de entrada varía más de un umbral (10 %) respecto al histórico del mismo producto y proveedor.
- **PII / sanitización:** Sin PII. Importes en la moneda de la oficina; **no se convierte moneda**: el histórico solo se compara dentro de la misma moneda.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `order_id` | integer | sí | orden de entrada que disparó la alerta |
| `product_id` | integer | sí | id del producto |
| `product_category` | enum (training_kit, certification, onboarding_equipment) | sí | categoría del producto |
| `programme_id` | string | sí | programa de formación o certificación (p. ej. ventas-b2b) |
| `office` | enum (valencia, miami) | sí | oficina de la orden (no depende del idioma de la interfaz) |
| `quantity` | integer | sí | unidades recibidas en la orden |
| `currency` | enum (EUR, USD) | sí | moneda de la oficina: EUR para valencia, USD para miami (sin conversión) |
| `product_sku` | string | sí | SKU del producto |
| `supplier_normalized` | string | sí | proveedor normalizado |
| `unit_cost` | number | sí | costo unitario de la orden |
| `baseline_unit_cost` | number | sí | media del costo unitario histórico del mismo producto y proveedor |
| `variance_pct` | number | sí | (unit_cost − baseline) / baseline × 100; con signo |
| `threshold_pct` | number | sí | umbral vigente (hoy 10) |
| `direction` | enum (increase, decrease) | sí | sube o baja respecto al histórico |
| `baseline_sample_size` | integer | sí | órdenes previas usadas (mínimo 3) |
| `suppressed_count` | integer | sí | alertas iguales agrupadas desde la última emitida |

### 2.4.5 `inbound_order_created`

- **Clase:** obligatorio (BRIEFING) · **Categoría:** negocio/inventario · **Emite:** backend · **Entrega:** batch (diario)
- **Descripción:** Llega un nuevo lote de material de formación o de incorporación desde un proveedor (orden de entrada registrada con éxito).
- **PII / sanitización:** `supplier` es el nombre de una empresa en texto libre: se normaliza (trim, minúsculas, máx. 80) y la ingesta descarta valores con forma de email o teléfono. Los importes van en la moneda de la oficina, sin conversión.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `order_id` | integer | sí | id de la orden de entrada |
| `product_id` | integer | sí | id del producto |
| `product_category` | enum (training_kit, certification, onboarding_equipment) | sí | categoría del producto |
| `programme_id` | string | sí | programa de formación o certificación (p. ej. ventas-b2b) |
| `office` | enum (valencia, miami) | sí | oficina de la orden (no depende del idioma de la interfaz) |
| `quantity` | integer | sí | unidades recibidas |
| `currency` | enum (EUR, USD) | sí | moneda de la oficina: EUR para valencia, USD para miami (sin conversión) |
| `product_sku` | string | sí | SKU del producto |
| `supplier_normalized` | string | sí | proveedor normalizado |
| `unit_cost` | number | sí | costo unitario en la moneda de la oficina |
| `total_cost` | number | sí | unit_cost × quantity, en la misma moneda |
| `stock_after` | integer | sí | stock tras la entrada |

### 2.4.6 `order_validation_failed`

- **Clase:** oportunidad identificada · **Categoría:** negocio/inventario · **Emite:** backend · **Entrega:** batch (diario (carga horaria))
- **Descripción:** Una orden de entrada o salida fue rechazada por validación o regla de negocio (stock insuficiente, activo inexistente, campo inválido). No se escribió nada.
- **PII / sanitización:** Sin PII. Nunca se emite el texto del error ni el valor de `assigned_to`; solo nombres de campo del allowlist.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `order_type` | enum (inbound, outbound) | sí | tipo de orden |
| `product_id` | integer | no | id del activo si venía en el cuerpo y es un entero |
| `product_sku` | string | no | SKU si el activo existe |
| `http_status` | enum (400, 404, 422) | sí | estado HTTP devuelto |
| `error_kind` | enum (insufficient_stock, asset_not_found, invalid_field, unknown_field) | sí | causa clasificada en servidor |
| `failed_fields` | array de asset_id, quantity, supplier, exit_type, assigned_to, office | no | nombres de campo con error (allowlist: asset_id, quantity, supplier, exit_type, assigned_to, office) |
| `requested_quantity` | integer | no | cantidad solicitada |
| `available_stock` | integer | no | stock disponible al rechazar (solo insufficient_stock) |
| `product_category` | enum (training_kit, certification, onboarding_equipment) | no | categoría, si el producto existe |
| `programme_id` | string | no | programa, si el producto existe |
| `office` | enum (valencia, miami) | no | oficina, si el cuerpo la traía válida |

### 2.4.7 `login_failed`

- **Clase:** oportunidad identificada · **Categoría:** autenticación · **Emite:** backend · **Entrega:** stream (< 10 s)
- **Descripción:** Credenciales rechazadas en `POST /auth/login` (401).
- **PII / sanitización:** El email NO se emite. `email_hash` = primeros 16 hex de HMAC-SHA256(email en minúsculas, `TELEMETRY_PEPPER`); el pepper vive en variables de entorno, nunca en el repo. `userId` = `anonymous`.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `email_hash` | string | sí | HMAC truncado del email enviado |
| `reason` | enum (bad_credentials) | sí | motivo del rechazo (hoy solo 401; el mensaje de la API no distingue email inexistente de contraseña errónea y la telemetría tampoco debe hacerlo) |

### 2.4.8 `page_viewed`

- **Clase:** oportunidad identificada · **Categoría:** navegación · **Emite:** frontend · **Entrega:** batch (diario (carga horaria))
- **Descripción:** Un usuario autenticado visualiza una sección del backoffice (cambio de ruta del App Router).
- **PII / sanitización:** Solo `route_template` sin query string ni hash (`?productId=` se descarta).

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `route_template` | string | sí | ruta del grupo de rutas, p. ej. /inventory/orders/outbound |
| `previous_route` | string | no | ruta anterior de esta sesión |
| `entry_type` | enum (initial_load, client_navigation, back_forward) | sí | cómo se llegó |
| `ui_language` | enum (es, en) | no | idioma de la interfaz; dimensión independiente de `office` |

### 2.4.9 `flow_abandoned`

- **Clase:** oportunidad identificada · **Categoría:** navegación · **Emite:** frontend · **Entrega:** batch (diario (carga horaria))
- **Descripción:** El usuario inicia un formulario (`form_started`) y sale de la página, cierra la pestaña o caduca la sesión sin enviarlo con éxito.
- **PII / sanitización:** Nunca se emite el contenido de los campos, solo cuántos y cuál fue el último con foco (nombre de campo del allowlist).

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `form_id` | enum (inbound_order, outbound_order, incident, supplier, register, forgot_password, reset_password, change_password, profile, csv_analysis) | sí | formulario abandonado |
| `last_field_focused` | string | no | nombre técnico del último campo con foco |
| `fields_filled` | integer | sí | campos con algún valor |
| `seconds_since_start` | integer | sí | segundos desde `form_started` |
| `exit_reason` | enum (navigated_away, tab_closed, session_expired) | sí | motivo detectado |

### 2.4.10 `product_created`

- **Clase:** oportunidad identificada · **Categoría:** negocio/inventario · **Emite:** backend · **Entrega:** batch (diario)
- **Descripción:** Se dio de alta un producto (material formativo o de incorporación) en el catálogo.
- **PII / sanitización:** Sin PII.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `product_id` | integer | sí | id del activo |
| `product_sku` | string | sí | SKU |
| `office` | enum (valencia, miami) | sí | oficina |
| `programme_id` | string | sí | programa del producto |
| `min_stock` | integer | sí | mínimo configurado inicial |
| `product_category` | enum (training_kit, certification, onboarding_equipment) | sí | categoría |

### 2.4.11 `product_creation_rejected`

- **Clase:** oportunidad identificada · **Categoría:** negocio/inventario · **Emite:** backend · **Entrega:** batch (diario)
- **Descripción:** El alta de un producto fue rechazada (SKU duplicado 409 o campos inválidos 422).
- **PII / sanitización:** El SKU duplicado no es PII; no se emite el nombre libre.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `http_status` | enum (409, 422) | sí | estado HTTP |
| `error_kind` | enum (duplicate_sku, invalid_field) | sí | causa |
| `product_sku` | string | no | SKU intentado |
| `failed_fields` | array de name, sku, category, office | no | campos con error |

### 2.4.12 `stock_warning_shown`

- **Clase:** oportunidad identificada · **Categoría:** negocio/inventario · **Emite:** frontend · **Entrega:** batch (diario (carga horaria))
- **Descripción:** El formulario de salida mostró «Supera el stock disponible» antes de enviar.
- **PII / sanitización:** Sin PII.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `product_id` | integer | sí | id del activo |
| `requested_quantity` | integer | sí | cantidad escrita |
| `displayed_stock` | integer | sí | stock mostrado al usuario |
| `stock_age_seconds` | integer | sí | segundos desde que se cargó ese stock |
| `office` | enum (valencia, miami) | sí | oficina del producto |

### 2.4.13 `incident_created`

- **Clase:** oportunidad identificada · **Categoría:** negocio/incidencias · **Emite:** backend · **Entrega:** batch (diario)
- **Descripción:** Se registró una incidencia en el gestor de incidencias.
- **PII / sanitización:** No se emiten `title` ni `description` (texto libre, pueden contener datos de clientes).

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `incident_id` | integer | sí | id |
| `incident_category` | enum (technical_failure, process_error, client_complaint, candidate_issue, staff_issue, sla_breach, data_quality, other) | sí | categoría |
| `origin` | enum (customer, branch, internal) | sí | origen |
| `branch` | enum (central, valencia_operations, miami_office, remote) | sí | sede |

### 2.4.14 `incident_status_changed`

- **Clase:** oportunidad identificada · **Categoría:** negocio/incidencias · **Emite:** backend · **Entrega:** batch (diario)
- **Descripción:** Cambio de estado de una incidencia (open→in_progress→resolved/discarded).
- **PII / sanitización:** Sin PII.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `incident_id` | integer | sí | id |
| `from_status` | enum (open, in_progress, resolved, discarded) | sí | estado anterior |
| `to_status` | enum (open, in_progress, resolved, discarded) | sí | estado nuevo |
| `seconds_in_previous_status` | integer | sí | segundos en el estado anterior |

### 2.4.15 `user_registered`

- **Clase:** oportunidad identificada · **Categoría:** autenticación · **Emite:** backend · **Entrega:** batch (diario)
- **Descripción:** Se creó una cuenta de usuario nueva (`POST /users`).
- **PII / sanitización:** Sin email ni nombre. `userId` del usuario creado.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `role` | string | sí | rol asignado |

### 2.4.16 `login_succeeded`

- **Clase:** oportunidad identificada · **Categoría:** autenticación · **Emite:** backend · **Entrega:** batch (diario (carga horaria))
- **Descripción:** Login correcto; marca el inicio de sesión de uso.
- **PII / sanitización:** Sin email. `userId` = id interno (seudónimo).

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `method` | enum (password) | sí | método de autenticación (hoy solo contraseña) |

### 2.4.17 `session_expired`

- **Clase:** oportunidad identificada · **Categoría:** autenticación · **Emite:** frontend · **Entrega:** batch (diario (carga horaria))
- **Descripción:** Una llamada protegida devolvió 401 y el cliente borró el token y redirigió a /login.
- **PII / sanitización:** Sin PII.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `route_template` | string | sí | ruta donde ocurrió |
| `session_age_seconds` | integer | no | segundos desde el login |
| `had_unsaved_form` | boolean | sí | true si había un formulario iniciado y sin enviar |

### 2.4.18 `logout_completed`

- **Clase:** oportunidad identificada · **Categoría:** autenticación · **Emite:** frontend · **Entrega:** batch (diario)
- **Descripción:** El usuario cierra sesión voluntariamente.
- **PII / sanitización:** Sin PII.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `session_age_seconds` | integer | no | duración de la sesión |

### 2.4.19 `password_reset_requested`

- **Clase:** oportunidad identificada · **Categoría:** autenticación · **Emite:** backend · **Entrega:** batch (diario)
- **Descripción:** Se solicitó un enlace de recuperación (`POST /auth/forgot-password`, que siempre responde igual).
- **PII / sanitización:** El email NO se emite: solo `email_hash` (misma técnica que `login_failed`). No se revela si la cuenta existe.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `email_hash` | string | sí | HMAC truncado |

### 2.4.20 `password_reset_completed`

- **Clase:** oportunidad identificada · **Categoría:** autenticación · **Emite:** backend · **Entrega:** batch (diario)
- **Descripción:** Una recuperación terminó (éxito) o fue rechazada (enlace inválido, caducado o usado).
- **PII / sanitización:** El token NO se emite.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `outcome` | enum (success, invalid_or_expired_token) | sí | resultado |

### 2.4.21 `password_change_failed`

- **Clase:** oportunidad identificada · **Categoría:** autenticación · **Emite:** backend · **Entrega:** stream (< 30 s)
- **Descripción:** Un usuario autenticado falló la contraseña actual en `POST /auth/change-password` (400).
- **PII / sanitización:** Sin contraseñas ni longitudes.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `suppressed_count` | integer | sí | fallos iguales descartados por throttle desde el último evento |

### 2.4.22 `api_latency_recorded`

- **Clase:** oportunidad identificada · **Categoría:** rendimiento · **Emite:** backend · **Entrega:** batch (horario)
- **Descripción:** Duración de una petición HTTP medida por el middleware `timing_middleware` de la API.
- **PII / sanitización:** Solo `route_template` (nunca path con ids ni query string, como ya hace el middleware).

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `http_method` | enum (GET, POST, PUT, PATCH, DELETE) | sí | método |
| `route_template` | string | sí | plantilla, p. ej. /inventory/products/{asset_id} |
| `http_status` | integer | sí | estado |
| `duration_ms` | number | sí | duración en ms |
| `sample_rate` | number | sí | fracción muestreada (1 o 0.1) |

### 2.4.23 `page_load_measured`

- **Clase:** oportunidad identificada · **Categoría:** rendimiento · **Emite:** frontend · **Entrega:** batch (horario)
- **Descripción:** Core Web Vitals reales (LCP, INP, CLS, TTFB) de una vista del backoffice.
- **PII / sanitización:** Sin PII. `device_class` es una categoría, no el user-agent.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `route_template` | string | sí | ruta |
| `metric` | enum (LCP, INP, CLS, TTFB) | sí | métrica |
| `value` | number | sí | valor (ms; CLS adimensional) |
| `rating` | enum (good, needs-improvement, poor) | sí | good/needs-improvement/poor según web-vitals |
| `device_class` | enum (desktop, mobile) | sí | clase de dispositivo |

### 2.4.24 `cache_lookup_recorded`

- **Clase:** oportunidad identificada · **Categoría:** rendimiento · **Emite:** backend · **Entrega:** batch (horario)
- **Descripción:** Resultado de una lectura de los cachés TTL (`TTLCache.get_or_load`): hit o miss.
- **PII / sanitización:** Sin PII; la clave de caché nunca se emite (puede contener filtros).

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `cache_name` | enum (inventory_products, incident_list, incident_summary) | sí | nombre del caché |
| `result` | enum (hit, miss) | sí | resultado |
| `sample_rate` | number | sí | fracción muestreada |

### 2.4.25 `frontend_error_captured`

- **Clase:** oportunidad identificada · **Categoría:** errores · **Emite:** frontend · **Entrega:** stream (< 60 s)
- **Descripción:** Error de render o excepción no capturada (error boundaries `error.tsx`/`global-error.tsx`, `window.onerror`, `unhandledrejection`).
- **PII / sanitización:** Nunca el `message` ni el stack (pueden contener URLs con tokens o datos): solo `error_name`, `fingerprint` (SHA-1 del mensaje normalizado, sin números ni ids) y el `digest` de Next.js.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `source` | enum (error_boundary, global_error, window_error, unhandled_rejection) | sí | origen |
| `route_template` | string | sí | ruta |
| `error_name` | string | sí | nombre de la clase de error |
| `fingerprint` | string | sí | hash del mensaje normalizado |
| `digest` | string | no | digest de Next.js, si existe |
| `app_version` | string | sí | versión/commit desplegado |

### 2.4.26 `api_request_failed`

- **Clase:** oportunidad identificada · **Categoría:** errores · **Emite:** frontend · **Entrega:** batch (horario)
- **Descripción:** Una llamada del cliente a la API falló por red, timeout (15 s), JSON no parseable o 5xx (`ApiError` kinds network/timeout/parse/http).
- **PII / sanitización:** Solo la ruta plantilla, nunca la URL completa.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `http_method` | enum (GET, POST, PUT, PATCH, DELETE) | sí | método |
| `route_template` | string | sí | ruta de API con plantilla |
| `kind` | enum (network, timeout, parse, http) | sí | tipo de fallo |
| `http_status` | integer | no | estado, 0 si no hubo respuesta |
| `duration_ms` | number | sí | ms hasta el fallo |

### 2.4.27 `api_error_unhandled`

- **Clase:** oportunidad identificada · **Categoría:** errores · **Emite:** backend · **Entrega:** stream (< 30 s)
- **Descripción:** Excepción no controlada que terminó en el 500 genérico del handler global (`errors.py`).
- **PII / sanitización:** No se emite el traceback ni el mensaje de la excepción (quedan en el log del servidor con el mismo `requestId`).

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `http_method` | enum (GET, POST, PUT, PATCH, DELETE) | sí | método |
| `route_template` | string | sí | ruta |
| `exception_class` | string | sí | clase de la excepción |
| `suppressed_count` | integer | sí | ocurrencias descartadas |

### 2.4.28 `email_delivery_failed`

- **Clase:** oportunidad identificada · **Categoría:** errores · **Emite:** backend · **Entrega:** stream (< 60 s)
- **Descripción:** No se pudo enviar un correo (sin `RESEND_API_KEY`, error de Resend o parámetros rechazados) desde `email_service`.
- **PII / sanitización:** Ni destinatario ni asunto: solo plantilla y causa.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `template` | enum (password_reset) | sí | plantilla |
| `reason` | enum (missing_api_key, provider_error, invalid_parameters) | sí | causa |

### 2.4.29 `form_started`

- **Clase:** oportunidad identificada · **Categoría:** navegación · **Emite:** frontend · **Entrega:** batch (diario (carga horaria))
- **Descripción:** El usuario modifica el primer campo de un formulario.
- **PII / sanitización:** Sin contenido de campos.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `form_id` | enum (inbound_order, outbound_order, incident, supplier, register, forgot_password, reset_password, change_password, profile, csv_analysis) | sí | formulario |

### 2.4.30 `list_load_more_clicked`

- **Clase:** oportunidad identificada · **Categoría:** navegación · **Emite:** frontend · **Entrega:** batch (diario)
- **Descripción:** Clic en «Mostrar más» del listado de incidencias (paginación de 50 en 50).
- **PII / sanitización:** Sin PII.

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `list_id` | enum (incidents) | sí | listado |
| `pages_shown` | integer | sí | páginas visibles tras el clic |
| `total_items` | integer | sí | elementos totales cargados |


### 2.5 Archivo `event-schemas.json`

Estructura: `events.<event_type>` contiene `schema` (JSON Schema draft-07 completo e independiente: envelope + `properties` con `additionalProperties:false`) más los metadatos `x-classification`, `x-category`, `x-source`, `x-capture` (la frase de hipótesis/decisión), `x-delivery`, `x-throttle`, `x-pii` y `x-propertyAllowlist`. Validado con `jsonschema` (Draft7Validator): los 30 esquemas son válidos y cada uno acepta su ejemplo y rechaza una clave extra.

---

## 3. Fase 3 — Estrategia de entrega

### 3.1 Stream vs batch

**Criterio único:** ¿la decisión que alimenta pierde valor si tarda más de unos minutos, o requiere que alguien reaccione mientras sucede? Si sí → *stream*. Si la decisión se toma sobre tendencias, rankings o embudos (diario/semanal) → *batch*. **No** se eligió por preferencia técnica.

Resumen: **8 stream** (seguridad, desabastecimiento y caídas) y **22 batch** (analítica de uso y calidad).

| Evento | Modo | Latencia objetivo | Justificación (urgencia de la decisión) |
|---|---|---|---|
| `direct_stock_edit_rejected` | STREAM | < 10 s | Señal de control interno: una ráfaga de intentos debe verse mientras ocurre y, a la vez, alimenta la comparación semanal por oficina. |
| `stock_threshold_triggered` | STREAM | < 30 s | Evita que un programa se quede sin material en plena ola de matrículas; la reimpresión es una decisión operativa inmediata. |
| `kit_cost_variance_detected` | STREAM | < 60 s | Cada lote comprado a precio anómalo es dinero ya comprometido; Elena y Laura necesitan la alerta para renegociar antes del siguiente pedido, no en el informe semanal. |
| `login_failed` | STREAM | < 10 s | Un ataque de credenciales se corta mientras ocurre; el recuento diario sale del mismo flujo. |
| `password_change_failed` | STREAM | < 30 s | Sesión posiblemente comprometida: la señal de seguridad debe reaccionar de inmediato. |
| `frontend_error_captured` | STREAM | < 60 s | Tras un despliegue, un pico de errores exige reacción inmediata (rollback). |
| `api_error_unhandled` | STREAM | < 30 s | Un 500 es un fallo del sistema; el equipo debe enterarse mientras sucede. |
| `email_delivery_failed` | STREAM | < 60 s | Cada fallo deja a un usuario sin acceso a su cuenta. |
| `outbound_order_created` | BATCH | diario (carga horaria) | Es análisis de demanda por programa y oficina para el dashboard de L&D y el reporte semanal; ninguna decisión cambia si llega unos minutos tarde. Las urgencias derivadas (stock bajo) las cubre `stock_threshold_triggered`. |
| `inbound_order_created` | BATCH | diario | Se usa para planificación de producción y compras (semanal); no pierde valor por tardar minutos. La anomalía de precio, que sí es urgente, va en `kit_cost_variance_detected`. |
| `order_validation_failed` | BATCH | diario (carga horaria) | El análisis es de tendencia por producto (ranking semanal). Un error aislado no exige actuar en segundos. |
| `page_viewed` | BATCH | diario (carga horaria) | Son patrones de uso agregados; se revisan semanalmente. |
| `flow_abandoned` | BATCH | diario (carga horaria) | Se interpreta con la tasa semanal frente a `form_started`. |
| `product_created` | BATCH | diario | Evento poco frecuente sin urgencia. |
| `product_creation_rejected` | BATCH | diario | Calidad de datos maestros; análisis semanal. |
| `stock_warning_shown` | BATCH | diario (carga horaria) | Evaluación de UX semanal. |
| `incident_created` | BATCH | diario | Carga de trabajo diaria/semanal. |
| `incident_status_changed` | BATCH | diario | Métrica de SLA que se revisa diariamente, no minuto a minuto. |
| `user_registered` | BATCH | diario | Volumen bajo, revisión diaria. |
| `login_succeeded` | BATCH | diario (carga horaria) | Actividad agregada. |
| `session_expired` | BATCH | diario (carga horaria) | Ajuste de configuración, análisis semanal. |
| `logout_completed` | BATCH | diario | Análisis de ciclo de sesión semanal. |
| `password_reset_requested` | BATCH | diario | Tendencia diaria; los fallos de entrega van aparte (`email_delivery_failed`). |
| `password_reset_completed` | BATCH | diario | Embudo semanal. |
| `api_latency_recorded` | BATCH | horario | Percentiles por ventana horaria; las alertas de salud usan los logs/APM, no este evento. |
| `page_load_measured` | BATCH | horario | Percentiles p75 por ruta; análisis semanal. |
| `cache_lookup_recorded` | BATCH | horario | Ajuste de configuración basado en tasas. |
| `api_request_failed` | BATCH | horario | Los 5xx del servidor ya alertan con `api_error_unhandled`; este evento ve lo que solo ve el cliente. |
| `form_started` | BATCH | diario (carga horaria) | Embudo semanal. |
| `list_load_more_clicked` | BATCH | diario | Ajuste de UX semanal. |

Notas de implementación (solo diseño):

- **Stream:** el backend escribe el evento en una cola en memoria y lo publica de forma asíncrona (como ya hace `BackgroundTasks` en `forgot-password`) para **no añadir latencia ni fallos a la petición del usuario**. Si la publicación falla, el evento se descarta con un contador; la telemetría nunca debe romper una orden de salida.
- **Batch:** los eventos de frontend se acumulan en memoria y se envían cada 10 s o al llegar a 20 eventos, y siempre en `pagehide` con `navigator.sendBeacon`. Los de backend se escriben como líneas JSON (`logger "telemetry"`) y un job horario las carga a almacenamiento.
- **Entrega:** *at-least-once*; `eventId` permite deduplicar en el destino.
- **Orden:** no se garantiza; se ordena por `timestamp` en el destino.

### 3.2 Estrategia de throttle / debounce

Eventos de alta frecuencia o susceptibles de ráfagas, y el control aplicado (columna completa para dejar constancia de los que no tienen control):

| Evento | Control |
|---|---|
| `outbound_order_created` | Ninguno: un evento por orden (volumen bajo, estimado < 500/día). |
| `direct_stock_edit_rejected` | Máx. 1 evento por (userId, attempt_kind) cada 10 s; el resto incrementa `suppressed_count` del siguiente evento emitido. |
| `stock_threshold_triggered` | Solo al CRUZAR el mínimo (`stock_before >= min_stock` y `stock_after < min_stock`), no en cada salida con stock bajo. Si el stock llega a 0 desde un nivel ya bajo se emite una vez más con `level='out'`. |
| `kit_cost_variance_detected` | Una vez por orden de entrada; a lo sumo 1 por (product_id, supplier_normalized) cada 24 h (las siguientes órdenes anómalas se agrupan en `suppressed_count`). |
| `inbound_order_created` | Ninguno. |
| `order_validation_failed` | Ninguno en servidor. En cliente el formulario ya impide reenvíos concurrentes (`saving`). |
| `login_failed` | Ninguno (cada fallo cuenta). El pipeline agrega por `email_hash` en ventanas de 5 min para alertar. |
| `page_viewed` | Deduplicar la misma ruta en < 1 s (doble efecto de React Strict Mode); no emitir al volver el foco a la pestaña. |
| `flow_abandoned` | Una vez por (form_id, sessionId) y montaje de formulario; se emite en `pagehide` con `navigator.sendBeacon`. |
| `product_created` | Ninguno. |
| `product_creation_rejected` | Ninguno. |
| `stock_warning_shown` | Debounce de 1 s tras la última pulsación; una vez por (product_id, cantidad) y montaje del formulario. |
| `incident_created` | Ninguno. |
| `incident_status_changed` | Ninguno. |
| `user_registered` | Ninguno. |
| `login_succeeded` | Ninguno. |
| `session_expired` | Una vez por sessionId y token (el redirect borra el token). |
| `logout_completed` | Ninguno. |
| `password_reset_requested` | Máx. 1 por (email_hash, 60 s). |
| `password_reset_completed` | Ninguno. |
| `password_change_failed` | Máx. 1 por (userId, 10 s). |
| `api_latency_recorded` | Muestreo: 100 % si status ≥ 400 o duración > 1000 ms; 10 % del resto, con `sample_rate` para reponderar. |
| `page_load_measured` | Una vez por (métrica, vista) con el valor final; LCP/INP/CLS al ocultar la página. |
| `cache_lookup_recorded` | Muestreo del 10 % con `sample_rate`; el contador acumulado también se puede volcar cada 60 s. |
| `frontend_error_captured` | Dedupe por `fingerprint`: 1 por minuto y sesión; máx. 20 por sesión. |
| `api_request_failed` | Máx. 1 por (route_template, kind) cada 30 s y sesión. |
| `api_error_unhandled` | Máx. 1 por (route_template, exception_class) cada 10 s; el resto suma a `suppressed_count`. |
| `email_delivery_failed` | Ninguno (volumen bajo). |
| `form_started` | Una vez por montaje de formulario (primer `change`). |
| `list_load_more_clicked` | Ninguno. |

Reglas transversales:

- **Muestreo reponderable:** todo evento muestreado lleva `sample_rate`; los conteos se reconstruyen como `COUNT / sample_rate`. Los casos anómalos (errores, lentos) se capturan al 100 %.
- **Presupuesto por sesión:** máximo **300 eventos de frontend por `sessionId` y hora**; superado, se descartan los de menor prioridad (rendimiento y navegación) y se conservan errores y negocio.
- **Backpressure:** cola en memoria acotada (1 000 eventos); si se llena, se descarta el más antiguo de la clase menos prioritaria y se incrementa `telemetry_dropped_total`.
- **Throttle por clave:** los límites de «1 por (clave, ventana)» se aplican en el origen; el evento siguiente informa lo suprimido (`suppressed_count`) para no perder el volumen.

---

## 4. Riesgos y exclusiones

### 4.1 Eventos considerados y descartados

| Evento candidato | Motivo del descarte |
|---|---|
| `nav_link_clicked` | Redundante: `page_viewed` con `previous_route` y `entry_type` da el mismo recorrido sin duplicar volumen. |
| `inventory_list_viewed`, `order_history_viewed` | Duplican `page_viewed` filtrando por `route_template`. |
| `product_list_filtered` (filtro de oficina) | Solo hay 2 oficinas; no cambia ninguna decisión. Reabrir si se añaden filtros ricos. |
| `api_request_started` | Dobla el volumen; `api_latency_recorded` ya contiene duración y estado. |
| `field_changed` / validación por pulsación | Volumen enorme y riesgo de capturar contenido; `flow_abandoned.last_field_focused` da lo necesario. |
| `profile_updated`, `user_updated`, `user_deleted` | Poco volumen y la auditoría pertenece a la base de datos, no a analítica. Se reevaluará si Dirección pide auditoría de cuentas. |
| `supplier_created`, `supplier_rated`, `supplier_status_changed`, `csv_analysis_completed` | El directorio de proveedores y el análisis CSV son periféricos al RFI; no hay hoy una decisión asociada. Se difieren a una v1.1 cuando haya pregunta de negocio (p. ej. compras). |
| `health_check_recorded` | Ruido: `/health` lo vigila infraestructura (monitor externo). |
| `stock_level_viewed` (cada vez que se muestra el badge) | Sin decisión: lo relevante es el cruce de umbral, no cada visualización. |

### 4.2 Datos que no se capturarán

| Dato | Razón |
|---|---|
| Emails de usuarios o de clientes finales | Privacidad (RGPD) y regla explícita del CONTEXT de Nexova: nunca en ninguna salida. Solo `email_hash`. |
| Nombre del destinatario (`assigned_to`, cliente, candidato, consultor, agente) | Dato personal; el BRIEFING prohíbe nombres en `properties`. La pregunta de negocio se responde con `has_assignee`; quien necesite el detalle lo consulta en la tabla `asset_exit`, con control de acceso. |
| `title`/`description` de incidencias | Texto libre que puede contener datos de clientes. |
| IP, user-agent en bruto, geolocalización | No necesarias para ninguna decisión; la IP, si hace falta para rate-limit, vive en logs de infraestructura con retención corta. |
| Contraseñas (ni longitud), tokens JWT o de recuperación | Seguridad. |
| Mensajes y trazas de excepción | Pueden incluir datos y tokens; se emite `exception_class`/`fingerprint` y el detalle queda en el log del servidor enlazado por `requestId`. |
| Grabación de sesión, mapas de calor, movimientos de ratón | Coste de almacenamiento y de cumplimiento desproporcionados para 30–120 usuarios internos. |
| 100 % de la latencia y de los cache hits | Coste: se muestrea al 10 %, salvo errores y lentos (ver 3.2). |

### 4.3 Riesgos del diseño

| Riesgo | Mitigación |
|---|---|
| El modelo de datos no tiene programa, costo, moneda ni mínimo por producto | Prerrequisito listado en 0.1; sin esas columnas los 5 obligatorios no pueden emitirse completos. |
| La categoría del BRIEFING no coincide con la del código (y `office_supplies` no encaja) | Decisión de negocio pendiente (Elena/Patricia) antes de migrar. |
| `kit_cost_variance_detected` necesita ≥ 3 órdenes previas por producto y proveedor | Sin histórico no se emite; los datos semilla deben incluir historial suficiente (BRIEFING §5). |
| El mínimo de stock vive solo en el frontend | Moverlo al backend como `min_stock` por producto; sin esto `stock_threshold_triggered` no puede emitirse en servidor. |
| `direct_stock_edit_rejected` depende de rechazos «por construcción» (422/405) | Test automatizado que intente `POST /inventory/products` con `current_stock` y `PATCH /inventory/products/1`, y verifique que el evento se emite. |
| La telemetría rompe el flujo de negocio | Emisión asíncrona, `try/except` aislado, nunca dentro de la transacción de `create_exit`; se emite **después** del `commit`. |
| Duplicados por reintentos o doble-click | `eventId` + deduplicación; `form`/`saving` ya impide doble envío. |
| Cardinalidad alta | Ningún campo libre se emite; todo texto es enum, id, hash o está truncado. |
| Caché TTL por proceso distorsiona métricas de stock | Los eventos de negocio se emiten desde la escritura (`create_exit`), no desde lecturas cacheadas; `stock_after` se calcula bajo el bloqueo de fila. |
| `email_hash` permite correlación entre eventos de una misma cuenta | Es intencional (detectar fuerza bruta); pepper secreto y rotación anual; retención de 13 meses. |
| Cambios de esquema rompen el pipeline | `schemaVersion` por evento y política N / N−1. |
| Usuarios que bloquean `sessionStorage`/`sendBeacon` | Se degradan: `sessionId` = UUID en memoria y los eventos de frontend se pierden sin error; se documenta el sesgo en los dashboards. |

---

## 5. Guía mínima para quien instrumente mañana

Orden recomendado, de menor a mayor riesgo:

1. **Transversal:** generar `requestId` en `apiFetch` (header `X-Request-Id`) y en `timing_middleware`; añadir `X-Request-Id` a `expose_headers` de CORS; generar `sessionId` por pestaña y enviarlo como `X-Session-Id`.
2. **Cerrar los huecos de datos de 0.1:** `programme_id`, categorías del BRIEFING, `unit_cost` + `currency` (derivada de la oficina) y `min_stock` por producto en el backend.
3. **Backend, inventario:** los 5 obligatorios (`inbound_order_created`, `outbound_order_created`, `stock_threshold_triggered`, `direct_stock_edit_rejected`, `kit_cost_variance_detected`) y `order_validation_failed`, siempre tras el `commit`.
4. **Backend, auth/errores/rendimiento:** `login_failed`, `login_succeeded`, `api_latency_recorded`, `api_error_unhandled`, `email_delivery_failed`.
5. **Frontend:** `page_viewed`, `form_started`, `flow_abandoned`, `session_expired`, `frontend_error_captured`, `api_request_failed`, `page_load_measured`.
6. **Resto** de eventos del catálogo.

**Definición de hecho por evento:** (a) valida contra su esquema en `event-schemas.json`; (b) test que dispara el caso y comprueba que se emite una sola vez y sin claves fuera del allowlist; (c) test negativo: el caso contrario no lo emite; (d) revisión de PII contra la tabla de 2.3.
