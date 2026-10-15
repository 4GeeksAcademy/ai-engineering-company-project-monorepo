# Hito — Pipeline de Desempeño de Negocio Resiliente (Parte 2 de 3)

**Antes de empezar:** Mantén abierto tu `CONTEXT-company.md` mientras programas — es la fuente de verdad para nombres de KPIs, esquema de la tabla de destino y el contrato del endpoint que implementas. Ten también a mano tu `data/pipelines/PIPELINE_DESIGN.md` aprobado de la Parte 1.

---

## 🎯 Tu reto

> 📌 **Estás construyendo sobre tu propia copia del monorepo de la compañía seleccionada al inicio del curso — no en un repositorio nuevo.**

El documento de diseño está aprobado. Ahora toca construirlo — un pipeline que lee de `telemetry_events` y produce los KPIs de negocio que acotaste en la Parte 1, exactamente como se nombran en tu `CONTEXT-company.md`. Tu sistema técnico de telemetría existente (`telemetry_events`, `services/telemetry/analysis.py`, `GET /telemetry/report`) no es parte de este trabajo — se queda intacto, sirviendo a ingeniería.

Hay una diferencia fundamental entre un script que funciona en tu máquina y un pipeline que puede correr desatendido en producción: la resiliencia.

> [!NOTE]
> ### Ticket de Implementación — Pipeline de Desempeño de Negocio Resiliente
> El diseño está aprobado. El liderazgo quiere ver este pipeline corriendo, no solo documentado. Requisitos no negociables antes de entregarlo a producción:
> - El pipeline debe tolerar fallos parciales sin interrumpir toda la ejecución.
> - Las tasks que tocan servicios externos deben tener reintentos configurados.
> - El pipeline debe poder correrse como script desde la línea de comandos.
> - Si una task ya corrió exitosamente en la última hora, no debe repetirse innecesariamente.
> 
> **Punto de partida:** tu `data/pipelines/PIPELINE_DESIGN.md` del día anterior. Implementa lo que diseñaste — leyendo de telemetría, escribiendo en la nueva tabla de reporting de negocio que acotaste, sin que nada del reporte técnico existente cambie.

---

## 🔗 ¿Qué hace resiliente a un pipeline?

Un pipeline resiliente no es uno que nunca falla — es uno que falla bien. En Prefect, eso significa tres cosas concretas:

- **Tolerancia a fallos parciales:** una task que falla no tumba todo el flow. Prefect distingue entre tasks críticas (cuyo fallo debe detener todo) y tasks opcionales (cuyo fallo debe registrarse y permitir que el flow continúe).
- **Reintentos inteligentes:** las tasks que interactúan con servicios externos (bases de datos, APIs) se configuran con `retries` y `retry_delay_seconds` para absorber fallos transitorios sin intervención humana.
- **Caché de resultados:** si una task ya produjo un resultado válido recientemente, Prefect puede reutilizarlo en lugar de repetir el cómputo. Esto es especialmente útil para transformaciones costosas.

---

## 🌱 Cómo Empezar

1. Corre `git pull` en tu copia del monorepo para asegurarte de tener el estado más reciente.
2. Abre tu `data/pipelines/PIPELINE_DESIGN.md` — ese documento es tu especificación. Implementa lo que diseñaste.
3. Mantén abierto tu `CONTEXT-company.md` del contexto de data pipelines mientras programas: es la fuente de verdad para los nombres exactos de los KPIs (su sección "KPIs a medir"), el esquema de la tabla de destino, y el contrato del endpoint que estás implementando. (Los campos de evento de los que estás extrayendo son los que tu `CONTEXT-company.md` de telemetría ya definió como obligatorios.)
4. Escribe el código de tu pipeline en `data/pipelines/`. El punto de entrada principal debe llamarse `data/pipelines/pipeline.py`. Usa `data/raw/` para datos de entrada y archivos intermedios, `data/process/` para scripts de transformación reutilizables, y `data/eval/` para salidas de validación del pipeline.
5. La task de extracción lee de `telemetry_events` (y cualquier otra tabla de dominio que necesites) — en modo solo lectura. La task de carga escribe en la **tabla de destino nombrada en tu `CONTEXT-company.md`** (bajo el esquema `reporting`) que diseñaste en la Parte 1. No escribas de vuelta en `telemetry_events` ni modifiques `services/telemetry/analysis.py`.
6. Cualquier endpoint que exponga o dispare el pipeline (por ejemplo, para consultar el estado de la última corrida o lanzar una corrida manual) debe implementarse en `services/reporting/`, un módulo separado de `services/telemetry/`, importando funciones y flows desde `data/pipelines/` según se necesite.
7. Instala Prefect 3 en tu entorno: `uv add "prefect>=3"`.

---

## 💻 Qué Necesitas Hacer

### Fase 1 — Flows y tasks
- [ ] Implementa el pipeline como uno o más **flows** de Prefect (`@flow`) siguiendo la estructura de etapas de tu diseño: extracción, transformación, y carga como mínimo.
- [ ] Cada etapa debe ser una **task** (`@task`) independiente con inputs y outputs explícitos.
- [ ] Incluye al menos un paso **opcional / no crítico** (por ejemplo, una notificación, exportación secundaria o snapshot de eval) e invócalo con `return_state=True` para que un fallo en ese paso no interrumpa la ejecución principal extract $\rightarrow$ transform $\rightarrow$ load.

### Fase 2 — Resiliencia
- [ ] Agrega `retries` y `retry_delay_seconds` a cada task que interactúe con servicios externos (base de datos, APIs). Justifica el número de reintentos elegido en un comentario.
- [ ] Maneja al menos un fallo de task explícitamente en el flow usando `return_state=True` en lugar de dejar que se propague automáticamente.
- [ ] Agrega caché (`cache_key_fn`, `cache_expiration`) a al menos una task de transformación costosa. Explica en un comentario qué define la clave de caché y cuánto tiempo es válida.

### Fase 3 — Idempotencia
- [ ] La fase de carga debe ser idempotente: si el pipeline corre dos veces sobre el mismo rango de datos, el resultado en la tabla de destino de tu CONTEXT debe ser idéntico después de ambas corridas. Implementa la estrategia que documentaste en tu diseño (upsert, tabla de control, timestamp, u otra) — el constraint único del esquema de tu `CONTEXT-company.md` es en el que debe apoyarse tu upsert.
- [ ] Registra en la base de datos o en un archivo de log la metadata mínima de ejecución de cada corrida: hora de inicio, hora de fin, registros procesados, estado final, y cualquier error capturado.

### Fase 4 — Ejecución basada en script
- [ ] Asegúrate de que `data/pipelines/pipeline.py` pueda ejecutarse directamente como script de CLI (por ejemplo, con un bloque `if __name__ == "__main__":` que invoque el flow principal).
- [ ] Verifica que el pipeline completo corre sin errores: `python data/pipelines/pipeline.py`.
- [ ] Documenta la frecuencia prevista para el ciclo de reporting de tu compañía en `data/pipelines/PIPELINE_DESIGN.md` y el comando de ejecución en un comentario o en el mismo documento de diseño.

### Fase 5 — Endpoints del backend
- [ ] En `services/reporting/`, implementa **tres endpoints** relacionados con este pipeline: (1) consultar el estado y metadata de la última corrida, (2) disparar una corrida manual del flow, (3) **consultar las filas de KPIs** de la tabla de destino del CONTEXT — esto es lo que consumirá el dashboard de la Parte 3. Mantenlos en su propio módulo, separado de `services/telemetry/`.
- [ ] Los endpoints deben importar flows o funciones desde `data/pipelines/` — no dupliques la lógica del pipeline en `services/`.
- [ ] Los endpoints siguen las mismas convenciones de autenticación y estructura de respuesta que el resto de tu API, y la forma de la respuesta del endpoint de consulta de KPIs coincide con el contrato de tu `CONTEXT-company.md`.

> [!WARNING]
> **IMPORTANTE:** Los nombres de flows, tasks, tablas, y campos deben coincidir con lo definido en `data/pipelines/PIPELINE_DESIGN.md` y tu `CONTEXT-company.md` del contexto de data pipelines (KPIs y esquema) — consistentes, a su vez, con los campos de evento ya definidos en tu `CONTEXT-company.md` de telemetría. Una implementación genérica que ignore el modelo de datos de tu compañía no será aceptada.

---

## ✅ Qué Vamos a Evaluar

- [ ] El archivo `data/pipelines/pipeline.py` existe y define al menos un flow con tres o más tasks.
- [ ] Al menos una task tiene `retries` configurado con un valor mayor a cero y un comentario que justifica el número elegido.
- [ ] Al menos una task opcional se invoca con `return_state=True` y el flow continúa ejecutándose cuando esa task falla.
- [ ] Al menos una task de transformación tiene caché configurado con `cache_key_fn` y `cache_expiration`.
- [ ] La fase de carga es idempotente: correr el pipeline dos veces sobre los mismos datos no produce duplicados en la tabla de destino del CONTEXT.
- [ ] Cada corrida del pipeline registra al menos cinco campos de metadata (hora de inicio, hora de fin, registros procesados, estado, errores) en la base de datos o en un archivo de log estructurado.
- [ ] `python data/pipelines/pipeline.py` corre el flujo ETL completo sin errores.
- [ ] El comando de ejecución está documentado en `data/pipelines/PIPELINE_DESIGN.md` o en comentarios inline.
- [ ] El pipeline escribe en la tabla de destino definida en la sección Destination table de tu `CONTEXT-company.md` — `telemetry_events` y `services/telemetry/analysis.py` quedan intactos.
- [ ] Existe al menos un endpoint en `services/reporting/` que devuelve la metadata de la última corrida del pipeline (estado, hora de inicio, hora de fin, registros procesados).
- [ ] Existe al menos un endpoint en `services/reporting/` que dispara una corrida manual del flow, importando la función desde `data/pipelines/` sin duplicar la lógica.
- [ ] Existe al menos un endpoint en `services/reporting/` que devuelve las filas de KPIs de la tabla de destino del CONTEXT (el contrato que consumirá el dashboard de la Parte 3).
- [ ] Los valores de los KPIs producidos coinciden con las definiciones de la sección "KPIs a medir" de tu `CONTEXT-company.md` — no con una reinterpretación de ellos.
- [ ] El diseño implementado es consistente con `data/pipelines/PIPELINE_DESIGN.md` — las etapas, entidades, y estrategias de resiliencia descritas ahí se reflejan en el código.

---

## 📦 Cómo Entregar

1. Asegúrate de que `data/pipelines/pipeline.py`, los endpoints en `services/reporting/`, y cualquier archivo de soporte estén commiteados en tu copia del monorepo.
2. Haz commit con el mensaje: `feat: implement resilient business performance pipeline`.
3. Sube tus cambios a tu repositorio de GitHub y comparte la URL con tu tech lead.





