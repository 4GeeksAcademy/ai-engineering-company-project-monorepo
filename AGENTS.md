# Instrucciones para agentes — Nexova Solutions · Milestone 4

Estas reglas aplican al trabajo de este repositorio durante el Milestone 4. Si una instrucción entra en conflicto con una decisión humana explícita o con una regla más específica aplicable, detente y aclara el conflicto antes de editar.

## Inicio de sesión obligatorio

Antes de cualquier edición:

1. Lee `CONTEXT.md`, `memory-bank/projectbrief.md`, `memory-bank/techContext.md` y `memory-bank/progress.md`.
2. Busca y lee las reglas aplicables, incluida `.agents/rules/monorepo-structure.md` **si existe**. No supongas que una ruta existe: compruébalo.
3. Lee el `README.md` de cada carpeta que vayas a modificar; si falta, detente y consulta la guía superior pertinente.
4. Comprueba `git status` para identificar cambios ajenos a tu tarea. No los sobrescribas ni los incluyas accidentalmente.

## Estructura del monorepo y límites del hito

- Sigue las guías locales: las interfaces públicas corresponden a `uis/website/`; las herramientas internas, a `uis/backoffice/`; los servicios backend, APIs y workers, a `services/`. Mantén cada cambio en su responsabilidad y documenta cualquier entregable nuevo como indique su README.
- No crees aplicaciones Next.js, APIs, ni estructuras paralelas o duplicadas durante este milestone. No infieras que una app o servicio existe por estar descrito como necesidad.
- Antes de elegir otra carpeta, consulta el README correspondiente y la regla de estructura indicada arriba cuando esté presente.

## Protección y autorización humana

No edites estas áreas sin autorización humana **explícita y previa**; si el cambio parece necesario, explica el motivo y solicita aprobación antes de tocarlo:

- `CONTEXT.md` una vez configurado con el briefing de Nexova.
- `infra/` y `.devcontainer/`.
- Configuración de CI (por ejemplo, `.github/workflows/` u otra ruta de CI, cuando exista).
- Lockfiles existentes, cuando los haya.

La protección aplica también a cambios indirectos o generados por herramientas. No crees archivos de configuración protegidos para eludir esta regla.

## Salvaguardas de negocio y datos

- Usa `CONTEXT.md` como fuente empresarial primaria y verifica nombres, hechos y cifras allí antes de documentarlos o codificarlos. Distingue hechos del briefing, estado comprobado del repositorio y propuestas futuras.
- Mantén separados los **indicadores actuales descritos** —por ejemplo, tiempo medio de resolución de soporte de 48 horas frente al SLA de 24 horas; uso regular de HubSpot por el 40% del equipo; revisión manual de 30–80 CV por proceso— de las **metas futuras**. El 40% de consultas de soporte automatizadas sin intervención humana es una meta, no un resultado actual.
- El briefing declara 120 empleados e ingresos aproximados de USD 8 millones anuales; no conviertas cifras descriptivas en mediciones verificadas independientemente. No inventes métricas, resultados, datos, integraciones, permisos, servicios existentes ni criterios de éxito.
- Trata CVs y datos de candidatos como sensibles. No uses datos personales reales ni supongas permisos, retención o aprobación automatizada que no estén definidos.

## Flujo obligatorio antes de cada commit

Ejecuta estos pasos en orden y registra resultados reales; no declares una validación que no se ejecutó:

1. **Comprobar formato del diff:** ejecuta `git diff --check` (y revisa también los archivos nuevos no rastreados, que ese comando no cubre hasta que estén añadidos).
2. **Verificar rutas y dominio:** confirma que cada cambio está en la carpeta correcta según sus README y contrasta nombres, hechos y datos empresariales con `CONTEXT.md`; elimina supuestos no respaldados.
3. **Actualizar el progreso:** si cambió el estado, alcance, entregables, decisiones o validaciones, actualiza `memory-bank/progress.md` con lo comprobado. Si el alcance sigue sin definición oficial, no lo inventes.
4. **Ejecutar validaciones disponibles:** consulta las instrucciones y configuración realmente presentes en las carpetas afectadas y ejecuta las pruebas, lint o checks pertinentes que existan. Si no hay validación aplicable, indica que no está disponible; no fabriques comandos ni resultados.
5. **Revisar el conjunto final:** inspecciona `git diff` y `git status --short`, incluidos archivos nuevos, para confirmar que solo están los cambios previstos y que no hay secretos ni datos personales.
6. **Confirmar protecciones y preparar commit:** verifica que no se modificó ninguna ruta protegida sin autorización y resume cambios, validaciones y limitaciones. Solo entonces prepara el commit; no lo realices en nombre del usuario salvo petición explícita.
