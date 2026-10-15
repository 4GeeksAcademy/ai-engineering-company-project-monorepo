# AGENTS Guide

## Archivos obligatorios a leer al iniciar cada sesion
El agente debe cargar estos archivos antes de proponer cambios:
1. `memory-bank/projectbrief.md`
2. `memory-bank/techContext.md`
3. `memory-bank/progress.md`
4. `CONTEXT.md` y los contextos historicos relevantes de `memory-bank/history/`.

## Regla permanente de contexto y progreso
- Aplica a todos los hitos y tareas, aunque no se solicite un commit.
- Antes de implementar nuevas funciones, contrastar el contexto activo con el progreso y los antecedentes historicos para no duplicar trabajo ni inventar requisitos.
- Al cerrar cada hito, guardar una copia integra del `CONTEXT.md` utilizado en `memory-bank/history/HITOxx-CONTEXT.md` (o un nombre descriptivo si no hay numero). Verificar que coincide con el original; no vaciar ni modificar el contexto de raiz.
- Aunque el desarrollador indique que el contexto esta actualizado, archivar siempre la copia integra de la version efectivamente usada y actualizar `memory-bank/progress.md` al cerrar cada tarea; no omitirlo por considerarlo ya vigente.
- No sobrescribir un contexto historico distinto o anterior. Si el hito ya esta archivado, comprobar su coincidencia y conservarlo; ante una revision diferente, crear un archivo de version con nombre identificable.
- Actualizar siempre `memory-bank/progress.md` al finalizar la tarea con lo implementado, estado actual, comandos/resultados de validacion, bloqueos y siguientes pasos. No declarar verificadas pruebas no ejecutadas o bloqueadas.
- El desarrollador autoriza permanentemente actualizar `memory-bank/progress.md` y crear los archivos de `memory-bank/history/` necesarios para este protocolo. El resto de las rutas protegidas sigue requiriendo confirmacion explicita.

## Flujo obligatorio antes de cada commit
1. Revisar cambios locales con `git status` y `git diff --stat` + `git diff`.
2. Ejecutar validaciones tecnicas de los proyectos modificados (por ejemplo: `npm run typecheck`, `npm run build`, `npm test` donde exista).
3. Validar reglas de `.agents/rules/` con checklist:
   - Naming y estructura segun regla activa.
   - Separacion de layouts entre website/backoffice.
   - Contenido alineado al contexto de TrackFlow.
4. Actualizar `memory-bank/progress.md` con lo completado, estado actual y bloqueos.
5. Confirmar que no se tocaron rutas protegidas sin permiso.
6. Anadir archivos (`git add ...`) y crear commit descriptivo.

## Rutas protegidas: no modificar sin confirmacion explicita del desarrollador
- `.agents/`
- `memory-bank/`, excepto progreso y nuevos archivos historicos autorizados por el protocolo permanente anterior.
- `.env`
- `.env.*`
- `node_modules/`
- Cualquier secreto o credencial en archivos de configuracion (`*.pem`, `*.key`, `*.p12`, `*.crt`)
- Configuraciones sensibles de infraestructura (`infra/`), salvo indicacion explicita.

## Notas de operacion
- Evitar cambios no solicitados en archivos fuera del alcance del ticket.
- Si una regla entra en conflicto con el requerimiento del desarrollador, priorizar el requerimiento explicito y dejar registro en `memory-bank/progress.md`.
