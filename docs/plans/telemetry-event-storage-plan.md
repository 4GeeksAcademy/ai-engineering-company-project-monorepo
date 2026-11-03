# Implementation Plan: Almacenamiento de Telemetría en Supabase (Nexova Solutions)

> **Documento de Diseño y Ejecución Técnica**  
> **Basado en:** `.github/STRATEGY.md`, `CONTEXT-company.md`, y especificaciones de telemetría de fases anteriores  
> **Marco Metodológico:** Code Refinement Suite (Nivel 2 / Nivel 3 — Persistencia en DB & Resiliencia de Ingesta)  
> **Modalidad:** Aprendizaje guiado paso a paso (Step-by-Step Tutor Mode)

---

## 📌 Contexto y Objetivos

Nexova Solutions cuenta con el `TelemetryService` en el frontend (`uis/backoffice`) emitiendo lotes periódicos de eventos y un stub en FastAPI (`services/api/routes/telemetry.py`) que los recibe y descarta. 

El objetivo de este proyecto es transformar ese stub en un **sistema real de persistencia analítica de alto rendimiento** en Supabase, cumpliendo con los siguientes principios innegociables:
1. **Zero Frontend Impact:** El frontend no sufre ninguna modificación; la URL y el contrato HTTP se mantienen intactos.
2. **Bulk Insert en Transacción Única:** Los eventos de un lote se persisten en una sola operación en base de datos para no saturar el pool de conexiones.
3. **Aceptación Parcial (Parseo por Evento):** Un evento inválido dentro de un lote no cancela los eventos válidos. No se usa body tipado que lance HTTP 422 global.
4. **Inmutabilidad Analítica:** La tabla `telemetry_events` es de tipo *append-only* (solo inserciones; sin actualizaciones ni eliminaciones).
5. **Indexación Estratégica:** B-Tree en `timestamp` y `event_type`, y GIN en `tags` (JSONB) para búsquedas flexibles y de alta velocidad.

---

## 🗺️ Mapa de Trabajo por Fases (Roadmap)

### Fase 1: Tabla de Almacenamiento en Supabase (`telemetry_events`)
- [ ] **Paso 1.1 — Definición del Script DDL:** Diseñar el DDL en PostgreSQL con exactamente las 8 columnas requeridas:
  - `id` (`UUID`, Primary Key, autogenerado o mapeado desde `eventId`).
  - `timestamp` (`TIMESTAMPTZ`, no nulo).
  - `event_type` (`TEXT` / `VARCHAR`, no nulo).
  - `service` (`TEXT`, no nulo, identificador del servicio emisor, ej. `'backoffice'`).
  - `session_id` (`TEXT`, nullable).
  - `user_id` (`TEXT`, nullable, hash SHA-256 anónimo).
  - `request_id` (`UUID` / `TEXT`, no nulo, correlación distribuida).
  - `tags` (`JSONB`, no nulo, carga útil de `properties` con allowlist preservado).
- [ ] **Paso 1.2 — Creación de Índices de Rendimiento:** Definir los 3 índices esenciales:
  - B-tree en `timestamp` (consultas temporales y series de tiempo).
  - B-tree en `event_type` (filtrado analítico por tipo de evento).
  - GIN en `tags` (búsquedas por claves y valores dentro del objeto JSONB).
- [ ] **Paso 1.3 — Reglas de Inmutabilidad:** Asegurar que la tabla no admita operaciones `UPDATE` ni `DELETE` (revocación de permisos o trigger preventivo de inmutabilidad).
- [ ] **Paso 1.4 — Ejecución y Validación del Esquema:** Aplicar el script en el entorno de Supabase y verificar en el esquema que la tabla y sus índices existan correctamente.

---

### Fase 2: Endpoint Real en FastAPI (`services/api/routes/telemetry.py`)
- [ ] **Paso 2.1 — Cliente / Conexión a Base de Datos:** Configurar la conexión hacia Supabase en `services/` (utilizando el engine de base de datos existente o cliente oficial vía variables de entorno).
- [ ] **Paso 2.2 — Recepción Laxa del Payload (Evitar 422 Global):** Modificar la firma del endpoint `POST /telemetry/events` para que reciba el body de forma laxa (un diccionario o modelo con `events: list[dict]`), permitiendo que el handler controle la validación interna.
- [ ] **Paso 2.3 — Loop de Validación Parcial por Evento:** Iterar sobre cada evento crudo dentro de un bloque `try / except ValidationError`:
  - Validar usando `TelemetryEvent.model_validate(raw_item)` (reutilizando el modelo de `services/api/schemas.py` sin modificaciones).
  - Si es válido: añadir a la lista de inserción masiva.
  - Si es inválido: incrementar contador `rejected` y continuar con el siguiente.
- [ ] **Paso 2.4 — Transformación y Mapeo al Esquema de Supabase:** Mapear cada instancia válida de `TelemetryEvent` a la estructura de la fila de `telemetry_events` (asignando `properties` a la columna `tags` y asignando `'backoffice'` a `service`).
- [ ] **Paso 2.5 — Inserción Masiva (Bulk Insert):** Ejecutar una única inserción SQL con todos los eventos válidos del lote en una sola operación/transacción.
- [ ] **Paso 2.6 — Respuesta Estructurada:** Retornar HTTP 200 con el payload `{ "received": N, "stored": M, "rejected": R }`, asegurando compatibilidad completa con el `TelemetryService` del frontend.

---

### Fase 3: Verificación End-to-End y Validación de Resiliencia
- [ ] **Paso 3.1 — Generación de Eventos en Vivo desde el Backoffice:** Levantar el frontend y backend, navegar e interactuar en el backoffice para registrar órdenes de inventario (inbound/outbound) y disparar eventos de telemetría técnicos y de negocio.
- [ ] **Paso 3.2 — Auditoría de Filas en Supabase:** Consultar directamente la tabla `telemetry_events` y verificar que los eventos se hayan persistido con todos sus campos íntegros (`event_type`, `timestamp`, `tags`, etc.).
- [ ] **Paso 3.3 — Prueba de Rechazo y Lotes Mixtos:** Ejecutar una prueba con `curl` enviando un lote mixto (eventos válidos + eventos con campos faltantes o tipos erróneos) para verificar que la respuesta refleje exactamente `stored` y `rejected`, sin arrojar error 422 ni abortar el guardado de los válidos.
- [ ] **Paso 3.4 — Verificación de Integridad de Frontend:** Confirmar mediante `git status` / `diff` que el código de `uis/` no haya sufrido modificaciones.

---

### Fase 4: Preparación de Evidencias y Entrega (Pull Request)
- [ ] **Paso 4.1 — Capturas de Pantalla y Evidencias Técnicas:** Obtener captura de Supabase con al menos 5 filas reales y registrar el JSON de respuesta del test de lote mixto.
- [ ] **Paso 4.2 — Creación del Pull Request:** Crear rama de trabajo y abrir el PR con el título `feat: telemetry event storage` y la descripción formal requerida por el proyecto.

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)

Esta planificación se fundamenta en las técnicas del marco de trabajo **Code Refinement Suite**:

### 1. Tree of Thoughts (ToT — PACK 1: ARCHITECT)
Para resolver la recepción y almacenamiento de eventos de alta frecuencia, se evaluaron tres ramas arquitectónicas:
* **Rama A (Inserción individual por evento con body tipado):** Cada evento validado automáticamente por FastAPI; inserción con bucle `INSERT INTO`.  
  * *Veredicto:* **Rechazada.** Un evento mal formado aborta todo el lote con error HTTP 422. Además, múltiples transacciones individuales saturan el pool de conexiones de Supabase.
* **Rama B (Cola asíncrona intermedia con Celery / Redis):** Enviar el lote a un broker de mensajería y procesar en segundo plano.  
  * *Veredicto:* **Rechazada por sobreingeniería.** Añade dependencias operativas de infraestructura pesada que exceden el requerimiento actual del monorepo.
* **Rama C (Validación granular en memoria + Bulk Insert en transacción única):** Recibir el envelope como lista de diccionarios, validar por ítem con `model_validate`, acumular eventos válidos e insertarlos en una única sentencia `INSERT` hacia Supabase.  
  * *Veredicto:* **Seleccionada.** Ofrece resiliencia a nivel de evento (tolerancia a fallos), respuesta inmediata al cliente y máxima eficiencia en conexiones de base de datos.

### 2. Step-Back Prompting & Abstracción (PACK 2: PLANNER)
* **Abstracción del Desacople:** Se separó la capa de transporte (donde `properties` es un payload dinámico validado por Pydantic) de la capa analítica de almacenamiento (donde `tags` se almacena como `JSONB`). Esto garantiza que el esquema relacional no requiera migraciones costosas cada vez que se incorpore un nuevo evento con distintas dimensiones de negocio.
* **Refinamiento en 3 Ciclos:**
  * *Ciclo 1:* Establecimiento de la firma de columnas e invariantes (8 columnas fijas + inmutabilidad).
  * *Ciclo 2:* Estrategia de control de errores (transformación del stub a validador tolerante a fallos sin 422 global).
  * *Ciclo 3:* Diseño de la suite de verificación con pruebas de regresión de frontend y lotes mixtos.

### 3. Chain of Verification (CoVe — PACK 3: CODER)
* Se verificará metódicamente que:
  * El modelo `TelemetryEvent` en `services/api/schemas.py` no sea modificado.
  * Los nombres de campos del envelope correspondan 1:1 con las columnas de la tabla: `eventId` → `id`, `properties` → `tags`, `timestamp` → `timestamp`, `event_type` → `event_type`, etc.
  * Las dependencias de base de datos se gestionen estrictamente con `uv` y sin `pip`.

### 4. Red Teaming & Inmutabilidad (PACK 4: AUDITOR)
* **Auditoría de Inmutabilidad:** Validación de que ninguna ruta o consulta exponga sentencias `UPDATE` o `DELETE` sobre `telemetry_events`.
* **Prueba de Inyección / Fuzzing de Esquemas:** Simulación de payloads manipulados (valores nulos indebidos, estructuras JSON anidadas no conformes) para constatar que el validador Pydantic rechace individualmente sin romper el proceso de ingesta.
