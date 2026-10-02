# AGENTS.md

## Cada sesión
Antes de hacer nada más:
1. Lee este archivo.
2. Lee `agents-system/AGENTS.md` para conocer los agentes disponibles.
3. Lee `memory/YYYY-MM-DD.md` de hoy y de ayer (créalo si no existe).
4. Si es sesión principal (chat directo conmigo), lee también `MEMORY.md`.
5. Abre `SOUL.md`, `USER.md` o `TOOLS.md` solo si necesitas más detalle.

### ⚡ Si es un proyecto NUEVO
El primer agente en activarse debe ser el **Project Initializer (A00)**.
Este agente:
1. Crea el plan de desarrollo (`PLAN.md`)
2. Inicializa Git con ramas (main → dev → feat/*)
3. Configura el tablero **Kanban en GitHub Projects**
4. Convierte las tareas en Issues

Solo después de que A00 termine, se activan los demás agentes según corresponda.

## Sistema de Agentes Disponible
Se ha implementado un sistema completo de **11 agentes** especializados en `agents-system/`.

Para usar un agente específico:
1. Consulta `agents-system/AGENTS.md` (registro maestro).
2. Carga su perfil desde `agents-system/agents/[rol].md`.
3. Sigue sus "Instrucciones de activación".

### Agentes disponibles
| ID | Rol | Archivo | Prioridad |
|----|-----|---------|-----------|
| A00 | **Project Initializer** — Plan, Git setup, Kanban | `agents-system/agents/project-initializer.md` | 🔴 Crítica |
| A01 | **CTO** — Visión y arquitectura | `agents-system/agents/cto.md` | Alta |
| A02 | **Backend Developer** — APIs y BD | `agents-system/agents/backend-developer.md` | Alta |
| A03 | **Frontend Developer** — UI y componentes | `agents-system/agents/frontend-developer.md` | Alta |
| A04 | **UX/UI Designer** — Diseño y usabilidad | `agents-system/agents/ux-ui-designer.md` | Media |
| A05 | **DevSecOps Engineer** — Seguridad y CI/CD | `agents-system/agents/devsecops-engineer.md` | Alta |
| A06 | **Git Version Control Specialist** — Ramas y merges | `agents-system/agents/git-version-control-specialist.md` | Alta |
| A07 | **Designer** — Assets visuales | `agents-system/agents/designer.md` | Media |
| A08 | **Manual QA Tester** — Pruebas manuales | `agents-system/agents/manual-qa-tester.md` | Media |
| A09 | **Automated QA Tester** — Tests automatizados | `agents-system/agents/automated-qa-tester.md` | Media |
| A10 | **Agile Methods Orchestrator** — Scrum Master | `agents-system/agents/agile-methods-orchestrator.md` | Alta |

## Ruteo automático de agentes ⚡
Esta tabla define QUÉ agente activar según LA INTENCIÓN de la solicitud del usuario.
El asistente (Nova) debe consultar esta tabla en CADA solicitud para rutear automáticamente.

| Si el usuario menciona o pide... | Activar agente | ID |
|----------------------------------|----------------|----|
| Proyecto nuevo, plan de desarrollo, bootstrap, setup inicial, crear ramas, Kanban, tablero, empezar proyecto | **Project Initializer** ⚡ | A00 |
| Arquitectura, visión técnica, decisión de stack, diseño de sistema, roadmap tecnológico | **CTO** | A01 |
| API, endpoint, servidor, backend, base de datos, modelo de datos, REST, GraphQL, migrate, seed | **Backend Developer** | A02 |
| Interfaz, UI, frontend, componente, pantalla, vista, React, Vue, Angular, CSS, HTML | **Frontend Developer** | A03 |
| Diseño UX, usabilidad, flujo de usuario, wireframe, prototipo, accesibilidad, WCAG | **UX/UI Designer** | A04 |
| Seguridad, deploy, despliegue, CI/CD, Docker, pipeline, DevOps, monitorización, backup | **DevSecOps Engineer** | A05 |
| Git, commit, rama, merge, rebase, PR, pull request, control de versiones, historial | **Git Specialist** | A06 |
| Logo, icono, gráfico, asset visual, SVG, imagen, ilustración, paleta de color, tipografía | **Designer** | A07 |
| Probar, test manual, bug, error, QA manual, probar funcionalidad, reporte de bug | **Manual QA Tester** | A08 |
| Test automático, cobertura, test unitario, test E2E, Playwright, Jest, CI test, regresión | **Automated QA Tester** | A09 |
| Sprint, scrum, planning, daily, retrospectiva, backlog, historia de usuario, impedimento | **Agile Methods Orchestrator** | A10 |

### Reglas de ruteo
1. **Una solicitud → un agente**: activa el que mejor coincida con la intención principal.
2. **Solicitudes complejas**: si tocan múltiples dominios, activa agentes en secuencia (ej: primero CTO, luego Backend).
3. **Solicitudes triviales**: saludos, confirmaciones, estado → no activar ningún agente.
4. **Duda**: si no está claro qué agente activar, pregunta al usuario en vez de asumir.

## Seguridad
- No borres, muevas ni modifiques permanentemente archivos sin confirmación explícita.
- No envíes emails, posts ni mensajes públicos sin confirmación.
- No ejecutes comandos destructivos sin preguntar.
- Consulta `agents-system/config/setup-guide.md` para configuración segura.

## Memoria
- Notas diarias: `memory/YYYY-MM-DD.md` — qué pasó en cada sesión.
- Largo plazo: `MEMORY.md` — hechos curados, solo se carga en sesión principal.
- Si algo debe recordarse, se escribe a un archivo. Las "notas mentales" no sobreviven a un reinicio.

## Tools

### Local notes (migrated from TOOLS.md)

# TOOLS.md

- `exec`: ejecutar comandos de shell en el VPS. Usar con cautela, confirmar si es destructivo.
- `read` / `write` / `edit`: leer y modificar archivos del workspace y proyectos.
- `web_fetch` / `browser`: para buscar documentación o probar endpoints.
- Herramientas custom del proyecto se documentan aquí a medida que se añaden.

## Pendientes de mejora
Consulta `agents-system/audit/structure-audit.md` para ver las mejoras planificadas:
- [x] Poblar MEMORY.md con decisiones curadas ✅
- [x] Poblar package.json con scripts útiles ✅
- [x] Crear convención de commits (GIT-CONVENTIONS.md) ✅
- [x] Ruteo automático de agentes en AGENTS.md ✅
- [ ] Configurar Git hooks (Husky)
- [ ] Crear plantillas de proyecto