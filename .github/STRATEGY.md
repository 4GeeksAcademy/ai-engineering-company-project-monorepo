# Telemetría de tu compañía – Almacenamiento

> [!IMPORTANT]
> **Antes de empezar:** Necesitas el `TelemetryService` funcionando en el frontend y enviando lotes al stub del proyecto anterior. Si los eventos no llegan al stub con respuesta `200`, resuelve eso antes de continuar — hoy construyes el destino real de esos eventos.

Tu `CONTEXT-empresa.md` explica qué campos del envelope y qué dimensiones de tags importan para el análisis de tu compañía — confirma que los campos opcionales que guardes en `tags` coinciden con lo documentado en `telemetry-plan.md`.

---

## 🎯 Tu reto

> [!NOTE]
> 📌 Estás construyendo sobre tu copia del monorepo de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

Los eventos están fluyendo desde el frontend — obligatorios y de tu propio catálogo, técnicos y de negocio. El stub los recibe y los descarta. Hoy construyes lo que el stub prometía: el sistema que realmente los guarda.

El entregable es un solo cambio en el backend — pero un cambio que transforma todo: el stub se convierte en un endpoint real que valida cada evento contra el contrato de esquema de la Fase 1, persiste los válidos en Supabase en una sola operación, y reporta exactamente qué se guardó y qué se rechazó. El frontend no cambia ni una línea.

### Mensaje de tu Tech Lead

> "El stub ya cumplió su función — sé que los eventos llegan con el formato correcto. Ahora necesito que los guardes.
> 
> Crea la tabla en Supabase y reemplaza el stub por el endpoint real. El modelo Pydantic que definiste en la fase anterior es el contrato — úsalo para validar. Los eventos que no cumplan el contrato se rechazan individualmente, pero el resto del lote se persiste igual.
> 
> El frontend no toca nada. La URL del endpoint es la misma — solo cambia lo que pasa dentro del backend cuando llega el lote. Si el frontend necesita cambiar algo para que esto funcione, el diseño está mal."

---

## 📚 Conocimiento complementario

### 1. Por qué importa el bulk insert

La telemetría no se escribe igual que los datos de negocio. Un formulario de inventario genera un `INSERT` cuando el usuario hace clic en "Guardar". El `TelemetryService` puede enviar 20 eventos de golpe cada 10 segundos desde múltiples usuarios en paralelo.

Si el endpoint hace un `INSERT` por evento, cada lote de 20 abre 20 transacciones separadas en la base de datos. Con 10 usuarios activos son 200 transacciones por ciclo de flush — y eso en un sistema pequeño. En producción, ese patrón colapsa el pool de conexiones.

El **bulk insert** resuelve esto: todos los eventos válidos de un lote se insertan en una sola transacción. La diferencia entre ambos enfoques es invisible cuando la tabla tiene 100 filas; es catastrófica cuando tiene 10 millones.

La tabla de telemetría no es una tabla CRUD. Sus invariantes son distintos:
- **Solo escritura:** Nunca se actualiza ni se elimina — los eventos son hechos inmutables.
- **Columnas fijas (`event_type`, `timestamp`, `service`):** Son las que sostienen las consultas analíticas del siguiente proyecto.
- **Columna `tags` (`JSONB`):** Guarda el objeto `properties` del envelope (solo las claves del allowlist) sin necesidad de alterar el esquema.

---

### 2. Validación parcial (parseo por evento)

El modelo Pydantic `TelemetryEvent` es el contrato — pero cómo lo aplicas en FastAPI importa.

No tipees el body completo del request como `list[TelemetryEvent]`. Si la firma del endpoint es algo como:
```python
batch: TelemetryBatch  # donde events: list[TelemetryEvent]
```
Pydantic validará cada evento antes de que tu handler corra. Un evento inválido en el lote causará que FastAPI devuelva `422 Unprocessable Entity` para todo el request, haciendo que el frontend reintente o descarte el lote completo. Eso contradice la aceptación parcial.

**Usa parseo por evento en su lugar:**

1. **Acepta el envelope de forma laxa:** `{ "events": [...] }` — cada elemento de la lista es un `dict` crudo, no un `TelemetryEvent` pre-validado.
2. **Itera dentro del handler:** Llama a `TelemetryEvent.model_validate(raw)` en cada item dentro de un bloque `try/except ValidationError`.
3. **Clasifica los eventos:** Los eventos válidos van a la lista de bulk-insert; los inválidos incrementan el contador `rejected` — el loop continúa.
4. **Respuesta HTTP 200:** Devuelve `{ "received", "stored", "rejected" }` mientras el envelope en sí sea parseable (tenga un arreglo `events`).

#### Comparativa de enfoques

| Enfoque | ¿Qué pasa con un lote mixto? |
| :--- | :--- |
| **Body tipado** (`events: list[TelemetryEvent]`) | Todo el request falla con `422` — no se guarda nada. |
| **Parseo por evento** (`model_validate` en un loop) | Los eventos válidos se guardan; los inválidos se cuentan en `rejected`. |

> [!TIP]
> El modelo se reutiliza sin cambios desde la Fase 2 — lo usas como validador por item, no como el tipo del body completo.

---

## 🌱 Cómo Empezar el Proyecto

1. Abre tu copia del monorepo y ubica `services/` (backend FastAPI).
2. Ten a mano tu `docs/telemetry/event-schemas.json` y `telemetry-plan.md` — confirma que el mapeo a `tags` preserva las dimensiones específicas de tu CONTEXT (almacén, oficina, etc.) definidas en tu plan.
3. El frontend no se toca. Verifica que `NEXT_PUBLIC_TELEMETRY_ENDPOINT` siga apuntando al mismo endpoint — solo cambia lo que pasa dentro del backend.
4. Sigue el orden: tabla en Supabase → endpoint real → verificación end-to-end.

---

## 🧊 Qué Necesitas Hacer

### Fase 1 — Tabla de almacenamiento en Supabase

- Crea la tabla `telemetry_events` en Supabase con la siguiente estructura:
- Mapea cada `TelemetryEvent` de la API a una fila de la tabla con este contrato:
- Crea los tres índices que hacen la tabla consultable a escala: en `timestamp`, en `event_type`, y un índice GIN en `tags` para búsquedas dentro del JSONB.
- Confirma que la tabla no tiene lógica de UPDATE o DELETE — los eventos de telemetría son inmutables una vez registrados.

### Fase 2 — Endpoint real en FastAPI

- [ ] Reemplaza el stub `POST /telemetry/events` con la implementación completa. El endpoint real debe:
  - Aceptar el mismo envelope que el stub: `{ "events": [...] }` — parsea la lista de forma laxa; **no** declares `events: list[TelemetryEvent]` como tipo del body de FastAPI (ver validación parcial más arriba).
  - Validar cada evento crudo individualmente con `TelemetryEvent.model_validate(...)` — el mismo modelo de la fase anterior, sin modificarlo.
  - Rechazar individualmente los eventos que no cumplan el contrato, **sin cancelar el lote** — los eventos válidos del mismo lote se persisten igual.
  - Insertar los eventos válidos en `telemetry_events` en una única operación de bulk insert.
  - Devolver `{ "received": N, "stored": M, "rejected": R }` donde N es el total recibido, M el persistido, y R el rechazado.
- [ ] Verifica que la respuesta del endpoint real sea compatible con el frontend existente — el `TelemetryService` solo mira el código de estado HTTP, no el body de la respuesta.

### Fase 3 — Verificación end-to-end

- [ ] Con el endpoint real activo, usa el backoffice para generar eventos reales: registra al menos una orden de entrada y una de salida en el módulo de inventario, y genera al menos un evento técnico (un error, un login fallido, etc.).
- [ ] Consulta directamente la tabla `telemetry_events` en Supabase y confirma que los eventos aparecen con los campos correctos — especialmente `event_type`, `timestamp` y `tags`.
- [ ] Prueba el comportamiento de rechazo: envía manualmente (con curl o tu cliente HTTP preferido) un lote que mezcle eventos válidos e inválidos y verifica que la respuesta refleje correctamente `stored` y `rejected`.

---

## ✅ Qué Vamos a Evaluar

- [ ] La tabla `telemetry_events` existe en Supabase con las ocho columnas, los tres índices, y sin lógica de UPDATE/DELETE
- [ ] El endpoint `POST /telemetry/events` hace bulk insert y devuelve `{ "received", "stored", "rejected" }`
- [ ] Los eventos inválidos se rechazan individualmente sin cancelar el lote — los válidos se persisten (validación por evento con `model_validate`, no un body tipado `list[TelemetryEvent]` que devolvería `422` para todo el lote)
- [ ] El modelo Pydantic `TelemetryEvent` no fue modificado desde el proyecto anterior — se reutiliza tal cual
- [ ] El frontend no cambió ni una línea — la sustitución stub → real es completamente transparente
- [ ] Los eventos aparecen en `telemetry_events` con `event_type`, `timestamp` y `tags` correctamente poblados, tanto para eventos técnicos como de negocio
- [ ] El `tags` guardado preserva los allowlists de propiedades y las dimensiones específicas del CONTEXT documentadas en `telemetry-plan.md`
- [ ] El insert es una sola operación por lote, no un INSERT por evento

---

## 📦 Cómo Entregar

1. Asegúrate de que los cambios estén en tu copia: tabla creada en Supabase y endpoint real en `services/`.
2. Crea un Pull Request contra la rama principal del monorepo con el título: `feat: telemetry event storage`.
3. En la descripción del PR, incluye:
   - Una captura de la tabla `telemetry_events` en Supabase con al menos 5 filas de eventos reales, incluyendo al menos un evento técnico y uno de negocio
   - El JSON de respuesta de un lote que mezcle eventos válidos e inválidos (mostrando `received`, `stored` y `rejected`)
   - Confirmación explícita de que el frontend no cambió