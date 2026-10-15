# Implementation Plan: Pipeline de Desempeño de Negocio Resiliente (Parte 2 de 3)

> **Documento de Planificación y Arquitectura de Ejecución**  
> **Basado en:** `.github/STRATEGY.md`, `data/pipelines/PIPELINE_DESIGN.md`, `CONTEXT-company.md` (Nexova Solutions), `docs/telemetry/telemetry-plan.md`  
> **Marco Metodológico:** Code Refinement Suite (Nivel 3 — Arquitectura Crítica de Datos)  
> **Modalidad:** Modo Tutor / Aprendizaje guiado (el usuario ejecuta, el mentor acompaña)  

---

## 📌 Contexto y Objetivos

Con el documento de diseño arquitectónico formalmente aprobado en `data/pipelines/PIPELINE_DESIGN.md` y commiteado en el monorepo, este hito corresponde a la **implementación del pipeline en código funcional y resiliente**.

El pipeline debe construirse con **Prefect 3**, leyendo de la tabla de telemetría técnica `public.telemetry_events` y transformando esos eventos en indicadores ejecutivos de desempeño comercial y contractual, persistidos en la tabla `reporting.executive_kpis` y auditados en `reporting.pipeline_runs`.

### Principios y Restricciones Innegociables:
1. **Cero impacto en telemetría técnica:** `services/telemetry/analysis.py` y el endpoint `GET /telemetry/report` permanecen **intactos**.
2. **Separación estricta de destino:** `telemetry_events` es exclusivamente fuente de lectura; el destino es `reporting.executive_kpis`.
3. **Resiliencia de Producción:**
   - Tasks con reintentos configurados (`retries`, `retry_delay_seconds`).
   - Al menos una task opcional invocada con `return_state=True` que no interrumpa el flujo si falla.
   - Caché de resultados (`cache_key_fn`, `cache_expiration`) en la transformación pesada.
4. **Idempotencia Estricta:** Re-ejecutar el pipeline sobre la misma ventana no duplica filas en `reporting.executive_kpis` gracias al `UPSERT`.
5. **Autonomía CLI:** `python data/pipelines/pipeline.py` debe ser ejecutable desde terminal.
6. **Endpoints desacoplados:** Los 3 endpoints (`GET /reporting/status`, `POST /reporting/trigger`, `GET /reporting/kpis`) residen en `services/reporting/` e importan desde `data/pipelines/`, protegidos obligatoriamente con **Auth Guard** (`Depends(get_current_user)`).

---

## 🏛️ Evaluación de Arquitectura y Decisiones Técnicas (PACK 1: ARCHITECT)

Se analizaron tres alternativas de implementación mediante **Tree of Thoughts (ToT)**:

### Comparativa de Alternativas (ToT):
1. **Rama A (Script plano con Cron y sin Framework):**
   - *Enfoque:* Un script de Python tradicional ejecutado por cron que realiza consultas directas con `psycopg2`.
   - *Veredicto:* **Descartada.** Carece de gestión declarativa de estados, no ofrece reintentos automáticos ni control nativo de concurrencia y viola el mandato del ticket de usar Prefect.
2. **Rama B (Prefect con persistencia volátil en memoria / SQLite local):**
   - *Enfoque:* Flow de Prefect que persiste los KPIs y corridas en archivos locales JSON o SQLite temporal.
   - *Veredicto:* **Descartada.** Provoca divergencia en producción y desacopla los reportes de la base de datos principal de Supabase.
3. **Rama C (Prefect 3 Modular + Supabase/SQLModel + Módulo `services/reporting/`) [Seleccionada]:**
   - *Enfoque:* Pipeline estructurado con `@flow` y `@task` en `data/pipelines/pipeline.py`, lógica de agregación en `data/process/transformations.py`, auditoría en `reporting.pipeline_runs`, persistencia idempotente vía `UPSERT` en `reporting.executive_kpis`, y exposición HTTP mediante FastAPI en `services/reporting/routes.py`.
   - *Veredicto:* **Aprobada.** Satisface los 13 criterios de evaluación de `.github/STRATEGY.md` y asegura compatibilidad con la Parte 3 (Dashboard).

### Veredicto de los 3 Expertos:
- **Dev Lead:** La separación entre `data/pipelines/pipeline.py` (orquestación) y `data/process/transformations.py` (cálculo matricial con Pandas) permite probar de forma unitaria las métricas sin necesidad de levantar Prefect.
- **Sec Specialist:** Credenciales leídas exclusivamente de variables de entorno (`.env` / Supabase), y todos los nuevos endpoints protegidos con JWT mediante `Auth Guard Standard`.
- **UX / Business Lead:** Los datos se estructuran con el contrato JSON exacto que consumirá el panel ejecutivo de Laura Mendoza, eliminando los reportes manuales en PDF.

---

## 🗺️ Mapa de Trabajo por Fases (Roadmap)

### Fase 0: Preparación del Entorno
- [x] **Paso 0.1 — Instalación de dependencias:** Instalar Prefect 3 mediante `uv add "prefect>=3"`.
- [x] **Paso 0.2 — Creación de estructura de directorios:** Asegurar la existencia de `data/pipelines/`, `data/process/`, `data/raw/`, `data/eval/` y `services/reporting/`.
- [x] **Paso 0.3 — Modelos y Tablas de Base de Datos:** Definir los esquemas/tablas `reporting.executive_kpis` y `reporting.pipeline_runs` (soporte en Supabase/PostgreSQL o fallback SQLite transaccional según entorno).

---

### Fase 1: Implementación de Transformaciones y Métricas de Negocio (`data/process/`)
- [x] **Paso 1.1 — Transformación de Soporte (MTTR & SLAs):** Implementar el cálculo de MTTR (horas) y % de tickets con SLA excedido (> 24h) a partir de `support_ticket_resolved`.
- [x] **Paso 1.2 — Transformación de Chatbot (Tasa de Automatización):** Implementar el cálculo de tasa de resolución autónoma a partir de `chatbot_issue_resolved` (meta: 40%).
- [x] **Paso 1.3 — Transformación de Selección (Scoring de Talento):** Implementar el conteo de CVs evaluados y distribución de scores a partir de `candidate_score_calculated`.
- [x] **Paso 1.4 — Deduplicación y Consolidación:** Consolidar métricas por ventana de fecha y departamento con deduplicación por entidad.

---

### Fase 2: Construcción del Pipeline Resiliente con Prefect (`data/pipelines/pipeline.py`)
- [x] **Paso 2.1 — Task de Extracción (`extract_events_task`):** 
  - Lectura de `telemetry_events` por ventana temporal.
  - Configurada con `retries=3` y `retry_delay_seconds=10` (con comentario justificativo para fallos transitorios de red).
- [x] **Paso 2.2 — Task de Transformación con Caché (`transform_kpis_task`):**
  - Invoca la lógica de `data/process/`.
  - Configurada con `cache_key_fn` y `cache_expiration=timedelta(minutes=60)` (con comentario explicando clave por ventana).
- [x] **Paso 2.3 — Task de Carga Idempotente (`load_kpis_task`):**
  - `UPSERT` en `reporting.executive_kpis` apoyado en el constraint único `(window_date, department, metric_name)`.
  - Configurada con `retries=3` y `retry_delay_seconds=5`.
- [x] **Paso 2.4 — Task Opcional No Crítica (`optional_eval_snapshot_task`):**
  - Genera un snapshot analítico en `data/eval/`.
  - Invocada dentro del flow con `return_state=True` para que un fallo no interrumpa la ejecución principal.
- [x] **Paso 2.5 — Task de Registro de Auditoría (`log_pipeline_run_task`):**
  - Inserta metadata de la corrida en `reporting.pipeline_runs` (`run_id`, `started_at`, `finished_at`, `records_processed`, `status`, `error_message`).
- [x] **Paso 2.6 — Flow Coordinador (`business_performance_flow`):**
  - Orquestación completa de las tasks con manejo explícito de errores.
  - Bloque `if __name__ == "__main__":` para ejecución directa vía CLI (`python data/pipelines/pipeline.py`).

---

### Fase 3: Endpoints del Backend (`services/reporting/`)
- [x] **Paso 3.1 — Creación del Router (`services/reporting/routes.py`):**
  - `GET /reporting/status`: Consulta el último registro de `reporting.pipeline_runs`.
  - `POST /reporting/trigger`: Dispara manualmente el flow de Prefect importado desde `data/pipelines/pipeline.py`.
  - `GET /reporting/kpis`: Devuelve las filas de KPIs de `reporting.executive_kpis` con filtro por fecha y departamento.
- [x] **Paso 3.2 — Cumplimiento de Seguridad (Auth Guard):**
  - Proteger los 3 endpoints con `current_user: dict = Depends(get_current_user)`.
- [x] **Paso 3.3 — Registro en FastAPI (`services/api/main.py`):**
  - Incluir `app.include_router(reporting.router)` en `services/api/main.py`.

---

### Fase 4: Pruebas, Verificación y Documentación
- [x] **Paso 4.1 — Verificación CLI:** Ejecutar `python data/pipelines/pipeline.py` y verificar salida sin errores y registro en BD.
- [x] **Paso 4.2 — Verificación de Idempotencia:** Correr el script por segunda vez y constatar que no existen filas duplicadas en la tabla de destino.
- [x] **Paso 4.3 — Verificación de Endpoints HTTP:** Probar peticiones locales a `/reporting/status`, `/reporting/trigger` y `/reporting/kpis`.
- [x] **Paso 4.4 — Actualización de Documentación:** Registrar en `data/pipelines/PIPELINE_DESIGN.md` el comando exacto de CLI y la frecuencia del cron.

---

### Fase 5: Auditoría y Entrega Git (PACK 4: AUDITOR)
- [x] **Paso 5.1 — Checklist de Evaluación:** Contrastar los 13 ítems de la sección `## ✅ Qué Vamos a Evaluar` de `.github/STRATEGY.md`.
- [ ] **Paso 5.2 — Commit Formal:** Commit con el mensaje exacto: `feat: implement resilient business performance pipeline`.
- [ ] **Paso 5.3 — Push a GitHub:** Solicitar confirmación al usuario antes del push a la rama remota.

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)

1. **Tree of Thoughts (ToT - PACK 1):**
   Se contrastaron tres alternativas para la ejecución del pipeline (Script tradicional, almacenamiento volátil y Prefect 3 modular con Supabase). Se seleccionó la tercera para garantizar observabilidad, reintentos desacoplados y persistencia auditable.

2. **Step-Back Prompting & Domain Abstraction (PACK 2):**
   Se abstrajeron las métricas técnicas hacia los contratos de negocio de Nexova: SLA contractual de 24h en atención al cliente, 40% de resolución autónoma por chatbot y volumen de cribado con IA para 40 consultores de talento.

3. **Chain of Verification (CoVe - PACK 3):**
   Se verificó que los endpoints pertenezcan a `services/reporting/`, que `services/telemetry/` permanezca inmutable, que las importaciones sean estrictamente unidireccionales (`services` $\rightarrow$ `data/pipelines`), y que el comando de ejecución directa cumpla con `python data/pipelines/pipeline.py`.

4. **Red Teaming & Resilience Audit (PACK 4):**
   Se diseñó la tolerancia a fallos transitorios de red mediante `retries` y `retry_delay_seconds`, la no interrupción del flow ante caídas de la tarea de evaluación mediante `return_state=True`, y la protección de endpoints sensibles aplicando obligatoriamente el `Auth Guard Standard` (`Depends(get_current_user)`).
