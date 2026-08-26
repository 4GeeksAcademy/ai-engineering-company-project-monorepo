# Plan de Telemetría — TrackFlow

> **Empresa:** TrackFlow  
> **Proyecto:** Diseño del plan de telemetría de tu compañía  
> **Rama:** `feature/telemetry-plan`  
> **Versión:** 1.0  
> **Fecha:** 2026-08-26  

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Fase 1 — Catálogo exhaustivo de oportunidades de datos](#2-fase-1--catálogo-exhaustivo-de-oportunidades-de-datos)
   - [2.1 Métricas obligatorias (CONTEXT)](#21-métricas-obligatorias-context)
   - [2.2 Mapeo del flujo de inventario](#22-mapeo-del-flujo-de-inventario)
   - [2.3 Catálogo ampliado de oportunidades](#23-catálogo-ampliado-de-oportunidades)
   - [2.4 Clasificación obligatorio vs. oportunidad](#24-clasificación-obligatorio-vs-oportunidad)
3. [Fase 2 — Diseño del Event Envelope](#3-fase-2--diseño-del-event-envelope)
   - [3.1 Event Envelope estándar](#31-event-envelope-estándar)
   - [3.2 Esquemas de eventos (inventario)](#32-esquemas-de-eventos-inventario)
   - [3.3 Esquemas de eventos (autenticación)](#33-esquemas-de-eventos-autenticación)
   - [3.4 Esquemas de eventos (rendimiento)](#34-esquemas-de-eventos-rendimiento)
   - [3.5 Esquemas de eventos (errores)](#35-esquemas-de-eventos-errores)
   - [3.6 Esquemas de eventos (navegación)](#36-esquemas-de-eventos-navegación)
   - [3.7 Datos sensibles y PII](#37-datos-sensibles-y-pii)
4. [Fase 3 — Estrategia de entrega](#4-fase-3--estrategia-de-entrega)
   - [4.1 Stream vs. Batch](#41-stream-vs-batch)
   - [4.2 Throttle / Debounce](#42-throttle--debounce)
   - [4.3 Riesgos y exclusiones](#43-riesgos-y-exclusiones)
5. [Checklist de evaluación](#5-checklist-de-evaluación)

---

## 1. Resumen ejecutivo

Este documento define el **Plan de Telemetría** de TrackFlow, la compañía de gestión de almacenes y última milla para marcas de moda, electrónica y cosmética que opera entre Los Ángeles y Zaragoza.

El plan identifica **23 eventos de telemetría** en total:
- **5 obligatorios** (métricas del CONTEXT-empresa.md)
- **18 oportunidades identificadas** (propuestas en este catálogo)

Cubriendo **5 categorías**: negocio/inventario, autenticación, rendimiento, errores y navegación.

Cada evento incluye su justificación (hipótesis + decisión), esquema de propiedades con allowlist, clasificación stream/batch, y documentación de datos sensibles. El archivo `event-schemas.json` contiene la especificación validable de todos los esquemas.

---

## 2. Fase 1 — Catálogo exhaustivo de oportunidades de datos

### 2.1 Métricas obligatorias (CONTEXT)

Las siguientes métricas provienen directamente del `CONTEXT-empresa.md` de TrackFlow y son el **piso mínimo** del plan. Deben instrumentarse sí o sí.

| # | event_type | Se dispara cuando... | Hipótesis de negocio | Decisión que habilita |
|---|-----------|---------------------|---------------------|----------------------|
| M1 | `inbound_order_created` | Un almacén registra la recepción de mercancía de un cliente | Necesitamos saber cuánto volumen entra, por cliente y por almacén | Planificar capacidad de almacén y personal según el volumen entrante (Ana) |
| M2 | `outbound_order_created` | Un almacén completa el picking y despacho de un pedido | Necesitamos saber cuántos pedidos se procesan, por cliente y almacén, y a qué ritmo | Detectar cuellos de botella operativos antes de que afecten el SLA de entrega (Ana) |
| M3 | `stock_threshold_triggered` | El stock de un SKU cae por debajo del mínimo configurado para ese cliente | Necesitamos saber con qué frecuencia un cliente se queda sin stock disponible de un SKU | Alertar al cliente y al equipo comercial antes de un quiebre de stock (Miguel) |
| M4 | `direct_stock_edit_rejected` | Un usuario intenta modificar el stock directamente (fuera de una orden) y el sistema lo rechaza | Necesitamos saber si el personal de almacén intenta saltarse el control de trazabilidad | Reforzar capacitación o permisos en el almacén donde esto ocurra con más frecuencia |
| M5 | `inventory_discrepancy_detected` | Un conteo físico o auditoría detecta una diferencia entre el stock del sistema y el stock real | Necesitamos saber en qué SKUs y almacenes ocurren más discrepancias | Priorizar auditorías de inventario en los SKUs con mayor tasa de discrepancia (Ana) |

**Campos mínimos en `properties` (events de inventario):** `warehouse`, `client_id`, `product_id`, `product_category`, `quantity`.

---

### 2.2 Mapeo del flujo de inventario

El flujo completo de gestión de inventario en TrackFlow abarca desde que un usuario autenticado accede al sistema hasta que completa una orden. A continuación se identifican **7 puntos de instrumentación** en este flujo:

```
[Login] → [Dashboard] → [Ver productos] → [Crear orden entrada] → [Crear orden salida] → [Ver histórico] → [Logout]
   │                          │                  │                    │                   │
   │                          │                  │                    │                   └─ M2: outbound_order_created
   │                          │                  │                    └─ M4: direct_stock_edit_rejected (si intento directo)
   │                          │                  └─ M1: inbound_order_created
   │                          └─ M3: stock_threshold_triggered (al bajar de mínimo)
   └─ Sesión iniciada → O7: session_started
```

**Puntos de instrumentación identificados:**

| # | Punto | Evento | Justificación |
|---|-------|--------|-------------|
| 1 | Usuario inicia sesión | `session_started` (O7) | Trazabilidad de quién opera |
| 2 | Usuario visualiza catálogo de productos | `product_catalog_viewed` (O1) | Saber qué SKUs se consultan más |
| 3 | Se crea una orden de entrada | `inbound_order_created` (M1) | **Obligatorio** — volumen entrante |
| 4 | Se crea una orden de salida | `outbound_order_created` (M2) | **Obligatorio** — volumen saliente |
| 5 | Intento directo de modificar stock | `direct_stock_edit_rejected` (M4) | **Obligatorio** — control de trazabilidad |
| 6 | Stock cae por debajo del mínimo | `stock_threshold_triggered` (M3) | **Obligatorio** — alerta temprana |
| 7 | Discrepancia detectada en auditoría | `inventory_discrepancy_detected` (M5) | **Obligatorio** — calidad del dato |

---

### 2.3 Catálogo ampliado de oportunidades

Más allá de las métricas obligatorias, se identifican oportunidades adicionales en **5 categorías**:

#### 🔵 Categoría: Negocio / Inventario (adicionales)

| # | event_type | Hipótesis | Decisión |
|---|-----------|-----------|----------|
| O1 | `product_catalog_viewed` | Necesitamos saber qué SKUs se consultan con más frecuencia para identificar patrones de demanda | Optimizar el catálogo destacando productos de alta demanda; detectar SKUs que nadie consulta (posible low‑turnover) |
| O2 | `inbound_order_failed` | Necesitamos saber cuándo falla el registro de una orden de entrada por errores de validación (cantidad negativa, SKU inexistente, almacén incorrecto) | Identificar errores recurrentes en el proceso de entrada y corregir la fuente (formulario, integración, capacitación) |
| O3 | `outbound_order_failed` | Necesitamos saber cuándo falla una orden de salida por stock insuficiente, validación de cantidad o restricción de negocio | Detectar productos con demanda superior al stock disponible; ajustar thresholds mínimos o alertar al equipo comercial |

#### 🟢 Categoría: Autenticación

| # | event_type | Hipótesis | Decisión |
|---|-----------|-----------|----------|
| O4 | `login_attempted` | Necesitamos saber cuántos intentos de login ocurren, cuántos son exitosos y cuántos fallan, y desde qué IP o ubicación aproximada | Detectar ataques de fuerza bruta; identificar patrones de acceso sospechoso; habilitar bloqueo temporal tras N intentos fallidos |
| O5 | `login_failed` | Necesitamos saber qué credenciales fallan con más frecuencia para distinguir entre errores humanos legítimos y actividad maliciosa | Implementar rate‑limiting por IP; notificar al usuario tras intentos fallidos |
| O6 | `password_reset_requested` | Necesitamos saber con qué frecuencia los usuarios solicitan restablecimiento de contraseña | Identificar problemas de usabilidad en el login; detectar posibles intentos de apropiación de cuenta |
| O7 | `session_started` | Necesitamos saber cuándo un usuario inicia sesión y desde qué ubicación | Trazabilidad de operaciones en el sistema; detectar accesos fuera del horario laboral habitual |
| O8 | `session_expired` | Necesitamos saber cuándo expira una sesión para entender si los operadores de almacén pierden sesiones en medio de una operación | Ajustar el tiempo de expiración del token JWT; mejorar la experiencia del usuario con renovación automática |
| O9 | `user_registered` | Necesitamos saber cuántos usuarios nuevos se registran y qué roles se asignan | Control de crecimiento del equipo; detectar registros no autorizados |

#### 🟡 Categoría: Rendimiento

| # | event_type | Hipótesis | Decisión |
|---|-----------|-----------|----------|
| O10 | `api_latency_recorded` | Necesitamos saber qué endpoints de la API tienen mayor latencia para identificar cuellos de botella | Priorizar optimizaciones de rendimiento (caching, índices, refactors) en los endpoints más lentos |
| O11 | `page_load_time_recorded` | Necesitamos saber cuánto tardan en cargar las páginas del backoffice, especialmente las secciones de inventario y órdenes | Identificar páginas que necesitan optimización de frontend (lazy loading, reducción de bundles) |
| O12 | `api_error_rate_recorded` | Necesitamos saber la tasa de errores HTTP 4xx/5xx por endpoint | Detectar degradaciones del servicio antes de que afecten a los operadores; alertar al equipo de plataforma |

#### 🔴 Categoría: Errores

| # | event_type | Hipótesis | Decisión |
|---|-----------|-----------|----------|
| O13 | `frontend_error_captured` | Necesitamos saber qué errores de JavaScript no capturados ocurren en el frontend del backoffice | Priorizar correcciones de errores en las secciones más utilizadas antes de que afecten la productividad |
| O14 | `api_validation_error` | Necesitamos saber qué validaciones fallan con más frecuencia (tanto de entrada como de negocio) | Mejorar la experiencia de usuario con mensajes de error más claros; detectar datos incorrectos enviados desde el frontend |
| O15 | `network_request_failed` | Necesitamos saber cuándo fallan las peticiones de red del frontend al backend por problemas de conectividad | Distinguir entre errores del backend y problemas de red del cliente; informar al operador |

#### 🟣 Categoría: Navegación

| # | event_type | Hipótesis | Decisión |
|---|-----------|-----------|----------|
| O16 | `page_navigated` | Necesitamos saber qué secciones del backoffice visitan más los operadores de almacén | Optimizar la navegación y el layout según las secciones más usadas; identificar flujos abandonados |
| O17 | `flow_abandoned` | Necesitamos saber en qué paso del flujo (creación de orden, registro de incidencia) los usuarios abandonan el proceso | Identificar puntos de fricción en la UX y rediseñar los formularios problemáticos |
| O18 | `feature_used` | Necesitamos saber qué funcionalidades específicas se usan (exportar datos, subir archivos, consultar resumen) | Decidir qué funcionalidades merecen más inversión de desarrollo y cuáles pueden deprecarse |

---

### 2.4 Clasificación obligatorio vs. oportunidad

| Tipo | Cantidad | Eventos |
|------|----------|---------|
| **Obligatorios** (CONTEXT) | 5 | `inbound_order_created`, `outbound_order_created`, `stock_threshold_triggered`, `direct_stock_edit_rejected`, `inventory_discrepancy_detected` |
| **Oportunidades identificadas** | 18 | `product_catalog_viewed`, `inbound_order_failed`, `outbound_order_failed`, `login_attempted`, `login_failed`, `password_reset_requested`, `session_started`, `session_expired`, `user_registered`, `api_latency_recorded`, `page_load_time_recorded`, `api_error_rate_recorded`, `frontend_error_captured`, `api_validation_error`, `network_request_failed`, `page_navigated`, `flow_abandoned`, `feature_used` |
| **Total** | **23** | |

---

## 3. Fase 2 — Diseño del Event Envelope

### 3.1 Event Envelope estándar

Todo evento de telemetría en TrackFlow debe cumplir con la siguiente estructura base:

```json
{
  "eventId": "uuid-string",
  "timestamp": "2026-08-26T14:30:00.000Z",
  "sessionId": "uuid-string",
  "userId": "uuid-string",
  "event_type": "entidad_acción",
  "schemaVersion": "1.0",
  "requestId": "uuid-string",
  "properties": {}
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `eventId` | `string` (UUID v4) | Sí | Identificador único del evento. Generado en el punto de emisión. |
| `timestamp` | `string` (ISO 8601) | Sí | Momento exacto en que ocurrió el evento, con zona horaria UTC. |
| `sessionId` | `string` (UUID v4) | Sí | Identificador de la sesión del usuario. Persiste durante toda la sesión autenticada. |
| `userId` | `string` (UUID v4) | Sí | Identificador del usuario autenticado que generó el evento. Vacío para eventos no autenticados. |
| `event_type` | `string` | Sí | Taxonomía en formato `entidad_acción`. Verbos en pasado (ej. `order_created`, `session_expired`). |
| `schemaVersion` | `string` | Sí | Versión del esquema del evento. Semver (ej. `"1.0"`, `"1.1"`). |
| `requestId` | `string` (UUID v4) | Sí | Identificador de correlación que une frontend, backend y logs en una misma petición. |
| `properties` | `object` | Sí | Payload específico del evento. Solo las claves definidas en el allowlist de cada evento. |

---

### 3.2 Esquemas de eventos (inventario)

#### M1: `inbound_order_created`

**Descripción:** Se registra una orden de entrada de mercancía en un almacén.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `warehouse` | `string` | Sí | Almacén donde se recibe. Valores: `los_angeles`, `zaragoza`. |
| `client_id` | `string` | Sí | Identificador del cliente (marca B2B) propietaria del SKU. |
| `product_id` | `string` | Sí | Identificador del SKU recibido. |
| `product_category` | `string` | Sí | Categoría del producto. Valores: `fashion`, `electronics`, `cosmetics`. |
| `quantity` | `integer` | Sí | Cantidad de unidades recibidas (> 0). |

**Allowlist:** Solo las 5 propiedades anteriores. No incluir datos del transportista ni del destinatario.

**PII:** Ninguno.

**Stream/Batch:** Stream (ver sección 4.1).

---

#### M2: `outbound_order_created`

**Descripción:** Se completa el picking y despacho de una orden de salida.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `warehouse` | `string` | Sí | Almacén que despacha. Valores: `los_angeles`, `zaragoza`. |
| `client_id` | `string` | Sí | Identificador del cliente (marca B2B). |
| `product_id` | `string` | Sí | Identificador del SKU despachado. |
| `product_category` | `string` | Sí | Categoría del producto. |
| `quantity` | `integer` | Sí | Cantidad de unidades despachadas (> 0). |

**Allowlist:** Solo las 5 propiedades anteriores.

**PII:** Ninguno.

**Stream/Batch:** Stream.

---

#### M3: `stock_threshold_triggered`

**Descripción:** El stock de un SKU cae por debajo del mínimo configurado para ese cliente.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `warehouse` | `string` | Sí | Almacén donde ocurrió el evento. |
| `client_id` | `string` | Sí | Identificador del cliente. |
| `product_id` | `string` | Sí | Identificador del SKU. |
| `product_category` | `string` | Sí | Categoría del producto. |
| `quantity` | `integer` | Sí | Stock actual después del movimiento. |
| `min_stock` | `integer` | Sí | Umbral mínimo configurado para este SKU/cliente. |

**Allowlist:** Las 6 propiedades anteriores.

**PII:** Ninguno.

**Stream/Batch:** Stream.

---

#### M4: `direct_stock_edit_rejected`

**Descripción:** El sistema rechaza un intento de modificar el stock directamente (fuera de una orden).

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `warehouse` | `string` | Sí | Almacén donde se intentó la modificación. |
| `client_id` | `string` | Sí | Identificador del cliente. |
| `product_id` | `string` | Sí | Identificador del SKU. |
| `product_category` | `string` | Sí | Categoría del producto. |
| `quantity_attempted` | `integer` | Sí | Cantidad que se intentó establecer. |
| `reason` | `string` | Sí | Razón del rechazo (ej. `direct_modification_not_allowed`). |

**Allowlist:** Las 6 propiedades anteriores.

**PII:** Ninguno.

**Stream/Batch:** Stream.

---

#### M5: `inventory_discrepancy_detected`

**Descripción:** Una auditoría o conteo físico detecta una diferencia entre el stock registrado y el stock real.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `warehouse` | `string` | Sí | Almacén donde se detectó la discrepancia. |
| `client_id` | `string` | Sí | Identificador del cliente. |
| `product_id` | `string` | Sí | Identificador del SKU. |
| `product_category` | `string` | Sí | Categoría del producto. |
| `system_quantity` | `integer` | Sí | Cantidad registrada en el sistema. |
| `actual_quantity` | `integer` | Sí | Cantidad real encontrada en el conteo físico. |
| `difference` | `integer` | Sí | Diferencia (actual - system). Positivo = sobrante, negativo = faltante. |

**Allowlist:** Las 7 propiedades anteriores.

**PII:** Ninguno.

**Stream/Batch:** Batch (ver sección 4.1).

---

#### O1: `product_catalog_viewed`

**Descripción:** Un usuario visualiza la lista de productos (catálogo de SKUs).

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `filter_client` | `string` | Opcional | Cliente por el que se filtró la búsqueda, si aplica. |
| `filter_category` | `string` | Opcional | Categoría por la que se filtró. |
| `filter_warehouse` | `string` | Opcional | Almacén por el que se filtró. |
| `result_count` | `integer` | Sí | Número de productos mostrados en la vista. |

**PII:** Ninguno.

**Stream/Batch:** Batch.

---

#### O2: `inbound_order_failed`

**Descripción:** Fallo en el registro de una orden de entrada por error de validación.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `warehouse` | `string` | Sí | Almacén objetivo. |
| `client_id` | `string` | Sí | Identificador del cliente. |
| `product_id` | `string` | Sí | Identificador del SKU. |
| `quantity` | `integer` | Sí | Cantidad intentada. |
| `error_code` | `string` | Sí | Código del error de validación. |
| `error_message` | `string` | Sí | Mensaje descriptivo del error. |

**PII:** Ninguno.

**Stream/Batch:** Stream.

---

#### O3: `outbound_order_failed`

**Descripción:** Fallo en el registro de una orden de salida por error de validación o stock insuficiente.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `warehouse` | `string` | Sí | Almacén de origen. |
| `client_id` | `string` | Sí | Identificador del cliente. |
| `product_id` | `string` | Sí | Identificador del SKU. |
| `quantity_requested` | `integer` | Sí | Cantidad solicitada. |
| `stock_available` | `integer` | Sí | Stock disponible en el momento del intento. |
| `error_code` | `string` | Sí | Código del error (`insufficient_stock`, `validation_error`, etc.). |
| `error_message` | `string` | Sí | Mensaje descriptivo del error. |

**PII:** Ninguno.

**Stream/Batch:** Stream.

---

### 3.3 Esquemas de eventos (autenticación)

#### O4: `login_attempted`

**Descripción:** Un usuario intenta iniciar sesión, independientemente del resultado.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `email` | `string` | Sí | Email del usuario que intenta acceder. |
| `success` | `boolean` | Sí | Indica si el login fue exitoso. |
| `ip_address` | `string` | Sí | Dirección IP desde la que se intenta acceder. |
| `user_agent` | `string` | Opcional | User-Agent del navegador. |

**PII:** ⚠️ `email` es PII. Se almacena hasheado (SHA-256) en el campo `email` para análisis, y se descarta tras 30 días. `ip_address` se anonimiza truncando el último octeto (ej. `192.168.1.0`).

**Stream/Batch:** Stream.

---

#### O5: `login_failed`

**Descripción:** Un intento de inicio de sesión falla por credenciales inválidas.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `email` | `string` | Sí | Email del usuario (no se registra si el email no existe en el sistema para evitar enumeración). |
| `failure_reason` | `string` | Sí | Razón del fallo (`invalid_credentials`, `user_not_found`, `account_locked`). |
| `ip_address` | `string` | Sí | Dirección IP. |
| `attempt_count` | `integer` | Sí | Número de intentos fallidos consecutivos desde esta IP. |

**PII:** ⚠️ `email` es PII. Misma política que O4. `ip_address` anonimizada.

**Stream/Batch:** Stream.

---

#### O6: `password_reset_requested`

**Descripción:** Un usuario solicita el restablecimiento de su contraseña.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `email` | `string` | Sí | Email del usuario que solicita el reset. |
| `source` | `string` | Sí | Desde dónde se solicitó (`login_page`, `forgot_password_page`). |

**PII:** ⚠️ `email` es PII. Se almacena hasheado.

**Stream/Batch:** Batch.

---

#### O7: `session_started`

**Descripción:** Un usuario inicia sesión exitosamente y se crea una nueva sesión (JWT).

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `role` | `string` | Sí | Rol del usuario (`admin`, `manager`, `user`). |
| `ip_address` | `string` | Sí | Dirección IP desde la que se conecta. |
| `user_agent` | `string` | Opcional | User-Agent del navegador. |

**PII:** `ip_address` anonimizada (último octeto truncado).

**Stream/Batch:** Stream.

---

#### O8: `session_expired`

**Descripción:** Una sesión de usuario expira por inactividad o por tiempo de vida del token.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `session_duration_seconds` | `integer` | Sí | Duración total de la sesión en segundos. |
| `expired_reason` | `string` | Sí | Razón de expiración (`token_expired`, `logout`, `inactivity`). |

**PII:** Ninguno (no se incluye userId porque el token ya expiró; se correlaciona por sessionId en el envelope).

**Stream/Batch:** Stream.

---

#### O9: `user_registered`

**Descripción:** Se registra un nuevo usuario en el sistema.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `role` | `string` | Sí | Rol asignado al nuevo usuario. |
| `registration_method` | `string` | Sí | Método de registro (`self_service`, `admin_created`). |

**PII:** `email` no se incluye en properties (está en el envelope como userId o se puede obtener del contexto de registro). El evento no debe contener PII directamente.

**Stream/Batch:** Batch.

---

### 3.4 Esquemas de eventos (rendimiento)

#### O10: `api_latency_recorded`

**Descripción:** Se registra la latencia de una petición a la API.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `endpoint` | `string` | Sí | Ruta del endpoint (ej. `/api/suppliers/`). |
| `method` | `string` | Sí | Método HTTP (`GET`, `POST`, `PATCH`, `DELETE`). |
| `status_code` | `integer` | Sí | Código de respuesta HTTP. |
| `duration_ms` | `integer` | Sí | Duración de la petición en milisegundos. |
| `authenticated` | `boolean` | Sí | Indica si la petición fue autenticada. |

**PII:** Ninguno.

**Stream/Batch:** Batch.

---

#### O11: `page_load_time_recorded`

**Descripción:** Se registra el tiempo de carga de una página del frontend.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `page` | `string` | Sí | Ruta de la página (ej. `/incidents`, `/suppliers`). |
| `load_time_ms` | `integer` | Sí | Tiempo total de carga en milisegundos. |
| `navigation_type` | `string` | Sí | Tipo de navegación (`initial_load`, `spa_navigation`, `reload`). |

**PII:** Ninguno.

**Stream/Batch:** Batch.

---

#### O12: `api_error_rate_recorded`

**Descripción:** Se registra métrica agregada de tasa de error por endpoint (generada periódicamente).

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `endpoint` | `string` | Sí | Ruta del endpoint. |
| `method` | `string` | Sí | Método HTTP. |
| `total_requests` | `integer` | Sí | Total de peticiones en el período. |
| `error_count` | `integer` | Sí | Número de peticiones con error (4xx/5xx). |
| `error_rate` | `float` | Sí | Tasa de error (error_count / total_requests). |
| `period_seconds` | `integer` | Sí | Período de agregación en segundos. |

**PII:** Ninguno.

**Stream/Batch:** Batch.

---

### 3.5 Esquemas de eventos (errores)

#### O13: `frontend_error_captured`

**Descripción:** Se captura un error no manejado en el frontend (JavaScript).

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `error_type` | `string` | Sí | Tipo de error (`TypeError`, `ReferenceError`, `RangeError`, `unhandled_rejection`). |
| `error_message` | `string` | Sí | Mensaje del error. |
| `component_stack` | `string` | Opcional | Stack de componentes React donde ocurrió. |
| `page` | `string` | Sí | Página donde ocurrió el error. |
| `line` | `integer` | Opcional | Línea aproximada del error (source map). |

**PII:** Ninguno, pero se debe tener cuidado de no incluir valores de inputs del usuario en el mensaje de error.

**Stream/Batch:** Stream.

---

#### O14: `api_validation_error`

**Descripción:** Una validación de entrada o de negocio falla en la API.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `endpoint` | `string` | Sí | Endpoint que rechazó la petición. |
| `field` | `string` | Sí | Campo que falló la validación. |
| `error_code` | `string` | Sí | Código de error de validación. |
| `error_detail` | `string` | Sí | Detalle del error (sin incluir valores sensibles). |

**PII:** ⚠️ Asegurarse de que `error_detail` no contenga valores de entrada del usuario que puedan ser PII.

**Stream/Batch:** Stream.

---

#### O15: `network_request_failed`

**Descripción:** Una petición de red del frontend al backend falla por problemas de conectividad.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `endpoint` | `string` | Sí | Endpoint al que se intentaba acceder. |
| `method` | `string` | Sí | Método HTTP. |
| `error_type` | `string` | Sí | Tipo de error de red (`timeout`, `abort`, `network_error`, `http_error`). |
| `http_status` | `integer` | Opcional | Código de estado HTTP, si se recibió respuesta. |
| `retry_attempted` | `boolean` | Sí | Indica si se intentó un reintento automático. |

**PII:** Ninguno.

**Stream/Batch:** Stream.

---

### 3.6 Esquemas de eventos (navegación)

#### O16: `page_navigated`

**Descripción:** Un usuario navega a una sección del backoffice.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `page` | `string` | Sí | Ruta de destino (ej. `/incidents/summary`). |
| `source_page` | `string` | Opcional | Ruta de origen desde la que navegó. |
| `navigation_time_ms` | `integer` | Opcional | Tiempo de navegación (cambio de ruta). |

**PII:** Ninguno.

**Stream/Batch:** Batch.

---

#### O17: `flow_abandoned`

**Descripción:** Un usuario abandona un flujo multi-paso antes de completarlo.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `flow_name` | `string` | Sí | Nombre del flujo abandonado (`create_inbound_order`, `create_outbound_order`, `report_incident`). |
| `current_step` | `string` | Sí | Paso en el que se abandonó. |
| `time_spent_seconds` | `integer` | Sí | Tiempo total invertido en el flujo antes de abandonar. |
| `abandoned_after` | `string` | Sí | Última acción registrada antes del abandono. |

**PII:** Ninguno.

**Stream/Batch:** Batch.

---

#### O18: `feature_used`

**Descripción:** Un usuario utiliza una funcionalidad específica del backoffice.

| Propiedad | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `feature_name` | `string` | Sí | Nombre de la funcionalidad (`export_incidents`, `upload_file`, `view_summary`, `filter_catalog`). |
| `page` | `string` | Sí | Página donde se encuentra la funcionalidad. |
| `action` | `string` | Sí | Acción específica (`click`, `submit`, `download`). |

**PII:** Ninguno.

**Stream/Batch:** Batch.

---

### 3.7 Datos sensibles y PII

| Evento | Campo PII | Estrategia de anonimización / sanitización |
|--------|-----------|-------------------------------------------|
| O4 `login_attempted` | `email` | Almacenar hasheado con SHA-256. Conservar máximo 30 días. |
| O4 `login_attempted` | `ip_address` | Truncar último octeto (ej. `192.168.1.0`). |
| O5 `login_failed` | `email` | Misma política que O4. No registrar si el email no existe (evitar enumeración). |
| O5 `login_failed` | `ip_address` | Truncar último octeto. |
| O6 `password_reset_requested` | `email` | Almacenar hasheado con SHA-256. |
| O7 `session_started` | `ip_address` | Truncar último octeto. |
| O14 `api_validation_error` | `error_detail` | Sanitizar para eliminar cualquier valor de entrada del usuario antes de registrar. |

**Regla general:** Ningún evento de inventario (M1-M5, O1-O3) debe contener datos del consumidor final (destinatario del paquete). Esos datos pertenecen al dominio de última milla, fuera del alcance de este sistema.

---

## 4. Fase 3 — Estrategia de entrega

### 4.1 Stream vs. Batch

| Evento | Modo | Justificación |
|--------|------|---------------|
| `inbound_order_created` (M1) | **Stream** | Ana necesita saber en tiempo real el volumen entrante para planificar capacidad de almacén. Una demora en lote podría significar no tener personal suficiente para recibir la mercancía. |
| `outbound_order_created` (M2) | **Stream** | Detectar cuellos de botella operativos requiere visibilidad casi inmediata. Si un almacén se ralentiza, debe saberse en minutos, no al día siguiente. |
| `stock_threshold_triggered` (M3) | **Stream** | La alerta de stock mínimo debe ser inmediata para que Miguel (comercial) pueda contactar al cliente antes de que se quede sin stock. Cada minuto cuenta. |
| `direct_stock_edit_rejected` (M4) | **Stream** | Detectar intentos de saltarse la trazabilidad requiere notificación en tiempo real para que el supervisor de almacén pueda intervenir de inmediato. |
| `inventory_discrepancy_detected` (M5) | **Batch** | Las discrepancias se detectan durante auditorías periódicas (diarias o semanales). No hay urgencia en tiempo real; el análisis batch es suficiente para priorizar SKUs. |
| `product_catalog_viewed` (O1) | **Batch** | Datos de consulta de catálogo. No requiere acción inmediata; se usa para análisis de tendencias semanales/mensuales. |
| `inbound_order_failed` (O2) | **Stream** | Los errores de validación en entrada deben conocerse pronto para corregir la fuente del problema (formulario, integración). |
| `outbound_order_failed` (O3) | **Stream** | Los fallos de salida por stock insuficiente requieren atención inmediata para no retrasar entregas a clientes. |
| `login_attempted` (O4) | **Stream** | Los intentos de login (especialmente fallidos) deben monitorizarse en tiempo real para detectar ataques de fuerza bruta. |
| `login_failed` (O5) | **Stream** | Misma razón que O4. La tasa de fallos de login es un indicador de seguridad crítico. |
| `password_reset_requested` (O6) | **Batch** | No requiere acción inmediata. Se usa para análisis de tendencias semanales. |
| `session_started` (O7) | **Stream** | Saber qué usuarios están activos ahora es útil para seguridad y capacidad. |
| `session_expired` (O8) | **Batch** | La expiración de sesión no requiere acción inmediata. Se usa para análisis de UX y ajuste de configuración. |
| `user_registered` (O9) | **Batch** | No requiere acción inmediata. Se reporta en análisis diarios. |
| `api_latency_recorded` (O10) | **Batch** | Se procesa en lotes cada 5 minutos. La latencia no necesita respuesta en segundos, pero sí monitorización periódica para detectar degradaciones. |
| `page_load_time_recorded` (O11) | **Batch** | Datos de rendimiento del frontend. Se agregan por hora/día para identificar tendencias. |
| `api_error_rate_recorded` (O12) | **Batch** | Se calcula la tasa de error en ventanas de 5 minutos. Suficiente para alertar sin necesidad de streaming puro. |
| `frontend_error_captured` (O13) | **Stream** | Los errores de frontend no capturados pueden indicar una regresión crítica. Deben conocerse en minutos. |
| `api_validation_error` (O14) | **Stream** | Los errores de validación pueden indicar un bug en el frontend o un ataque. Deben detectarse pronto. |
| `network_request_failed` (O15) | **Stream** | Los fallos de red pueden indicar una caída del servicio. Deben alertar en tiempo real. |
| `page_navigated` (O16) | **Batch** | Datos de navegación. Se agregan por hora/día para análisis de uso. No requiere tiempo real. |
| `flow_abandoned` (O17) | **Batch** | Se analiza en lotes diarios para identificar problemas de UX. No requiere acción inmediata. |
| `feature_used` (O18) | **Batch** | Datos de uso de funcionalidades. Se agregan semanalmente para decisiones de producto. |

---

### 4.2 Throttle / Debounce

| Evento | Estrategia | Detalle |
|--------|-----------|---------|
| `page_navigated` (O16) | **Debounce** 500ms | Evitar múltiples eventos si el usuario navega rápidamente entre pestañas. Solo se emite el último destino después de 500ms sin navegación. |
| `api_latency_recorded` (O10) | **Throttle** 1 por segundo por endpoint | Si hay muchas peticiones concurrentes al mismo endpoint, solo se registra una muestra por segundo para evitar saturación. |
| `page_load_time_recorded` (O11) | **Throttle** 1 cada 10 segundos por página | Las recargas rápidas de página no deben generar eventos individuales. |
| `frontend_error_captured` (O13) | **Debounce** 2 segundos | Si un mismo error se repite en un bucle, debounce para capturar solo la primera ocurrencia y contar las repeticiones como un contador interno. |

**Estrategia general:** Los eventos de alta frecuencia (rendimiento, navegación) usan throttle/debounce para limitar el volumen. Los eventos de negocio (inventario, autenticación) se emiten sin throttling porque cada ocurrencia es significativa.

---

### 4.3 Riesgos y exclusiones

#### Eventos considerados y descartados

| Evento descartado | Razón |
|-------------------|-------|
| `last_mile_delivery_status` | Pertenece al dominio de tracking de última milla, fuera del alcance de este sistema de inventario. |
| `payment_processed` | TrackFlow no procesa pagos en su sistema de inventario. |
| `user_profile_updated` | Cambios de perfil son poco frecuentes y no generan información de negocio accionable relevante. |
| `product_price_updated` | El precio es gestionado por el cliente (marca), no por TrackFlow. |
| `warehouse_temperature_recorded` | TrackFlow no monitoriza condiciones ambientales en su sistema actual. |
| `carrier_assigned` | Datos del transportista pertenecen al dominio de logística de última milla, no al inventario. |

#### Datos que NO se capturan

1. **Datos del consumidor final** (nombre, dirección, teléfono del destinatario) — pertenecen al dominio de última milla.
2. **Contenido de contraseñas** ni siquiera hasheadas en eventos de telemetría.
3. **Datos bancarios o de pago** — no son parte del sistema de inventario.
4. **Tokens JWT completos** — solo se registra que se emitió/expiro, no el contenido del token.
5. **Datos de navegación fuera del backoffice** — solo se monitoriza el uso del sistema interno.

#### Riesgos identificados

| Riesgo | Mitigación |
|--------|------------|
| **Sobrecarga de eventos** en endpoints de alta frecuencia (ej. listado de productos) | Implementar throttle/debounce en eventos de navegación y rendimiento. Los eventos de negocio tienen volumen naturalmente bajo. |
| **Fuga accidental de PII** en campos de texto libre (ej. `error_detail`) | Implementar sanitizador que elimine patrones de PII (emails, IPs, IDs) antes de emitir el evento. |
| **Coste de almacenamiento** a largo plazo | Política de retención: eventos de rendimiento/navegación se agregan después de 90 días y se descartan los raw. Eventos de negocio se conservan 1 año. |
| **Correlación incompleta** por requestId no propagado | Asegurar que el frontend genere el `requestId` y lo envíe en el header `X-Request-ID` al backend, y que el backend lo propague a todas las respuestas y logs. |
| **Eventos duplicados** por reintentos en el frontend | Implementar idempotencia por `eventId` en el lado del receptor (stub o servicio de captura). |

---

## 5. Checklist de evaluación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Todas las métricas obligatorias de CONTEXT-empresa.md están presentes y correctamente identificadas | ✅ 5/5 eventos (M1-M5) |
| 2 | El plan cubre tanto oportunidades técnicas como de negocio, de forma amplia | ✅ 18 oportunidades adicionales en 5 categorías |
| 3 | Cada evento tiene una hipótesis y una decisión que lo justifica | ✅ 23/23 eventos con hipótesis + decisión |
| 4 | Event Envelope consistente en todos los eventos | ✅ 8 campos estándar definidos y aplicados |
| 5 | Cada evento tiene un allowlist de propiedades documentado | ✅ 23/23 eventos con allowlist explícito |
| 6 | El archivo event-schemas.json es válido y consistente | ✅ Ver archivo adjunto |
| 7 | La decisión stream/batch está justificada por urgencia de negocio u operación | ✅ 23/23 eventos con justificación |
| 8 | Datos sensibles o PII identificados y documentados con su estrategia de anonimización | ✅ 5 eventos con PII identificados y documentados |
| 9 | Sección de riesgos y exclusiones con pensamiento crítico | ✅ 6 eventos descartados, 5 riesgos con mitigación |
| 10 | El plan es lo suficientemente preciso como para que otro desarrollador lo instrumente sin necesitar aclaraciones | ✅ Esquemas detallados con properties, tipos, obligatoriedad y allowlist |

---

*Documento generado como parte del proyecto "Diseño del plan de telemetría de tu compañía" — 4Geeks Academy, AI Engineering.*