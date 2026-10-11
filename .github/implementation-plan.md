# Implementation Plan: Pipeline Analítico y Endpoint de Telemetría Técnica

> **Documento de Diseño y Ejecución Técnica**  
> **Basado en:** `.github/STRATEGY.md`, `services/api/routes/telemetry.py`, `pyproject.toml`  
> **Marco Metodológico:** Code Refinement Suite (Nivel 2/3 — Pipeline de Datos & Endpoint Operacional)  
> **Modalidad:** Aprendizaje guiado paso a paso (Step-by-Step Tutor Mode: el usuario implementa, la IA acompaña y valida)

---

## 📌 Contexto y Objetivos

El sistema ya persiste eventos reales de telemetría en la tabla `telemetry_events` de Supabase (con campos `id`, `timestamp`, `event_type`, `service`, `session_id`, `user_id`, `request_id`, `tags`).

El objetivo de este hito técnico es construir un **pipeline analítico de ingeniería** y un endpoint operacional en FastAPI:
1. **Pipeline Desacoplado (`services/telemetry/analysis.py`):** Módulo en Python que consulta datos de `telemetry_events` en rangos específicos y ejecuta transformaciones puras en Pandas para generar métricas operacionales.
2. **Dimensiones Técnicas Reales:** Medir volumen de eventos por día, tasa de errores por tipo/endpoint, y tasa de fallos de autenticación (sin métricas de negocio como ventas o conversión).
3. **Conversión Estricta de Datetime UTC:** Prevenir agrupaciones incorrectas convirtiendo strings de fecha antes de cualquier `.groupby()`.
4. **Endpoint Operacional (`GET /telemetry/report`):** Servir las métricas agregadas bajo formato JSON estándar, protegido con autenticación (`get_current_user`), aceptando ventana de fechas ISO 8601 con valor por defecto de 7 días.
5. **Caché en Memoria (TTL 60s):** Evitar recalcular queries pesadas y transformaciones en requests concurrentes o repetidos dentro del intervalo.

---

## 🏛️ Evaluación de Arquitectura y Decisiones Técnicas (PACK 1: ARCHITECT)

Para diseñar este pipeline se evaluaron tres ramas alternativas de implementación mediante **Tree of Thoughts (ToT)** junto a la perspectiva de los tres roles clave:

### Comparativa de Alternativas (ToT):
1. **Rama A (Cálculo In-Endpoint con SQL puro):**
   - *Enfoque:* Realizar todas las agregaciones directamente en Postgres mediante queries SQL complejas dentro de la función del endpoint de FastAPI.
   - *Veredicto:* **Descartada.** Viola el requerimiento de `.github/STRATEGY.md` de usar Pandas para refinamiento y transformaciones multidimensionales sobre `tags` JSONB, y sobrecarga la capa del router de FastAPI sin desacoplamiento.
2. **Rama B (Descarga Completa de la Tabla y Cálculo en Pandas):**
   - *Enfoque:* Descargar toda la tabla `telemetry_events` en memoria en cada solicitud y hacer todo el filtrado por fecha y tipo en Pandas.
   - *Veredicto:* **Descartada.** Viola el principio de desempeño *"Nunca cargues toda la tabla en memoria"*. Colapsaría con alto volumen de eventos.
3. **Rama C (Arquitectura Híbrida: Push-down SQL + Refinamiento Vectorizado en Pandas + Cache Decorator) [Seleccionada]:**
   - *Enfoque:* SQL filtra el rango de fechas (`timestamp >= :start AND timestamp < :end`) y tipos necesarios; Pandas realiza limpieza, casting a datetime UTC, extracción de tags y `.groupby().agg()`; un módulo de caché con TTL almacena el resultado final serializable.
   - *Veredicto:* **Aprobada.** Máxima eficiencia de memoria, modularidad limpia y cumplimiento total de las directrices técnicas.

### Veredicto de los 3 Expertos:
- **Dev Lead:** Desacopla la lógica matemática y de datos en `services/telemetry/analysis.py`, permitiendo testear cada métrica de forma pura y unitaria sin levantar el servidor HTTP.
- **Sec Specialist:** Exige que `GET /telemetry/report` esté blindado con `Depends(get_current_user)` según el estándar del monorepo (`Auth Guard Standard`) para evitar exfiltración de telemetría interna por terceros.
- **UX / Front Lead:** Provee un contrato JSON predecible `{ "period": { "from": "...", "to": "..." }, "metrics": { ... } }`, ideal para renderizar gráficos o tablas en el backoffice sin parsing complejo.

---

## 🗺️ Mapa de Trabajo por Fases (Roadmap)

### Fase 0: Verificación de Prerrequisitos y Dependencias
- [x] **Paso 0.1 — Auditoría de Datos en Supabase:** Verificar que la tabla `telemetry_events` contenga al menos 20 eventos reales con diversidad de `event_type` (incluyendo eventos técnicos como errores o login fallido). *(Completado: 67 eventos reales detectados, incluyendo `auth_login_failed`, `web_vital_recorded`, etc.)*
- [x] **Paso 0.2 — Instalación de Dependencias con UV:** Incorporar `pandas` al entorno virtual del proyecto usando `uv add pandas` (sin usar pip). *(Completado: pandas 3.0.6 y numpy agregados exitosamente)*

---

### Fase 1: Pipeline de Análisis con Pandas (`services/telemetry/analysis.py`)
- [x] **Paso 1.1 — Creación del Módulo y Conexión SQL:** Crear el directorio `services/telemetry/` e inicializar `services/telemetry/analysis.py` importando `pandas`, el engine de base de datos (`services.api.database`) y utilidades de tiempo. *(Completado)*
- [x] **Paso 1.2 — Función Métrica 1: Volumen Diario de Eventos (`get_events_per_day`):**
  - Cargar eventos en la ventana `[start_date, end_date)` vía SQL.
  - Convertir `timestamp` con `pd.to_datetime(..., utc=True)` y extraer columna `date = df['timestamp'].dt.date`.
  - Agrupar con `.groupby(['date', 'event_type'])` y agregar con `.count()`.
  - Retornar `.reset_index().to_dict(orient='records')`. *(Completado y verificado)*
- [x] **Paso 1.3 — Función Métrica 2: Tasa y Distribución de Errores (`get_error_metrics`):**
  - Cargar eventos técnicos y de error (o filtrar por `event_type` que contenga error o flag en tags).
  - Extraer dimensiones de tags (ej. `endpoint`, `module` o `error_code`).
  - Calcular volumen de errores y tasa relativa por categoría.
  - Retornar lista de diccionarios serializables. *(Completado y verificado)*
- [x] **Paso 1.4 — Función Métrica 3: Tasa de Fallo de Autenticación (`get_auth_failure_rate`):**
  - Consultar en SQL eventos `user_login_failed` y `user_login_succeeded` en el rango temporal.
  - Convertir timestamps a `datetime` UTC y agrupar por fecha.
  - Calcular ratio: $\frac{\text{fallos}}{\text{fallos} + \text{éxitos}}$ por día en Pandas de forma vectorizada.
  - Retornar resultado como lista de dicts con clave `auth_failure_rate`. *(Completado y verificado)*
- [x] **Paso 1.5 — Función Orquestadora del Reporte (`generate_telemetry_report`):**
  - Función pura que recibe `(start_date: datetime, end_date: datetime)` y ejecuta las métricas coordinadamente devolviendo el diccionario con estructura `{ "period": ..., "metrics": ... }`. *(Completado y verificado)*

---

### Fase 2: Endpoint Operacional y Caché en Memoria (`GET /telemetry/report`)
- [x] **Paso 2.1 — Implementación de Caché en Memoria con TTL (60s):**
  - Reutilizar `InMemoryCache` de `services/api/cache.py` con clave normalizada por ventana de fechas y TTL de 60s. *(Completado y verificado: reducción de 218ms a 6ms)*
- [x] **Paso 2.2 — Definición de Ruta y Parámetros en FastAPI:**
  - Agregar el endpoint `GET /report` en `services/api/routes/telemetry.py`.
  - Parámetros query opcionales: `start_date: Optional[str] = None`, `end_date: Optional[str] = None` (formato ISO 8601).
  - Cálculo de valores por defecto (ventana de los últimos 7 días en UTC) si no se proveen. *(Completado y verificado)*
- [x] **Paso 2.3 — Protección Obligatoria (Auth Guard Standard):**
  - Inyectar `current_user: dict = Depends(get_current_user)` en la firma del endpoint. *(Completado: verificado que peticiones sin token devuelven HTTP 401)*
- [x] **Paso 2.4 — Integración con Caché y Pipeline:**
  - Comprobar existencia en caché no expirada; si existe, devolver de inmediato.
  - Si no existe, invocar `generate_telemetry_report(start, end)`, almacenar en caché con TTL de 60s y retornar respuesta HTTP 200. *(Completado y verificado)*

---

### Fase 3: Pruebas, Validación Fáctica y Entrega
- [x] **Paso 3.1 — Verificación CoVe (Chain of Verification):**
  - Validar tipos y serialización JSON ejecutando una prueba directa del pipeline con `uv run python`.
  - Probar llamada HTTP al endpoint con token JWT válido y verificar respuesta en menos de 100ms en el segundo request (prueba de caché superada: 6.12ms). *(Completado)*
- [x] **Paso 3.2 — Verificación de Agrupación Temporal:**
  - Confirmar que los timestamps se agrupen por día civil UTC sin desfasajes de zona horaria ni duplicaciones de claves de fecha string. *(Completado)*
- [x] **Paso 3.3 — Auditoría de Seguridad y Preparación de PR:**
  - Comprobar que ningún parámetro de query permita inyección SQL (uso estricto de parámetros parametrizados en SQLAlchemy/SQLModel).
  - Preparar información para el Pull Request con el título: `feat: telemetry report endpoint` documentando métricas y muestra del JSON obtenido. *(Listo para entrega)*

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)

Esta sección documenta la reflexión de los métodos analíticos aplicados para fundamentar el plan:

1. **Tree of Thoughts (ToT - PACK 1):**
   - Se analizaron tres caminos de ejecución (SQL puro, memoria completa en Pandas, e híbrido Push-down SQL + Pandas). La conclusión favorece el modelo híbrido porque minimiza el tráfico de red de Supabase al aplicar el filtro de ventana en la base de datos, mientras delega las transformaciones complejas de JSONB a Pandas, donde las estructuras no relacionales son procesadas eficientemente.

2. **Step-Back Prompting & Self-Refinement (PACK 2):**
   - Abstracción del problema: la telemetría no es un log plano, sino una serie temporal multidimensional. Se refinó el diseño separando la responsabilidad de *cálculo* (`services/telemetry/analysis.py`) de la responsabilidad de *transporte y caching* (`services/api/routes/telemetry.py`). Esto asegura que el pipeline pueda ser reutilizado en el futuro por tareas batch (cron jobs o workers en background) sin acoplarse a FastAPI.

3. **Chain of Verification (CoVe - PACK 3):**
   - Se contrastó previamente la existencia de librerías (`pyproject.toml`) detectando que `pandas` no estaba instalado, evitando fallos en tiempo de ejecución. Además, se verificó el esquema de la tabla `telemetry_events` en `telemetry.py` para asegurar que las columnas consultadas (`tags`, `timestamp`, `event_type`) coinciden con exactitud fáctica.

4. **Red Teaming & Auth Guard (PACK 4):**
   - Se evaluó el riesgo de denegación de servicio (DoS) por consultas temporales masivas y peticiones repetitivas, mitigándolo con la ventana obligatoria por defecto y la caché en memoria de 60 segundos. Se aplicó la directiva de seguridad del monorepo (`Depends(get_current_user)`) para impedir accesos anónimos a métricas de infraestructura.
