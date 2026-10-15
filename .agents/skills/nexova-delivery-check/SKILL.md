---
name: nexova-delivery-check
description: Verifica que una entrega del monorepo Nexova respete el contexto empresarial, las rutas oficiales y los criterios de calidad antes de aprobarla.
---

# nexova-delivery-check

## Objetivo

Verificar que una entrega del monorepo sea consistente con el contexto empresarial de Nexova, las rutas oficiales y los criterios de calidad antes de aprobarla.

## Cuándo utilizarla

Úsala al revisar una entrega o un diff de Milestone 4 antes de dar aprobación; no implementa ni modifica la entrega.

## Entradas obligatorias

- `CONTEXT.md`
- `memory-bank/projectbrief.md`
- `memory-bank/techContext.md`
- `memory-bank/progress.md`
- `AGENTS.md`
- Reglas aplicables, incluida `.agents/rules/monorepo-structure.md` cuando exista
- Lista exacta de archivos de la entrega y su diff respecto al baseline

Si falta una entrada o no se puede identificar el baseline/diff completo, indícalo como bloqueo y no supongas contenido ni declares aprobada la entrega. Para preparar el inventario, consulta `git status --short` y revisa los diffs staged y unstaged. `git diff` no incluye archivos no rastreados: inspecciona su contenido completo y compáralo con la lista de entrega; no los trates como “sin cambios”. No añadas ni prepares archivos para poder revisarlos.

## Procedimiento

1. Lee todas las entradas obligatorias. Extrae hechos, metas y alcance documentados; registra las discrepancias de fuente sin resolverlas por inferencia.
2. Para cada archivo enumerado, verifica el cambio contra el diff completo (incluye staged, unstaged y contenido íntegro de no rastreados). Si un archivo no presenta cambio, anótalo como “sin cambio observado”, no como una entrega revisada.
3. Comprueba afirmaciones de negocio contra `CONTEXT.md`. Para cada cifra o resultado, clasifícalo como **actual descrito**, **meta futura**, **dato no especificado** o **contradictorio** y cita la sección/fuente; no inventes KPI ni resuelvas contradicciones sin confirmación.
4. Comprueba la ruta de cada archivo cambiado contra el README más cercano y las reglas aplicables. Aplica las ubicaciones documentadas: interfaces en `uis/website/` o `uis/backoffice/`, backend en `services/`, datos en `data/`, agentes en `agents/` y skills del hito en `.agents/skills/`. Marca como hallazgo toda ruta sin guía comprobable o incompatible; comprueba también que no se crea una aplicación nueva durante Milestone 4.
5. Compara los archivos cambiados con las áreas protegidas de `AGENTS.md`. Una ruta protegida modificada sin autorización humana explícita y previa es un bloqueo; si no hay cambio observado, registra esa evidencia.
6. Ejecuta únicamente verificaciones aplicables cuya configuración/comando exista en el repositorio. Registra comando exacto y resultado observado; clasifica cada verificación como **ejecutada: pasa**, **ejecutada: falla**, **no disponible** o **no ejecutada**. No conviertas la ausencia de tests en un pase de tests.
7. Emite el informe. Decide `APROBADO` solo si el diff está completo, todos los criterios se satisfacen y no hay bloqueos; usa `PENDIENTE` si hay defectos o bloqueos y `NO VERIFICADO` para requisitos sobre los que falta evidencia. Una condición crítica no verificada impide aprobar.

## Salidas

Entrega una tabla con estas columnas: **Requisito | Evidencia (archivo, ruta, diff, comando o resultado) | Estado | Acción necesaria**. Usa únicamente **APROBADO**, **PENDIENTE** o **NO VERIFICADO** en Estado. Incluye además:

- La lista de archivos efectivamente revisados y de los archivos sin cambio observado.
- Errores y advertencias, incluidos validadores no disponibles o no ejecutados.
- Decisión final: **APROBADO**, **PENDIENTE** o **NO VERIFICADO**, con la razón concreta.

## Criterios de aceptación

- [ ] Están presentes las seis fuentes documentales y reglas aplicables; cada ausencia está nombrada como bloqueo.
- [ ] Para todos los archivos de la lista hay diff completo o se registra explícitamente “sin cambio observado”; los no rastreados se inspeccionaron sin añadirlos al índice.
- [ ] Cada afirmación material de negocio tiene referencia a `CONTEXT.md` y está clasificada como actual descrita, meta futura, no especificada o contradictoria.
- [ ] Cada archivo cambiado tiene una ruta comparada con el README/regla pertinente; toda falta de guía o incompatibilidad aparece en el informe.
- [ ] No se modificó una ruta protegida sin autorización humana explícita y previa; el resultado se apoya en el inventario/diff.
- [ ] Cada validación aplicable consta con comando y una de las cuatro clasificaciones de resultado; lo no ejecutado no se presenta como aprobado.
- [ ] El informe incluye las cuatro columnas requeridas, archivos revisados/sin cambio, errores, advertencias, acción y decisión sustentada.
- [ ] La decisión es `APROBADO` únicamente si el diff está completo y no hay criterios pendientes ni no verificados que bloqueen la revisión.

## Referencias de negocio para revisar

- Soporte: **48 horas** es el tiempo medio de resolución descrito como actual; el **SLA comprometido es 24 horas**. No presentar el SLA como resultado logrado.
- Selección: se revisan manualmente **30–80 CV por proceso**, según el briefing; no generalizarlo a un promedio distinto.
- Soporte futuro: automatizar el **40% de las consultas sin intervención humana mediante RAG** es un objetivo, no un KPI alcanzado.

Si un artefacto de revisión (por ejemplo, un skill nuevo) contiene estos ejemplos, comprueba que conserva su clasificación y magnitud frente a `CONTEXT.md`; no exijas que todos los archivos de la entrega repitan estas cifras cuando no sean pertinentes.

## Límites

No inventes KPI ni resultados. No cambies `CONTEXT.md`. No modifiques archivos de la entrega durante la revisión. No añadas archivos al índice ni realices commits automáticamente.
