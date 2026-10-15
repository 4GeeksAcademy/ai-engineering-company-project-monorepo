# Hito — Mejora del Pipeline: Subflows y Tests (Parte 3 de 3)

**Antes de empezar:** Asegúrate de haber completado la **Parte 2 de este Hito** — este proyecto se construye directamente sobre `data/pipelines/pipeline.py` implementado en la sesión anterior. Mantén abierto tu `CONTEXT-empresa.md` — nombres de KPIs, esquema y audiencia de stakeholders vienen de ahí.

---

## 🎯 Tu reto

> 📌 Estás construyendo sobre **tu propia copia del monorepo** de la compañía seleccionada al inicio del curso — no en un repositorio nuevo.

Esta es la **Parte 3 de este Hito — Telemetría y Data Pipelines**. Tu pipeline de desempeño de negocio ya funciona: lee de `telemetry_events` y produce los KPIs que pidió el liderazgo — los nombrados en tu `CONTEXT-company.md` — sin tocar el sistema técnico de telemetría existente. Hoy lo llevas a nivel de producción: refactorizas el flow principal en subflows reutilizables, agregas tests unitarios que validan el comportamiento de las tasks de transformación, aseguras que el pipeline corra directamente desde la línea de comandos, y — la parte que realmente le importa al liderazgo — pones esos KPIs frente a un dashboard que alguien pueda leer.

---

### Ticket de Mejora — Pipeline a Producción

El pipeline básico está listo. Antes de la entrega final al equipo de operaciones, necesito cuatro cosas más:

1. **El flow principal está creciendo** — refactorízalo en subflows para que cada fase sea independiente, testeable, y reutilizable.
2. **Necesito tests unitarios para las tasks de transformación.** Si un test falla, quiero saberlo antes de que el pipeline llegue a producción, no después.
3. **Tras el refactor a subflows, el pipeline debe seguir pudiendo correrse como script:** `python data/pipelines/pipeline.py` completa sin errores (conserva el entrypoint de la Parte 2).
4. **Necesito un dashboard.** Nadie en el equipo de liderazgo va a consultar un endpoint — pon los KPIs en algún lugar donde realmente puedan mirarlos.

**Punto de partida:** `data/pipelines/pipeline.py` de la sesión anterior.

---

### Por qué subflows

Las Partes 1-2 pedían **un flow principal** con al menos tres tasks. **Esta parte sube ese listón:** divides esas etapas en **al menos tres subflows** (`@flow`) coordinados por el flow principal — esa topología es nueva en la Parte 3 y es lo que evaluamos aquí.

Un flow que crece sin estructura acaba siendo tan difícil de mantener como el script que reemplazó. Los subflows aplican el principio DRY a nivel de orquestación: cada fase del pipeline (extracción, transformación, carga) se convierte en un flow independiente que se puede ejecutar, monitorear y reutilizar por separado. El flow principal los coordina pero no contiene su lógica.

---

## 🌱 Cómo Empezar

1. Corre `git pull` en tu copia del monorepo.
2. Abre `data/pipelines/pipeline.py` — ese es tu punto de partida.
3. Ten a mano tu `CONTEXT-company.md`: los nombres de subflows, tasks, y tests deben reflejar los nombres de KPI de su sección "KPIs a medir" y el esquema que implementaste — no etiquetas genéricas.
4. Mantén la estructura de carpetas existente: `data/pipelines/` para flows y subflows, `data/process/` para lógica de transformación, `data/raw/` para datos de entrada, `data/eval/` para salidas de validación.
5. Los tests unitarios van en `tests/pipelines/` en la raíz del monorepo.
6. La página del dashboard va en `uis/backoffice/`, consumiendo el endpoint de **consulta de KPIs** de `services/reporting/` que construiste en la Parte 2.
7. Asegúrate de que Prefect 3 esté instalado desde la Parte 2: `uv add "prefect>=3"`.

---

## 💻 Qué Necesitas Hacer

### Fase 1 — Refactorización en subflows
- [x] Divide el flow principal en al menos tres subflows (`@flow`) que correspondan a las etapas de tu diseño: uno para extracción (desde `telemetry_events` y cualquier otra tabla de dominio), uno para transformación, y uno para carga (en la tabla de destino nombrada en tu `CONTEXT-company.md`). El flow principal los invoca en secuencia.
- [x] Cada subflow debe tener inputs y outputs explícitos — no dependas de variables globales entre subflows.
- [x] Si tienes pasos opcionales (notificaciones, exportaciones secundarias), extráelos también como subflows e invócalos con `return_state=True` desde el flow principal.

### Fase 2 — Tests unitarios
- [x] Crea el archivo `tests/pipelines/test_pipeline.py` con tests unitarios para al menos tres tasks de transformación — las que calculan los KPIs de tu `CONTEXT-company.md`.
- [x] Cada test debe verificar el comportamiento de la task de forma aislada: no debe depender de una base de datos ni de APIs externas. Usa datos de prueba en memoria con la forma de tus eventos de telemetría (según tu `CONTEXT-company.md`).
- [x] Incluye al menos un test que verifique el comportamiento defensivo de una task ante un input inválido o malformado (por ejemplo, un campo nulo donde no se espera ninguno, o un tipo incorrecto).
- [x] Incluye al menos un test que confirme que el valor calculado de un KPI coincide con la definición de tu `CONTEXT-company.md` para un input conocido, calculado a mano.
- [x] Los tests deben pasar con `python -m pytest tests/pipelines/test_pipeline.py` sin errores.

### Fase 3 — El CLI sigue funcionando tras el refactor
- [x] Tras dividir en subflows, `python data/pipelines/pipeline.py` sigue corriendo el ETL completo sin errores (el entrypoint `__main__` y la documentación del comando de la Parte 2 deben seguir válidos — no los reconstruyas desde cero).

### Fase 4 — Dashboard de negocio (obligatorio)

Tu pipeline produce KPIs — pero una tabla que nadie mira no es un entregable. Esta fase no es opcional: el liderazgo necesita *ver* los números de verdad, no consultar un endpoint con curl.

- [x] Construye una página en `uis/backoffice/` (ej. `/reporting`) que consuma tu endpoint de `services/reporting/` y muestre cada KPI de la sección "KPIs a medir" de tu `CONTEXT-company.md` — un gráfico o una tabla por KPI es suficiente.
- [x] Etiqueta cada KPI claramente con el mismo nombre que tiene en tu `CONTEXT-company.md`, y muestra el período (semana o mes, según tu frecuencia) que cubren los datos.
- [x] Este dashboard es de cara al negocio, no una herramienta de desarrollador: debe ser legible para el stakeholder nombrado en tu `CONTEXT-company.md` (ej. el CEO o el gerente de departamento) sin que nada necesite traducción ni explicación.
- [x] No necesitas pulirlo visualmente — el objetivo es una vista funcional y correctamente etiquetada de datos reales desde la tabla de destino de tu CONTEXT.

> ⚠️ **IMPORTANTE:** Los nombres de subflows, tasks, y tests deben seguir el mismo vocabulario de dominio definido en `data/pipelines/PIPELINE_DESIGN.md` y tu `CONTEXT-company.md`. Un subflow llamado `extract_data` no es aceptable si tu compañía tiene entidades concretas y nombres de KPI — nómbralo según la métrica de negocio real que produce este pipeline.

---

### 🔵 Actividad adicional — Mejoras adicionales de tus preguntas de diseño

- [ ] Vuelve a la sección "Preguntas para Ayudarte a Diseñar el Pipeline" de la Parte 1. Si, al responderlas, identificaste mejoras de resiliencia u observabilidad más allá de lo que ya cubren las Fases 1–3 (por ejemplo, un heartbeat más alerta de silencio, un lock de concurrencia para corridas que se solapan, o un patrón `Idempotency-Key` para reintentos) y todavía no las implementaste, este es el lugar para hacerlo.
- [ ] Por cada mejora que agregues, anota en `data/pipelines/PIPELINE_DESIGN.md` qué pregunta responde y por qué la priorizaste.
- [ ] Esto es opcional — solo tómalo si tu propio documento de diseño realmente señaló algo que valía la pena construir. No inventes una mejora solo para marcar una casilla.

---

## ✅ Qué Vamos a Evaluar

- [x] El flow principal en `data/pipelines/pipeline.py` invoca al menos tres subflows (`@flow`) en lugar de contener toda la lógica directamente.
- [x] Cada subflow tiene inputs y outputs explícitos y puede ejecutarse de forma independiente.
- [x] El archivo `tests/pipelines/test_pipeline.py` existe y contiene al menos tres tests unitarios para tasks de transformación.
- [x] Los tests unitarios corren en aislamiento: fixtures in-memory con forma de telemetría del CONTEXT — sin base de datos en vivo ni APIs externas.
- [x] Al menos un test verifica el comportamiento defensivo de una task ante un input inválido.
- [x] Al menos un test valida el valor calculado de un KPI contra su definición en `CONTEXT-company.md`.
- [x] `python -m pytest tests/pipelines/test_pipeline.py` pasa sin errores.
- [x] Tras el refactor a subflows, `python data/pipelines/pipeline.py` sigue corriendo el flujo ETL completo sin errores (entrypoint CLI de la Parte 2 preservado).
- [x] Los nombres de subflows, tasks, y tests reflejan el vocabulario de dominio y los nombres de KPI de `CONTEXT-company.md`.
- [x] `telemetry_events` y `services/telemetry/analysis.py` permanecen sin modificar durante toda la refactorización.
- [x] Existe un dashboard en `uis/backoffice/` que muestra cada KPI de la sección "KPIs a medir" de `CONTEXT-company.md`, correctamente etiquetado, alimentado desde tu endpoint `services/reporting/`.
- [x] El dashboard es legible para un stakeholder de negocio no técnico, no solo para otro ingeniero.

---

## 📦 Cómo Entregar

1. Asegúrate de que `data/pipelines/pipeline.py`, `tests/pipelines/test_pipeline.py`, y la página del dashboard en `uis/backoffice/` estén commiteados en tu copia del monorepo.
2. Haz commit con el mensaje: `feat: refactor business performance pipeline into subflows, add unit tests, and add reporting dashboard`.
3. Abre un Pull Request con estos cambios — puede construirse sobre el PR de la Parte 2 o ser uno nuevo. En la descripción del PR, menciona si implementaste alguna mejora adicional de las preguntas de diseño, y cuál. Comparte la URL con tu tech lead.





