# Diseño del plan de telemetría de tu compañía

> [!NOTE]
> **Antes de empezar:** Lee tu `CONTEXT-empresa.md` antes de escribir una sola línea — ahí encontrarás las métricas obligatorias, las entidades y los procesos clave de tu compañía sobre los que vas a construir este plan.

---

## 🎯 Tu reto

> 📌 **Estás construyendo sobre tu copia del monorepo de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.**

Tu compañía ya tiene un sistema de gestión de inventario en producción: un backend en **FastAPI** con autenticación, un modelo relacional en **Supabase**, y una regla de negocio innegociable: **el stock no se modifica directamente, solo a través de órdenes de entrada y salida trazables a un usuario**. El sistema funciona, pero el equipo de operaciones no tiene idea de qué está pasando dentro de él.

El equipo de gestión ha presentado un **RFI** al equipo de tecnología: quieren saber si el sistema puede generar información de negocio accionable — no solo sobre el inventario, sino sobre cualquier parte de la aplicación que un usuario o un proceso interno toque. 

Tu tech lead te asignó la tarea de responder ese RFI con un **Plan de Telemetría**: un documento técnico que identifique, de la forma más exhaustiva posible, qué datos vale la pena capturar hoy y cuáles podrían ser valiosos mañana (aunque hoy no tengas la pregunta de negocio exacta que resuelven) antes de escribir una sola línea de instrumentación.

---

## 📚 Conocimiento complementario — Qué hace valioso a un evento de telemetría

La telemetría no se genera solo por tenerla: se genera para responder preguntas que hoy no se pueden responder, o que probablemente se necesiten responder mañana. La diferencia entre un sistema de telemetría útil y uno que nadie mantiene es si cada evento existe por una razón.

> **La regla de oro:** si no puedes completar esta frase, el evento no existe:
> 
> *"Capturamos `[event_type]` porque necesitamos saber `[hipótesis]`, lo que nos permite tomar la decisión `[decisión concreta]`."*

Tu `CONTEXT-empresa.md` incluye un conjunto de métricas obligatorias (indicadores puntuales que tu compañía necesita medir desde ya). Estas se integran a tu plan como **piso**, no como techo: alrededor de ellas debes seguir identificando todas las oportunidades adicionales, técnicas y de negocio, que consideres valiosas.

### Dos conceptos que necesitarás aplicar hoy:

- **Batch vs. stream:** ¿El negocio necesita ver este dato en segundos (*stream*), o basta con procesarlo en lotes periódicos (*batch*)? La respuesta determina el diseño técnico del pipeline que construirás en los próximos días.
- **Event Envelope:** La estructura estándar que todo evento debe seguir:
  - `eventId`: Identificador único.
  - `timestamp`: Timestamp en formato ISO 8601.
  - `sessionId`, `userId`: Identificadores de sesión y usuario.
  - `event_type`: Tipo de evento con taxonomía consistente en formato `entidad_acción` (ej. `order_submitted`).
  - `schemaVersion`: Versión del esquema.
  - `requestId`: Identificador de correlación para unir frontend, backend y logs.
  - `properties`: Payload específico del evento.

---

### Mensaje de tu Tech Lead

> "Llevamos semanas con el sistema de inventario corriendo y el equipo de operaciones empieza a preguntar cosas que no podemos responder:
> - ¿Cuántas órdenes de salida se registran por día?
> - ¿Qué productos acumulan más errores de validación?
> - ¿Hay usuarios intentando modificar el stock directamente y siendo rechazados por el sistema?
> - ¿Cuándo se disparan más las alertas de stock mínimo?
> 
> Y no es solo el inventario. El backoffice tiene otras secciones que hoy son cajas negras:
> - ¿Cuántos intentos de login fallidos hay por día?
> - ¿Qué secciones visitan más los operadores?
> - ¿Hay flujos que se abandonan a la mitad?
> 
> Cualquier parte de la aplicación que alguien —humano o proceso— toque es una oportunidad de dato.
> 
> Antes de instrumentar nada, necesito un documento de diseño. No te limites a un puñado de métricas de negocio: quiero el catálogo más completo que puedas construir, cubriendo tanto la salud técnica del sistema como las preguntas de negocio, incluso si hoy no sabemos exactamente para qué las vamos a usar.
> 
> Ya te dejé en tu `CONTEXT` las métricas que necesitamos sí o sí desde ya — impleméntalas sin falta, y a partir de ahí, sigue explorando. No escribas código todavía — escribe el plan que el equipo va a implementar mañana.
> 
> El entregable es un **Plan de Telemetría en Markdown** más un **archivo de esquema JSON**. Lo revisamos el viernes."

---

## 🌱 Cómo Empezar el Proyecto

1. Abre tu copia del monorepo de la compañía asignada.
2. Lee completo tu `CONTEXT-empresa.md` y localiza las métricas obligatorias, las entidades del sistema de inventario (productos, órdenes) y las restricciones de negocio definidas para tu compañía.
3. Crea la carpeta `docs/telemetry/` dentro del monorepo.
4. Trabaja ambos entregables dentro de esa carpeta:
   - `docs/telemetry/telemetry-plan.md`
   - `docs/telemetry/event-schemas.json`
5. **No hay servidor nuevo que levantar hoy.** El entregable es documentación de diseño, pero lo suficientemente precisa como para que otro desarrollador la instrumente sin tener que preguntarte nada.


---

## 💻 Qué Necesitas Hacer

### Fase 1 — Catálogo exhaustivo de oportunidades de datos

- [ ] Revisa tu `CONTEXT-empresa.md` e identifica las **métricas obligatorias** que tu compañía requiere desde ya. Estas son un piso, no un techo — deben estar en tu plan sí o sí.
- [ ] Mapea el **flujo de gestión de inventario** de tu aplicación: desde que un usuario autenticado accede al sistema hasta que completa una orden de entrada o salida. Identifica **al menos 5 puntos de instrumentación** en ese flujo — incluyendo intentos directos de modificar stock (que el sistema rechaza), validaciones fallidas y activaciones de umbral mínimo.
- [ ] Explora, sin limitarte a un número mínimo, otras secciones del backoffice que también puedan aportar datos valiosos: autenticación (intentos de login, sesiones expiradas, fallos de credenciales), rendimiento (tiempos de respuesta de API, tiempos de carga), errores de frontend no capturados, y navegación (qué secciones visitan más los operadores, qué flujos se abandonan). El objetivo es un catálogo amplio, no una lista mínima cumplida por trámite.
- [ ] Para cada oportunidad identificada, completa la frase: *"Capturamos `[event_type]` porque necesitamos saber `[hipótesis]`, lo que nos permite tomar la decisión `[decisión]`."* Si no puedes completarla, descarta el punto.
- [ ] Clasifica cada evento de tu catálogo en dos grupos: **obligatorio** (viene de tu CONTEXT) u **oportunidad identificada** (la propusiste tú). Esto le da al equipo visibilidad de qué es mínimo y qué es exploración.

> [!WARNING]
> **IMPORTANTE:** Las métricas obligatorias, entidades e identificadores de tu plan deben coincidir exactamente con lo que especifica tu `CONTEXT-empresa.md`. Además, se espera que el catálogo de oportunidades adicionales sea amplio y esté fundamentado — un plan que solo cubra el mínimo obligatorio, sin explorar el resto de la aplicación, no será aceptado.

--- 

### Fase 2 — Diseño del Event Envelope

- [ ] Define el **Event Envelope** estándar que usará tu compañía: los campos obligatorios que todo evento debe incluir (`eventId`, `timestamp` en ISO 8601, `sessionId`, `userId`, `event_type`, `schemaVersion`, `requestId` para correlación, y `properties` para el payload específico).
- [ ] Diseña el esquema completo de **todas las métricas obligatorias de tu CONTEXT**, más **al menos 8 eventos adicionales** de tu catálogo, cubriendo al menos 3 categorías distintas (por ejemplo: negocio/inventario, autenticación, rendimiento, errores, navegación). Cada `event_type` debe seguir la taxonomía `entidad_acción` con verbos consistentes (ej. `inbound_order_created`, `stock_threshold_triggered`, `direct_stock_edit_rejected`, `session_expired`, `api_latency_recorded`).
- [ ] Para cada evento, define un **allowlist de propiedades**: una lista explícita de las claves permitidas. Nada fuera del allowlist debe incluirse — esto previene fugas accidentales de datos.
- [ ] Para cada evento, especifica: `event_type`, descripción, `properties` (nombre, tipo, obligatorio/opcional, descripción), y si contiene datos sensibles o PII — en cuyo caso documenta cómo se anonimiza o sanitiza antes de emitirse.
- [ ] Exporta los esquemas al archivo `event-schemas.json` con una estructura validable (puedes usar JSON Schema draft-07 o una estructura personalizada documentada).

### Fase 3 — Estrategia de entrega

- [ ] Para cada evento diseñado, decide y justifica si debe procesarse como **stream** (tiempo real) o **batch** (lotes periódicos). La justificación debe basarse en la urgencia de la decisión que alimenta o en la necesidad operativa de detectarlo rápido — no en preferencia técnica.
- [ ] Documenta la estrategia de **throttle/debounce** para eventos de alta frecuencia (si existen en tu diseño).
- [ ] Escribe una sección de **riesgos y exclusiones** en el plan: eventos que consideraste y descartaste, y por qué; datos que no se van a capturar por razones de privacidad o costo.
 
 ---

 ---

## ✅ Qué Vamos a Evaluar

- [ ] Todas las métricas obligatorias de `CONTEXT-empresa.md` están presentes y correctamente identificadas en el plan.
- [ ] El plan cubre tanto oportunidades **técnicas** (errores, rendimiento, autenticación, navegación) como de **negocio**, de forma amplia — no limitada a un número mínimo cumplido por trámite.
- [ ] Cada evento tiene una hipótesis y una decisión de negocio u operativa que lo justifica — nada de eventos "por si acaso".
- [ ] El Event Envelope es consistente en todos los eventos y contiene al menos: `eventId`, `timestamp` (ISO 8601), `sessionId`, `userId`, `event_type` en formato `entidad_acción`, `schemaVersion`, `requestId`, y `properties`.
- [ ] Cada evento tiene un **allowlist de propiedades** documentado — solo claves explícitamente permitidas.
- [ ] El archivo `event-schemas.json` es válido y consistente con el plan en Markdown.
- [ ] La decisión stream/batch está justificada por urgencia de negocio u operación, no por preferencia técnica.
- [ ] Los datos sensibles o PII están identificados y documentados con su estrategia de anonimización o sanitización.
- [ ] La sección de riesgos y exclusiones demuestra pensamiento crítico: los eventos descartados tienen una razón.
- [ ] El plan es lo suficientemente preciso como para que otro desarrollador lo instrumente sin necesitar aclaraciones.

---

## 📦 Cómo Entregar

1. Asegúrate de que los archivos `docs/telemetry/telemetry-plan.md` y `docs/telemetry/event-schemas.json` estén en tu copia.
2. Crea un Pull Request contra la rama principal del monorepo con el título: `docs: telemetry design plan`.
3. En la descripción del PR, incluye:
   - El número total de eventos diseñados, y cuántos son obligatorios (del CONTEXT) vs. identificados por ti.
   - Las categorías cubiertas (negocio, autenticación, rendimiento, errores, navegación, etc.).
   - Una oración explicando la decisión de diseño más difícil que tomaste.
