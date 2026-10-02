# AGENTS — Registro Maestro del Sistema

> **Versión**: 2.0 | **Framework**: DeepSeek + OpenClaw
> **Propósito**: Catalogar y activar los agentes del ecosistema de desarrollo
> **Orquestación**: Automática mediante tabla de ruteo en el `AGENTS.md` raíz

---

## Activación del sistema

1. Lee este archivo al inicio de cada sesión.
2. Carga el perfil del/los agente(s) necesarios desde `agents/`.
3. **Para ruteo automático**: consulta la tabla en el `AGENTS.md` raíz (sección `## Ruteo automático de agentes`).
4. Consulta la guía de configuración en `config/setup-guide.md` si es necesario.
5. Revisa la auditoría en `audit/structure-audit.md` para mejoras continuas.

---

## Índice de agentes

| ID | Rol | Archivo | Prioridad | Palabras clave de activación |
|----|-----|---------|-----------|------------------------------|
| A00 | **Project Initializer** | `agents/project-initializer.md` | **Crítica** (primero) | proyecto, plan, bootstrap, inicializar, setup, kanban, empezar, nuevo, crear repo |
| A01 | CTO | `agents/cto.md` | Alta | arquitectura, visión, stack, roadmap, decisión técnica |
| A02 | Backend Developer | `agents/backend-developer.md` | Alta | API, servidor, backend, BD, modelo de datos, migrate |
| A03 | Frontend Developer | `agents/frontend-developer.md` | Alta | UI, frontend, componente, React, Vue, CSS, pantalla |
| A04 | UX/UI Designer | `agents/ux-ui-designer.md` | Media | UX, usabilidad, flujo, wireframe, prototipo, accesibilidad |
| A05 | DevSecOps Engineer | `agents/devsecops-engineer.md` | Alta | seguridad, deploy, CI/CD, Docker, pipeline, monitorización |
| A06 | Git Version Control Specialist | `agents/git-version-control-specialist.md` | Alta | git, commit, rama, merge, rebase, PR, control de versiones |
| A07 | Designer | `agents/designer.md` | Media | logo, icono, gráfico, SVG, paleta, tipografía, asset visual |
| A08 | Manual QA Tester | `agents/manual-qa-tester.md` | Media | probar, test manual, bug, QA manual, reporte de error |
| A09 | Automated QA Tester | `agents/automated-qa-tester.md` | Media | test automático, cobertura, Jest, Playwright, regresión |
| A10 | Agile Methods Orchestrator | `agents/agile-methods-orchestrator.md` | Alta | sprint, scrum, planning, daily, retrospectiva, backlog |

---

## Reglas de operación entre agentes

### Comunicación
- Los agentes se pasan contexto mediante archivos Markdown en `/workspace/`.
- Las decisiones técnicas quedan documentadas en `memory/YYYY-MM-DD.md`.
- Los conflictos entre roles se resuelven escalando al CTO.

### Memoria compartida
- `MEMORY.md`: Hechos curados y decisiones duraderas.
- `memory/YYYY-MM-DD.md`: Bitácora diaria de cada sesión.
- Cada agente puede escribir a su propia sección en el diario diario.

### Ciclo de vida de una tarea
1. **Planificación**: Agile Methods Orchestrator + CTO.
2. **Diseño**: UX/UI Designer + Designer.
3. **Implementación**: Backend + Frontend Developers.
4. **Validación**: Manual QA + Automated QA Testers.
5. **Despliegue**: DevSecOps Engineer.
6. **Control de versiones**: Git Specialist.
7. **Retrospectiva**: Agile Methods Orchestrator.

---

## Habilidades transversales

Todos los agentes comparten estas habilidades base:

- **Escritura de archivos Markdown** con estructura clara.
- **Uso de herramientas del workspace** (shell, lectura/escritura, web fetch).
- **Protocolo de seguridad**: No exponer credenciales, confirmar acciones destructivas.
- **Memoria persistente**: Registrar decisiones y aprendizaje en los archivos de memoria.

---

## Dependencias entre agentes

```
CTO ───> DevSecOps Engineer (arquitectura segura)
CTO ───> Git Specialist (estructura de repos)
Backend ───> Frontend (definición de APIs)
Frontend ───> UX/UI Designer (implementación de diseños)
UX/UI ───> Designer (activos visuales)
Manual QA ───> Automated QA (casos de prueba manuales como base)
Todos ───> Agile Orchestrator (ceremonias y retrospectivas)
```

---

*Registro maestro del sistema de agentes DeepSeek — 2026-09-25*