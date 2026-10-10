# Telemetría de tu compañía – Captura en el frontend

> **Antes de empezar:** necesitas el `telemetry-plan.md` y `event-schemas.json` de la Fase 1 aprobados — son el contrato que vas a implementar hoy. Si no están aprobados, resuelve eso antes de escribir código.  
> Ten a mano tu [CONTEXT-empresa.md](https://github.com/4GeeksAcademy/ai-engineering-syllabus/tree/main/content/contexts/06-telemetry-data-pipelines/telemetry): los nombres de `event_type`, los identificadores de entidad en `properties` y los puntos de instrumentación deben usar el vocabulario de dominio de tu compañía (a través del plan aprobado), no etiquetas genéricas de este README.

---

## 🎯 Tu reto

📌 **Estás construyendo sobre tu copia del [monorepo](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo) de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.**

El plan de telemetría está aprobado. Hoy implementas la mitad que el usuario nunca ve pero que hace posible todo lo demás: el sistema de captura en el frontend.

Cada evento de tu catálogo — obligatorio o identificado por ti — debe capturarse en el momento exacto en que ocurre en el backoffice, acumularse en una cola local, y enviarse al backend en lotes — nunca de a uno. Para verificar que los eventos llegan correctamente, también vas a crear un endpoint receptor mínimo en FastAPI: todavía no persiste nada, solo valida el formato y responde 200. La persistencia real en base de datos es trabajo de la Fase 3.

### Mensaje del Tech Lead:

> "Quiero ver eventos fluyendo antes de construir la capa de almacenamiento. Crea el `TelemetryService` en el backoffice e instrumenta, como mínimo, todas las métricas obligatorias de tu CONTEXT — y tantas del resto de tu catálogo como te alcance el día, priorizando cubrir distintas categorías (técnicas y de negocio) antes que profundizar en una sola.  
>  
> Para verificar que el payload llega bien, agrega un endpoint stub en el backend — valida el formato y devuelve 200, sin escribir en base de datos todavía.  
>  
> Una cosa importante: configura la URL del endpoint como variable de entorno desde el inicio. En la siguiente fase vamos a reemplazar el stub por la implementación real y el frontend no debería necesitar ningún cambio.  
>  
> No quiero tracking disperso en cada componente. Todo pasa por una única función `track()` — nada más."

---

## 📚 Conocimiento complementario — Cómo funciona el sistema de captura

El servicio de captura del frontend no dispara una llamada HTTP por cada evento — eso generaría cientos de requests por minuto en una aplicación activa y saturaría el backend. El patrón correcto tiene tres mecanismos trabajando juntos:

1. **Cola local + batch:** Los eventos se acumulan en memoria como un arreglo. Cada N segundos, o cuando la cola llega a un tamaño máximo, el servicio envía el lote completo en un solo request (`events: []`). El timestamp de cada evento es el momento de captura, no el momento de envío.
2. **Flush confiable con `sendBeacon`:** Cuando el usuario cierra la pestaña o navega fuera, el navegador cancela los requests HTTP en curso. `navigator.sendBeacon` resuelve esto — envía el lote pendiente de forma asíncrona y confiable incluso cuando la página se está destruyendo.
3. **Reintentos con backoff:** Si la red falla, el servicio reintenta con espera exponencial. Si sigue fallando después de N intentos, descarta el lote — los datos de telemetría no son críticos y no deben bloquear la aplicación.
4. **El endpoint como variable de entorno:** En entornos reales, los equipos de frontend y backend trabajan en paralelo. El frontend apunta a `NEXT_PUBLIC_TELEMETRY_ENDPOINT` — hoy esa variable apunta al stub; mañana apuntará al endpoint real con persistencia. El frontend no cambia.
5. **La separación perfil/uso:** Los datos del usuario (nombre, rol, preferencias) son estado persistente que vive en la base de datos principal. Los datos de uso son eventos append-only que van a telemetría. Nunca mezcles ambos.

---

## 🌱 Cómo Empezar el Proyecto

1. Abre tu copia del monorepo y ubica `uis/backoffice/` (frontend) y `services/` (backend FastAPI).
2. Recupera tu `docs/telemetry/event-schemas.json` y crúzalo con tu `CONTEXT-empresa.md` — los nombres de entidad y las claves de propiedades deben coincidir con el vocabulario de dominio de tu compañía.
3. Agrega `NEXT_PUBLIC_TELEMETRY_ENDPOINT` a tu `.env.local` apuntando al endpoint stub que vas a crear: `http://localhost:8000/telemetry/events`.
4. Sigue el orden de fases: **stub → servicio → instrumentación**. No instrumentes antes de tener el servicio.

---

## 💻 Qué Necesitas Hacer

### Fase 1 — Endpoint stub en FastAPI

> [!WARNING]
> **Este endpoint es temporal y solo para verificación.** Su único propósito es dejarte comprobar que el payload llega con el formato correcto. En la Fase 3 (siguiente proyecto) lo reemplazarás por la implementación real con validación completa y persistencia en Supabase.

- [ ] Crea el endpoint `POST /telemetry/events` en el backend, en su propio router dentro de `services/`. Por ahora debe:
  - Aceptar un body con la forma `{ "events": [...] }`
  - Registrar en log la cantidad de eventos recibidos y el `event_type` de cada uno
  - Responder `200 OK` con `{ "received": N }` donde `N` es la cantidad de eventos del lote
- [ ] Define el modelo Pydantic `TelemetryEvent` con los campos estándar del envelope de tu plan (`eventId`, `timestamp`, `sessionId`, `userId`, `event_type`, `schemaVersion`, `requestId`, `properties`). Este modelo se reutilizará sin cambios en la Fase 3 — defínelo bien desde ahora.
- [ ] Lee la URL del endpoint desde la variable de entorno `TELEMETRY_ENDPOINT` en el backend, aunque todavía no la uses para redirigir tráfico. Establece el patrón desde el inicio.

---

### Fase 2 — TelemetryService en el frontend

- [ ] Crea `uis/backoffice/src/services/telemetry.ts` (o equivalente) con las siguientes responsabilidades:
  - **Cola local:** acumular eventos en memoria en un arreglo interno
  - **Batch + debounce:** enviar la cola a `NEXT_PUBLIC_TELEMETRY_ENDPOINT` cada 10 segundos o cuando llegue a 20 eventos, lo que ocurra primero
  - **Flush confiable:** usar `navigator.sendBeacon` en el evento `visibilitychange` para garantizar que los eventos pendientes se envíen al cerrar o esconder la pestaña
  - **Reintentos con backoff:** si el envío falla, reintentar hasta 3 veces con espera exponencial antes de descartar el lote
- [ ] El servicio debe agregar automáticamente a cada evento: `eventId` (UUID generado al capturar), `sessionId` (generado al login y guardado en memoria de sesión), `userId` (de la sesión autenticada), `timestamp` en ISO 8601 al momento de la captura, `schemaVersion` desde una constante compartida, y `requestId` para correlación. Los componentes que llamen a `track()` no deben pasar estos campos manualmente.
- [ ] Expón una única función pública `track(eventType: string, properties: Record<string, unknown>): void`. El argumento `eventType` se convierte en el campo `event_type` del envelope. Todo el tracking del backoffice pasa por esta función — nunca por `fetch` o `axios` directos.

---

### Fase 3 — Instrumentación amplia: técnica y de negocio

- [ ] Instrumenta, sin excepción, **todas las métricas obligatorias** de tu `CONTEXT-empresa.md` (a través de tu plan aprobado).
- [ ] Instrumenta un **piso técnico transversal**, que aplica a cualquier parte de la aplicación y no solo al inventario:
  - Errores de frontend no capturados (`window.onerror`, `unhandledrejection`, o Error Boundaries)
  - Al menos una métrica de rendimiento (tiempo de carga de página o latencia de una llamada a API relevante)
  - Vista de página / navegación (page view) en al menos las secciones principales del backoffice
- [ ] Instrumenta el resto de eventos de negocio de tu plan que priorizaste (inventario u otros flujos de tu compañía), respetando el allowlist de propiedades definido para cada evento en tu `event-schemas.json`. No agregues propiedades extra "por si acaso".
- [ ] Verifica en las DevTools del navegador (pestaña Network) que los lotes llegan al endpoint stub con el formato correcto y que el backend responde 200.

> [!IMPORTANT]
> **IMPORTANTE:** los valores de `event_type` y las claves de `properties` deben coincidir con tus esquemas aprobados en la Fase 1, fundamentados en `CONTEXT-empresa.md`. Copiar nombres de eventos genéricos de este README en lugar de tu plan no será aceptado.

---

### 🔵 Actividad adicional — Rendimiento y Web Vitals

- [ ] Instrumenta Web Vitals (`reportWebVitals` en Next.js u equivalente) y envíalos como eventos de telemetría, agregando la ruta o página como parte de `properties`.
- [ ] Si instrumentaste eventos de autenticación en tu plan (login fallido, sesión expirada), captúralos en los hooks o componentes de autenticación — no en cada página individualmente. El evento de login fallido debe incluir en `properties` la razón del fallo (`invalid_credentials`, `session_expired`, `network_error`) pero **nunca** el valor ingresado como contraseña o email.

---

## ✅ Qué Vamos a Evaluar

- [ ] El endpoint stub `POST /telemetry/events` existe, acepta arreglos con el modelo `TelemetryEvent`, y devuelve `{ "received": N }`
- [ ] El modelo Pydantic `TelemetryEvent` refleja el envelope estándar de la Fase 1 con todos sus campos
- [ ] La URL del endpoint se lee desde `NEXT_PUBLIC_TELEMETRY_ENDPOINT` — no está hardcodeada
- [ ] El backend declara `TELEMETRY_ENDPOINT` en su configuración de entorno para establecer el patrón desde el inicio
- [ ] El `TelemetryService` implementa cola local, batch+debounce (10s / 20 eventos), flush con `sendBeacon`, y reintentos con backoff
- [ ] El servicio genera `eventId`, `sessionId`, `userId`, `timestamp`, `schemaVersion` y `requestId` automáticamente — el componente que llama a `track()` no los pasa manualmente
- [ ] No hay llamadas directas a `fetch` / `axios` para telemetría fuera del `TelemetryService`
- [ ] Todas las métricas obligatorias del CONTEXT están instrumentadas
- [ ] El piso técnico transversal (errores, rendimiento, navegación) está instrumentado, no solo el flujo de inventario
- [ ] Los eventos instrumentados usan `event_type` y allowlists de propiedades del plan del estudiante, fundamentados en `CONTEXT-empresa.md` — no placeholders genéricos de este README
- [ ] No hay PII (email, nombre, contraseña) en ningún evento enviado
- [ ] La pestaña Network de DevTools muestra lotes llegando al endpoint con el formato correcto y respuesta 200

---

## 📦 Cómo Entregar

1. Asegúrate de que los cambios estén en tu copia: endpoint stub en `services/` y `TelemetryService` + instrumentación en `uis/backoffice/`.
2. Crea un Pull Request contra la rama principal del monorepo con el título: `feat: telemetry event capture`.
3. En la descripción del PR, incluye:
   - La lista de eventos instrumentados, marcando cuáles son obligatorios y cuáles identificados por ti, y qué componente o hook captura cada uno
   - Una captura de DevTools mostrando un lote de eventos llegando al stub con respuesta 200
   - Si implementaste la actividad adicional (Web Vitals / autenticación)
