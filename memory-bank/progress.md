# Registro de progreso — Milestone 4 de Nexova Solutions

> Registro vivo del trabajo verificable en este repositorio. Actualizarlo cuando cambie el alcance, se añadan entregables o se ejecuten validaciones. Distingue archivos presentes en el árbol de trabajo de cambios confirmados en Git; no registra como realizadas implementaciones, pruebas o despliegues sin evidencia.

## Estado actual

- **Fecha de esta actualización:** 2026-10-15.
- **Hito:** Milestone 4, según el encargo actual. El README de la plantilla enumera hitos de forma general, pero en los archivos inspeccionados no se encontró una definición del alcance, criterios de aceptación ni calendario específico para este Milestone 4.
- **Rama observada:** `feature/agent-memory-bank`.
- **Estado Git observado antes de crear este archivo:** `HEAD` en `b0587bc` (`Merge branch '4GeeksAcademy:main' into main`), igual a `origin/main` y `main`; `memory-bank/` aparecía como no rastreado (`?? memory-bank/`).
- **Alcance técnico observado:** el repositorio sigue siendo la plantilla/documentación descrita por su README. `uis/` y `services/` contienen READMEs en el árbol versionado; no se verificó una aplicación Nexova, una API, una integración o un despliegue funcional. No se ejecutaron pruebas de producto.
- **Confianza del registro:** los datos de Git indicados arriba corresponden a la consulta hecha antes de crear `progress.md`; no describen el estado Git posterior a esta edición. Volver a consultarlo antes de informar el estado actual.

## Entregables presentes en el árbol de trabajo

| Entregable                    | Estado comprobado                                                            | Observación                                                                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `memory-bank/projectbrief.md` | Presente, sin confirmar en Git en la observación previa                      | Resume el contexto empresarial de `CONTEXT.md`, objetivos y necesidades. Mantiene explícita la discrepancia entre Megan Clarke y Marcos Ibáñez para Ventas y distingue objetivos de funcionalidades existentes. |
| `memory-bank/techContext.md`  | Presente, sin confirmar en Git en la observación previa                      | Resume convenciones del monorepo y distingue sistemas empresariales descritos de código o integraciones efectivamente presentes.                                                                                |
| `memory-bank/progress.md`     | Creado en esta actualización; aún no se ha consultado Git después de crearlo | Este documento es un registro vivo, no evidencia de que el alcance funcional del Milestone 4 esté implementado.                                                                                                 |

“Presente” describe el árbol de trabajo. No asumir que estos documentos están committeados, publicados o revisados hasta comprobarlo mediante Git.

## Trabajo completado

- Se analizó el contexto empresarial de Nexova y la documentación del monorepo en tareas anteriores.
- Se redactaron `projectbrief.md` y `techContext.md` como documentos de contexto, sin afirmar que los módulos futuros descritos estén construidos.
- Se consultaron rama, estado y log de Git antes de crear este registro. En esa consulta, el árbol tenía la carpeta `memory-bank/` sin rastrear y no se encontró en el log un commit que mencionara `Milestone 4`, `memory-bank`, `projectbrief` o `techContext`.
- Se creó este registro con una separación explícita entre hechos observados, propuestas futuras y comprobaciones pendientes.

## Próximos pasos

1. Confirmar el alcance exacto, entregables y criterios de aceptación de Milestone 4 con la definición oficial del hito o con el usuario; no inferirlo del nombre del milestone ni del briefing general.
2. Alinear los entregables propuestos con el reto elegido en `company-choice.md` (pipeline de selección asistido por IA) solo después de validar que forma parte del alcance del hito.
3. Resolver las decisiones funcionales y de datos necesarias antes de cualquier implementación: fuentes y formatos de CV y vacantes, evaluación y explicación del ranking, revisión humana, privacidad, acceso, retención y criterios de calidad. El briefing no las especifica.
4. Implementar únicamente los entregables aprobados en sus ubicaciones pertinentes y documentar cada incorporación de acuerdo con las guías del repositorio.
5. Ejecutar y registrar las validaciones que correspondan cuando haya código o datos evaluables; indicar comandos, resultado y limitaciones. No registrar pruebas o despliegues no realizados.
6. Actualizar este archivo en cada avance verificable y revisar el estado Git cuando se informe qué está versionado.

## Riesgos y bloqueos

- **Alcance no confirmado:** la documentación inspeccionada no define el Milestone 4 ni sus criterios de aceptación. Es el principal bloqueo para decidir qué construir.
- **Datos y evaluación no definidos:** no se documentan formatos, disponibilidad, permisos, calidad ni criterios de evaluación para CVs, vacantes y rankings.
- **Riesgo de uso de datos personales:** privacidad, retención, control de acceso, cumplimiento y revisión humana deben aclararse antes de usar CVs o datos de candidatos.
- **Contexto de Ventas inconsistente:** el briefing nombra a Megan Clarke y a Marcos Ibáñez en secciones distintas; pendiente de confirmación, aunque no bloquea por sí solo el pipeline de selección.
- **Estado Git susceptible de cambio:** los documentos de memoria aparecían como no rastreados antes de esta edición; verificar de nuevo para distinguir modificaciones locales y commits.

## Decisiones pendientes

- Alcance, criterios de aceptación, entregables y calendario de Milestone 4.
- Si el hito requiere un artefacto de agente, pipeline de datos, evaluación, interfaz u otra combinación; no se da por decidido.
- Fuentes permitidas y formato de entradas para candidatos y vacantes; método de scoring, explicaciones, umbrales y tratamiento de datos faltantes.
- Qué aprobación humana debe preceder a cualquier comunicación o avance de candidatos.
- Requisitos de privacidad, autorización, seguridad y retención aplicables.

## Historial de actualizaciones

| Fecha      | Actualización                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-15 | Se registraron las observaciones iniciales de Git (rama `feature/agent-memory-bank`, `HEAD` `b0587bc`, carpeta `memory-bank/` no rastreada), los documentos de contexto presentes y la ausencia de alcance específico documentado para Milestone 4. Se creó este registro; no se ejecutaron pruebas de producto ni se implementaron aplicaciones o servicios. |
