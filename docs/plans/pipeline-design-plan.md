# Implementation Plan: Pipeline de Desempeño de Negocio (Fase de Diseño)

> **Documento de Planificación y Arquitectura**  
> **Basado en:** `.github/STRATEGY.md`, `CONTEXT-company.md` (Nexova Solutions), `docs/telemetry/telemetry-plan.md`  
> **Marco Metodológico:** Code Refinement Suite (Nivel 3 — Arquitectura Crítica de Datos)  
> **Modalidad:** Modo Tutor / Aprendizaje guiado (el usuario ejecuta, el mentor acompaña)

---

## 📌 Contexto y Objetivos

En el hito anterior, Nexova Solutions implementó la captura de eventos en `telemetry_events` y un endpoint técnico (`GET /telemetry/report`) para monitorear salud de infraestructura (errores, latencia, volumen).

Hoy el Tech Lead exige una transición hacia el valor de negocio: diseñar un **Pipeline de Desempeño de Negocio** para la dirección ejecutiva (CEO Laura Mendoza y líderes de departamento). El objetivo de este hito no es escribir código aún, sino elaborar el documento formal de arquitectura en `data/pipelines/PIPELINE_DESIGN.md`.

### Principios y Restricciones Innegociables:
1. **Cero impacto en telemetría técnica:** No modificar `services/telemetry/analysis.py` ni `GET /telemetry/report`.
2. **Separación estricta de destino:** `telemetry_events` es únicamente fuente de lectura; nunca el destino.
3. **Esquema dedicado `reporting`:** Todas las tablas nuevas vivirán bajo el esquema `reporting` (ej. `reporting.executive_kpis` o `reporting.sla_performance`).
4. **Separación de capas del monorepo:**
   - Orquestación en `data/pipelines/`
   - Transformaciones en `data/process/`
   - Endpoints HTTP en `services/reporting/` (importan de `data/pipelines/`, nunca al revés).
5. **Los 3 pilares de robustez:** Idempotencia, Observabilidad y Recuperabilidad.

---

## 🏛️ Evaluación de Arquitectura y Decisiones Técnicas (PACK 1: ARCHITECT)

Se analizaron tres alternativas arquitectónicas mediante **Tree of Thoughts (ToT)**:

### Comparativa de Alternativas (ToT):
1. **Rama A (Extensión Directa del Reporte Técnico):**
   - *Enfoque:* Añadir los cálculos de negocio al script existente `analysis.py` y servirlos en el mismo endpoint `/telemetry/report`.
   - *Veredicto:* **Descartada rotundamente.** Viola la separación de intereses (mezcla métricas de depuración de infraestructura con KPIs ejecutivos) y está expresamente prohibida por `.github/STRATEGY.md`.
2. **Rama B (Script Monolítico tipo Cron sin Persistencia de Control):**
   - *Enfoque:* Un script en Python suelto que corre periódicamente, recalcula datos y sobreescribe tablas sin tracking de corridas ni control de estados.
   - *Veredicto:* **Descartada.** Es frágil frente a caídas parciales de conexión, genera condiciones de carrera si se dispara manualmente y no ofrece auditabilidad.
3. **Rama C (Pipeline Modular desacoplado con Prefect y Auditoría de Corridas) [Seleccionada]:**
   - *Enfoque:* Diseño basado en Prefect (Flows, Tasks, States, Blocks), ingesta idempotente por lotes hacia tablas dedicadas en `reporting.*`, log de auditoría persistente (`pipeline_runs`) y micro-endpoints en `services/reporting/`.
   - *Veredicto:* **Aprobada.** Garantiza reproducibilidad, recuperación limpia ante fallos y escalabilidad para las siguientes fases del curso.

### Veredicto de los 3 Expertos:
- **Dev Lead:** Desacopla la lógica de ETL en tareas atómicas (`extract`, `transform`, `load`), permitiendo reintentos selectivos y pruebas unitarias aisladas.
- **Sec Specialist:** Centraliza credenciales de Supabase mediante Prefect Blocks (ocultando secretos del código) y asegura que los endpoints en `services/reporting/` apliquen `Auth Guard Standard` (`Depends(get_current_user)`).
- **UX / Business Lead:** Brinda a la dirección ejecutiva métricas con granularidad temporal clara y rastro de auditoría, eliminando la generación manual de PDFs semanales.

---

## 🗺️ Mapa de Trabajo por Fases (Roadmap)

### Fase 1: Análisis del Estado Actual y Brecha de Negocio
- [ ] **Paso 1.1 — Inventario del Estado Actual:** Documentar los eventos de telemetría existentes en `telemetry_events` (ej. `auth_login_failed`, `candidate_scored`, `order_created`), su almacenamiento en Supabase y el alcance actual de `GET /telemetry/report`.
- [ ] **Paso 1.2 — Identificación de la Brecha de Negocio:** Contrastar las métricas de infraestructura con las necesidades descritas en `CONTEXT-company.md` (ej. tiempo de resolución de tickets vs. SLA de 24h, tasa de automatización del chatbot, eficiencia del scoring de candidatos).

---

### Fase 2: Definición de Propósito y Flujo de Datos
- [ ] **Paso 2.1 — Propósito en una Sola Frase:** Redactar la declaración concisa del pipeline nombrando el entregable concreto, la periodicidad y la audiencia (ej. CEO Laura Mendoza / Responsables de Área).
- [ ] **Paso 2.2 — Especificación de Extracción:** Definir la fuente (`telemetry_events`), volumen estimado, cadencia de refresco y estructura del payload JSONB.
- [ ] **Paso 2.3 — Diagrama de Flujo (Mermaid):** Crear un diagrama de arquitectura que represente con precisión las etapas de Extracción, Transformación y Carga hacia el esquema `reporting`.
- [ ] **Paso 2.4 — Estrategia para Actualizaciones:** Documentar la estrategia de manejo de datos que sufren mutaciones posteriores o actualizaciones de estado.
- [ ] **Paso 2.5 — Esquema de Destino y Endpoints:** Especificar la tabla exacta bajo `reporting.*` y los endpoints planificados en `services/reporting/`.

---

### Fase 3: Resiliencia, Idempotencia y Registro de Auditoría
- [ ] **Paso 3.1 — Estrategia de Idempotencia:** Detallar el mecanismo para garantizar que una reejecución tras fallo parcial no genere registros duplicados (ej. `upsert` por clave de partición / `ON CONFLICT DO UPDATE`).
- [ ] **Paso 3.2 — Diseño del Log de Ejecución (`pipeline_runs`):** Definir el esquema de la tabla de auditoría con al menos 5 campos obligatorios (`run_id`, `started_at`, `finished_at`, `status`, `records_processed`, `error_message`) justificando la utilidad técnica de cada uno.
- [ ] **Paso 3.3 — Respuestas a Preguntas de Resiliencia:** Redactar las soluciones a los casos límite: duplicados en origen (`eventId`), datos tardíos (*late-arriving*), detección de silencio (*heartbeat*), buffer offline en frontend y carreras de concurrencia.

---

### Fase 4: Mapeo Conceptual a Prefect
- [ ] **Paso 4.1 — Definición del Flow Principal y Subflows:** Diseñar la función `@flow` coordinadora del pipeline de negocio y sus dependencias.
- [ ] **Paso 4.2 — Desglose de Tasks Atómicas:** Especificar al menos 3 `@task` (extracción, transformación, carga) y los estados manejados (*Running*, *Completed*, *Failed*).
- [ ] **Paso 4.3 — Configuración de Prefect Blocks:** Definir los bloques de configuración para credenciales de base de datos y parámetros de ejecución.

---

### Fase 5: Integración con la Aplicación (`services/reporting/`)
- [ ] **Paso 5.1 — Especificación de Endpoints:** Diseñar el contrato OpenAPI de los 3 endpoints requeridos:
  - `GET /reporting/status`: Consulta el último estado desde `pipeline_runs`.
  - `POST /reporting/trigger`: Disparo manual del flow en `data/pipelines/`.
  - `GET /reporting/kpis`: Feed de datos consolidados para el dashboard.
- [ ] **Paso 5.2 — Seguridad (Auth Guard):** Asegurar que todos los endpoints incluyan `Depends(get_current_user)`.
- [ ] **Paso 5.3 — Mapeo de Importaciones:** Garantizar que los endpoints importen exclusivamente desde `data/pipelines/` y no contengan lógica ETL embebida.

---

### Fase 6: Revisión contra Rúbrica y Entrega Git
- [ ] **Paso 6.1 — Verificación cruzada:** Contrastar punto por punto con la sección `## ✅ Qué Vamos a Evaluar` de `.github/STRATEGY.md`.
- [ ] **Paso 6.2 — Creación y Commit de `data/pipelines/PIPELINE_DESIGN.md`:** Realizar el commit formal con el mensaje solicitado: `feat: add business performance pipeline design document`.

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)

1. **Tree of Thoughts (ToT - PACK 1):**
   Se exploraron y contrastaron tres alternativas de diseño, seleccionando la Rama C para aislar el cómputo pesado de datos y estructurarlo bajo un orquestador estándar (Prefect), desacoplándolo del ciclo de vida síncrono de FastAPI.

2. **Step-Back Prompting & Domain Abstraction (PACK 2):**
   Se elevó la perspectiva del código de telemetría a los problemas centrales del negocio de Nexova Solutions (SLAs de soporte, scoring de candidatos y reportes ejecutivos), diseñando un modelo que responde preguntas directas de stakeholders no técnicos.

3. **Chain of Verification (CoVe - PACK 3):**
   Se contrastaron los nombres de las carpetas y convenciones del monorepo (`data/pipelines/`, `data/process/`, `services/reporting/`) para garantizar que la arquitectura planteada no genere colisiones ni dependencias circulares.

4. **Red Teaming & Resilience Audit (PACK 4):**
   Se diseñaron salvaguardas anticipadas frente a fallos comunes en producción: ataques por sobrecarga o colisiones de cron con `locks` de ejecución, cortes de red en Supabase mediante reintentos atómicos con `upsert`, y control estricto de accesos vía JWT (`Auth Guard Standard`).
