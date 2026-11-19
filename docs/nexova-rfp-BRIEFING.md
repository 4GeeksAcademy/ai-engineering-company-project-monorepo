# BRIEFING — Nexova: Hito 9, Flujos de Trabajo Agénticos (Partes 1, 2 y 3)

> Este documento es válido para las tres partes del Hito 9. Léelo completo antes de empezar la Parte 1 — las Partes 2 y 3 reutilizan los mismos departamentos, formato de RFP y lineamientos definidos aquí.

## 1. Introducción

En Nexova, las RFPs llegan directo al equipo de **Marcos Ibáñez, Sales Director**: clientes potenciales (empresas de tecnología, retail o finanzas) que piden una propuesta para outsourcing de selección, soporte al cliente o capacitación corporativa. El ciclo de venta actual dura entre 3 y 8 semanas, y buena parte de ese tiempo se va en ida y vuelta por correo con Selección, Capacitación o Soporte para armar el alcance y el precio.

## 2. Departamentos y estructuras de datos

### 2.1 Departamentos que participan en la propuesta

Usa exactamente estos identificadores de departamento:

| `department_id` | Departamento                   | Responsable    | Qué aporta a la propuesta                                                  |
| --------------- | ------------------------------ | -------------- | -------------------------------------------------------------------------- |
| `seleccion`     | Talent Selection Operations    | Javier Almeida | Roles a cubrir, tiempo estimado de cierre, horas de consultoría necesarias |
| `capacitacion`  | Corporate Training             | Elena Vargas   | Programas de formación aplicables, duración, modalidad                     |
| `soporte`       | Customer Support (outsourcing) | Roberto Díaz   | Dotación de agentes, turnos, SLA de respuesta comprometido                 |

No toda RFP necesita a los tres departamentos: depende de qué servicio(s) pide el cliente (headhunting, training, soporte outsourced, o una combinación). Tu clasificador/orquestador debe identificar qué departamentos aplican leyendo el documento — nunca actives los tres por defecto.

### 2.2 Formato de una RFP real

Las RFPs llegan como PDF e incluyen normalmente: nombre y sede del cliente (España o Miami — esto define la moneda de la propuesta), servicio(s) solicitados, volumen (número de roles, número de agentes, número de participantes en training), fecha límite, y a veces un presupuesto de referencia.

### 2.3 Entidades sugeridas para tu estado

Persiste **Ticket**, **metadatos RFP** y **DepartmentSection** (al menos `key_aspects` en la Parte 1; borradores/evals/aprobaciones en partes posteriores) en **PostgreSQL (Supabase)** vía tu capa SQLModel/DB existente. TinyDB o archivos JSON no son la fuente de verdad de estas entidades.

- **Ticket**: `ticket_id`, `rfp_id`, `status`, `raw_pdf_path`, `created_at`, `updated_at`
- **RFP metadata**: `client_name`, `client_hq` (España/Miami), `services_requested`, `scope`, `deadline`, `budget_range`, `departments_needed`, métricas de legibilidad
- **DepartmentSection**: `department_id`, `key_aspects`, `draft_content`, `evaluation_results`, `approval_status`, `approver`, `approved_at`
- **FinalDocument**: `ticket_id`, `sections`, `currency`, `generated_at`

**Estado del ticket por parte** (mismo ticket en Partes 1–3):

| Estado                 | Parte | Cuándo                                              |
| ---------------------- | ----- | --------------------------------------------------- |
| `analizando`           | 1     | Subida aceptada; pipeline en curso                  |
| `descartado`           | 1     | El clasificador rechazó el documento                |
| `analisis_completo`    | 1     | Synthesizer listo; Ventas puede leer aspectos clave |
| `generando_borrador`   | 2     | Generadores escribiendo secciones                   |
| `en_evaluación`        | 2     | Evaluadores en paralelo / ciclo generador-evaluador |
| `needs_human_review`   | 2     | Límite de iteraciones agotado; último borrador + EvaluationResult pasan a Parte 3 |
| `esperando_aprobación` | 3     | Pausa humana por departamento                       |
| `terminado`            | 3     | Documento final generado                            |

Los workers reciben **metadatos compartidos + extractos relevantes a su departamento**. Si faltan cifras de volumen/alcance, registra preguntas abiertas — **nunca inventes** headcount, agentes o plazas de training que no estén en la RFP.

### 2.4 Layout del monorepo

- **HTTP**: extiende el **backend existente** bajo `services/` — sin un proceso API nuevo.
- **Pipeline / grafo**: `data/pipelines/rfp_intake/` (grafo dedicado; no lo mezcles con el grafo CX). Los routers importan y disparan; no poseen la lógica de agentes.
- **CLIs sueltos**: `scripts/` si hace falta.
- **PDFs subidos**: vía `uis/backoffice`; se guardan bajo `data/raw/` como artefacto runtime de la recepción.

## 3. Métricas de negocio y KPIs

- **Tiempo de armado de propuesta**: hoy consume aproximadamente 1 semana del ciclo de venta total → meta: menos de 2 días desde la carga de la RFP hasta el documento final.
- **Tasa de clasificación correcta** de RFPs vs. documentos que no lo son.
- **Iteraciones promedio por sección** en el ciclo generador-evaluador (ideal: menos de 2).
- **Tiempo de aprobación por departamento** desde que la sección está lista hasta que el responsable decide.

## 4. Instrucciones de datos semilla

Usa los PDF listos en [`rfp-requests/nexova/`](./rfp-requests/nexova/) como **subidas de prueba a través de la UI**. El proceso de recepción guarda cada PDF subido bajo `data/raw/` (no trates los PDF del currículo como inventario pre-sembrado en el repo). Las RFP formales e informales deben **aceptarse y procesarse**; el documento inválido debe **rechazarse**.

1. **`nexova-request-1.pdf` — RFP formal (aceptar):** _Vantex Retail Group_ (Madrid), búsqueda ejecutiva de 5 mandos medios + programa trimestral de liderazgo. Activa `seleccion` y `capacitacion`. Moneda: EUR.
2. **`nexova-request-2.pdf` — RFP informal (aceptar):** correo de _NubeSoft_ (SaaS Miami) pidiendo equipo de soporte 24/7 de 12 agentes. Activa `soporte` (y posiblemente `seleccion`). Moneda: USD.
3. **`nexova-request-3.pdf` — inválido (rechazar):** pitch entrante de proveedor de ATS — no es RFP de cliente. El clasificador debe descartarlo.

## 5. Restricciones de negocio (lineamientos para el evaluador de cumplimiento)

- Toda propuesta debe incluir la garantía de satisfacción estándar de Nexova a 90 días.
- El precio se cotiza en EUR si el cliente tiene sede en España, y en USD si tiene sede en Miami/EE. UU. — se determina a partir del campo `client_hq` en los metadatos de la RFP.
- Ninguna propuesta de búsqueda ejecutiva puede comprometer un tiempo de cierre menor a 15 días hábiles.
- Toda propuesta de soporte outsourced debe mencionar explícitamente el SLA de respuesta de 24 horas.
- Ninguna propuesta puede incluir nombres de clientes actuales como referencia sin anonimizar (usar "cliente del sector retail", no el nombre real).

## 6. Entregables esperados

- **Parte 1:** el ticket identifica correctamente si un documento es una RFP de Nexova, extrae metadatos (incluida la sede del cliente) y reparte el análisis solo entre los departamentos que el servicio solicitado realmente requiere.
- **Parte 2:** cada departamento activo genera su sección y pasa por evaluación de legibilidad, pertinencia y cumplimiento de los lineamientos de la sección 5 (incluida la moneda correcta).
- **Parte 3:** el responsable nombrado de cada departamento activo (§2.1) aprueba su sección de forma independiente, sin bloquear a los demás, y el documento final se genera solo cuando todas las secciones activas están aprobadas. **No** inventes una escalera jerárquica multi-nivel.

## 7. Parte 3 — Triggers de conflicto y árbitro fijo

El arbitraje debe ser un nodo dedicado del grafo disparado por **contradicciones detectables en estado estructurado**, no por agentes negociando entre ellos.

| Id del trigger           | Cuándo dispara                                                                                                             | Árbitro fijo (no un LLM)                                                                | Regla de resolución                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ttc-vs-training-window` | El time-to-close de `seleccion` se solapa o contradice la ventana de entrega de `capacitacion` para la misma cohorte/roles | Marcos Ibáñez (Director de Ventas)                                                      | Secuenciar entregas; forzar `request_changes` para que la formación no empiece antes de un cierre realista (≥15 días hábiles en búsqueda ejecutiva) |
| `support-sla-missing`    | La sección activa de `soporte` omite el SLA obligatorio de respuesta 24h (§5)                                              | Roberto Díaz (`soporte`) rechaza; Marcos si otras secciones contradicen staffing vs SLA | Bloquear aprobación hasta que el SLA 24h sea explícito; revisar headcount si el SLA es inviable                                                     |
| `currency-mismatch`      | Las secciones discrepan en moneda, o la moneda ≠ mapeo de `client_hq` (España→EUR, Miami/US→USD)                           | Marcos Ibáñez                                                                           | Reescribir a la moneda de la sede; rechazar si no se resuelve tras el límite de iteraciones                                                         |

Conecta estos ids de trigger a tu nodo de arbitraje. Los agentes pueden **señalar** un conflicto; no deben **resolverlo** por consenso libre.