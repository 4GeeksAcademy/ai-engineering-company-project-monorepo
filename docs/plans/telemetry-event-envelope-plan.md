# Implementation Plan: Plan de Telemetría y Esquemas de Eventos (Nexova Solutions)

> **Documento de Diseño y Ejecución Técnica**  
> **Basado en:** `.github/STRATEGY.md` y `CONTEXT-company.md`  
> **Marco Metodológico:** Code Refinement Suite (Nivel 3 — Arquitectura)

---

## 📌 Contexto y Objetivos

Nexova Solutions opera en tres líneas de negocio críticas (Operaciones de Selección, Soporte al Cliente Externalizado y Formación Corporativa), además de gestionar inventario y recursos internos mediante FastAPI y Supabase. Actualmente, la operación carece de visibilidad en tiempo real sobre la salud técnica y el comportamiento del usuario/negocio.

El objetivo es diseñar e implementar la documentación técnica completa del sistema de telemetría sin instrumentar código en esta etapa:
1. `docs/telemetry/telemetry-plan.md`: Plan maestro de telemetría, justificaciones de negocio/técnicas, estrategia de entrega y riesgos.
2. `docs/telemetry/event-schemas.json`: Catálogo formal de esquemas estructurado bajo JSON Schema (draft-07) con **Event Envelope** uniforme y **allowlists** de propiedades.

---

## 📐 PACK 1: ARCHITECT — Perspectiva de los 3 Expertos

Antes de estructurar los esquemas, evaluamos las necesidades técnicas mediante tres roles clave:

1. **UX/UI Specialist (Experiencia y Navegación):**
   - *Foco:* Identificar fricciones, abandonos de flujo (funnels) y engagement en el backoffice de Nexova (panel unificado, módulo de scoring de candidatos y chat de soporte).
   - *Directriz:* Evitar la captura masiva e indiscriminada de clics (ruido/volumen innecesario); enfocar los eventos en hitos de usuario significativos (ej. abandono de formulario de scoring, visualización de detalle de ticket, filtros aplicados).

2. **Dev Lead (Arquitectura de Software y Rendimiento):**
   - *Foco:* Garantizar que la envoltura (`Event Envelope`) permita trazabilidad distribuida mediante `requestId` entre FastAPI, Supabase y los clientes web/scripts.
   - *Directriz:* Establecer una taxonomía consistente en formato `entidad_acción` en minúsculas y con verbos en pasado o participio (ej. `candidate_score_calculated`, `stock_direct_edit_rejected`). Definir claramente qué eventos requieren procesamiento en tiempo real (*stream*) y cuáles admiten procesamiento por lotes (*batch*).

3. **Security & Privacy Specialist (PII y Protección de Datos):**
   - *Foco:* Nexova maneja CVs de candidatos, correos corporativos y mensajes de soporte que contienen Información de Identificación Personal (PII).
   - *Directriz:* Establecer **Allowlists obligatorios** por evento para prevenir fugas accidentales (`properties` cerradas). Documentar explícitamente el hashing (SHA-256) o anonimización previa a la emisión de cualquier dato identificativo (emails, teléfonos, nombres).

---

## 🗺️ Mapa de Trabajo por Fases (Roadmap)

### Fase 1: Catálogo de Oportunidades y Alineación de Negocio
- [x] Analizar `CONTEXT-company.md` para extraer todas las entidades del negocio (Candidatos/Scoring, Tickets/Soporte, Usuarios/Operadores, Inventario/Órdenes).
- [x] Identificar y documentar el conjunto de **métricas obligatorias** como línea base mínima.
- [x] Mapear el flujo del sistema de inventario identificando al menos 5 puntos de control (ej. rechazo de edición directa de stock, disparo de umbral mínimo, fallos de validación en órdenes).
- [x] Explorar el backoffice y servicios complementarios (autenticación, rendimiento API, errores de cliente, scoring de selección).
- [x] Formular para cada evento la hipótesis y decisión asociada: *"Capturamos [event_type] porque necesitamos saber [hipótesis], lo que nos permite tomar la decisión [decisión]"*.
- [x] Clasificar formalmente cada evento en: `Obligatorio (Contexto)` u `Oportunidad Identificada (Propuesta)`.

### Fase 2: Estandarización de Event Envelope y JSON Schemas
- [x] Definir la estructura universal de envoltura (**Event Envelope**) con los 7 campos troncales:
  - `eventId` (UUID v4)
  - `timestamp` (ISO 8601 UTC)
  - `sessionId` (UUID o string de sesión)
  - `userId` (Identificador o hash del usuario)
  - `event_type` (Taxonomía `entidad_acción`)
  - `schemaVersion` (Versionado semántico, ej. `1.0.0`)
  - `requestId` (ID de correlación distribuida)
  - `properties` (Payload restringido por Allowlist)
- [x] Diseñar el esquema para las métricas obligatorias + un mínimo de 8 eventos adicionales en al menos 3 categorías (Negocio/Inventario, Autenticación/Seguridad, Rendimiento/Errores).
- [x] Elaborar la lista blanca (*allowlist*) de propiedades para cada evento con tipos de datos y nulabilidad.
- [x] Redactar y estructurar el archivo `docs/telemetry/event-schemas.json` conforme al estándar JSON Schema (draft-07).
- [x] Documentar el tratamiento de datos sensibles (PII) y reglas de anonimización/hashing.

### Fase 3: Estrategia de Entrega, Resiliencia y Riesgos
- [x] Clasificar cada evento como **Stream** (tiempo real, alta criticidad operativa) o **Batch** (lotes periódicos, analítica diferida), justificando cada caso según el impacto de negocio.
- [x] Definir estrategias de mitigación de volumen: reglas de **throttling** y **debouncing** para eventos de alta frecuencia.
- [x] Redactar la sección de **Riesgos y Exclusiones**: justificar eventos evaluados y descartados por costo o redundancia, y restricciones éticas/legales de privacidad.

### Fase 4: Auditoría de Calidad y Entrega (Pre-PR Checklist)
- [x] Verificar consistencia 1:1 entre `docs/telemetry/telemetry-plan.md` y `docs/telemetry/event-schemas.json`.
- [x] Validar sintaxis y formato JSON en `docs/telemetry/event-schemas.json`.
- [x] Preparar la descripción del Pull Request con el conteo de eventos, desglose de categorías y la decisión de diseño más compleja.

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)

En este plan de implementación se aplican conceptualmente las siguientes herramientas del marco:

1. **Tree of Thoughts (ToT - PACK 1: ARCHITECT):**
   - Se evaluaron diferentes enfoques para la captura de telemetría: (A) Logging estructurado directo en base de datos vs. (B) Event Envelopes tipados y desacoplados con pipelines stream/batch. Se seleccionó la opción B por escalabilidad y cumplimiento de privacidad.
2. **Step-Back Prompting & Abstracción (PACK 2: PLANNER):**
   - Antes de escribir nombres de campos individuales, se abstrajeron los dominios de la empresa (Talento, Soporte, Inventario) y las necesidades de correlación transversal (`requestId`, `sessionId`) para asegurar que el sistema responda a preguntas estratégicas y no solo a métricas aisladas.
3. **Chain of Verification (CoVe - PACK 3: CODER):**
   - Durante la creación de los esquemas, se verificará fáctícamente que cada evento en el JSON Schema coincida de manera exacta con los nombres, tipos y allowlists definidos en el documento Markdown.
4. **Red Teaming & Data Privacy Audit (PACK 4: AUDITOR):**
   - Se auditarán los payloads para asegurar que no se filtren contraseñas, tokens JWT ni datos personales de candidatos sin hash en ningún evento de telemetría.
