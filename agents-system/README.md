# Sistema de Agentes con Memoria — DeepSeek

> **Arquitectura de agentes inteligentes para desarrollo de software y estudio asistido por IA.**
> Optimizado para modelos DeepSeek con memoria contextual y habilidades especializadas.

---

## Filosofía del Sistema

Este sistema define **roles de agente especializados** que colaboran para construir, auditar y mejorar proyectos de software. Cada agente posee:

- **Identidad única**: Nombre, propósito y personalidad operativa.
- **Habilidades concretas**: Capacidades técnicas que puede ejecutar.
- **Herramientas asignadas**: Instrumentos específicos para realizar su trabajo.
- **Protocolo de memoria**: Cómo recuerda y aplica contexto entre sesiones.
- **Ciclo de mejora continua**: Cómo aprende de errores y aciertos.

### Principios de diseño

1. **Separación de responsabilidades**: Cada agente se enfoca en un dominio específico.
2. **Memoria persistente**: Los agentes recuerdan decisiones y contexto entre sesiones.
3. **Colaboración estructurada**: Flujos de trabajo definidos entre roles complementarios.
4. **Auditabilidad**: Cada acción queda registrada para trazabilidad.
5. **Seguridad por defecto**: Credenciales y secretos nunca se exponen.

---

## Estructura del sistema

```
agents-system/
├── README.md                    # Este archivo
├── AGENTS.md                   # Registro maestro de todos los agentes
├── agents/                     # Perfiles individuales de agentes
│   ├── project-initializer.md  # A00 — Bootstrap de proyectos
│   ├── cto.md
│   ├── backend-developer.md
│   ├── frontend-developer.md
│   ├── ux-ui-designer.md
│   ├── devsecops-engineer.md
│   ├── git-version-control-specialist.md
│   ├── designer.md
│   ├── manual-qa-tester.md
│   ├── automated-qa-tester.md
│   └── agile-methods-orchestrator.md
├── config/                     # Guías de configuración
│   └── setup-guide.md
└── audit/                      # Auditorías y propuestas de mejora
    └── structure-audit.md
```

---

## Roles de agente

| # | Rol | ID | Enfoque principal |
|---|-----|----|-------------------|
| 0 | **Project Initializer** | A00 | Bootstrap de proyectos, plan, Git setup, Kanban ⚡ |
| 1 | **CTO** | A01 | Visión estratégica, arquitectura general, decisiones técnicas |
| 2 | **Backend Developer** | A02 | Lógica de servidor, APIs, bases de datos |
| 3 | **Frontend Developer** | A03 | UI, experiencia de cliente, componentes interactivos |
| 4 | **UX/UI Designer** | A04 | Usabilidad, flujos de usuario, diseño de interacción |
| 5 | **DevSecOps Engineer** | A05 | Seguridad, CI/CD, infraestructura, monitorización |
| 6 | **Git Version Control Specialist** | A06 | Ramas, merges, convenciones, historial limpio |
| 7 | **Designer** | A07 | Activos visuales, gráficos, identidad de marca |
| 8 | **Manual QA Tester** | A08 | Pruebas exploratorias, detección de bugs, informes |
| 9 | **Automated QA Tester** | A09 | Tests automatizados, regresión, cobertura |
| 10 | **Agile Methods Orchestrator** | A10 | Scrum, ceremonias, impedimentos, mejora continua |

---

## Flujo de trabajo recomendado

```
1. Agile Methods Orchestrator → Define sprint y tareas
2. CTO → Valida arquitectura y visión
3. UX/UI Designer → Diseña flujos y wireframes
4. Designer → Crea activos visuales
5. Backend Developer → Implementa APIs y lógica
6. Frontend Developer → Conecta UI con backend
7. Manual QA Tester → Prueba funcionalidad
8. Automated QA Tester → Escribe tests de regresión
9. DevSecOps Engineer → Despliega y monitorea
10. Git Version Control Specialist → Gestiona ramas y merge
```

---

## Integración con el workspace actual

Este sistema se integra con la estructura existente:

- `AGENTS.md` → Registro maestro, normas de operación **y tabla de ruteo automático** ⚡
- `SOUL.md` → Tono, personalidad **y protocolo de activación de agentes**
- `USER.md` → Preferencias del usuario (Jonathan)
- `IDENTITY.md` → Identidad del orquestador principal (Nova) + supervisión de 10 agentes
- `TOOLS.md` → Herramientas conectadas (Composio, APIs, canales)
- `MEMORY.md` → Hechos curados del sistema (ahora poblado ✅)
- `GIT-CONVENTIONS.md` → Convención de commits y ramas
- `package.json` → Scripts npm para activar agentes y tareas comunes
- `memory/` → Diario de sesiones y memoria persistente
- `skills/` → Habilidades instaladas (4Geeks, daily log, calendario)

---

## Cómo usar este sistema

1. **Inicio rápido**: Lee `AGENTS.md` para activar el ecosistema y el ruteo automático.
2. **El asistente rutea solo**: Al recibir una solicitud, Nova consulta la tabla de ruteo en `AGENTS.md` y activa el agente adecuado automáticamente.
3. **Consulta un agente**: Abre su archivo en `agents/` para instrucciones detalladas.
4. **Configura un proyecto**: Sigue `config/setup-guide.md`.
5. **Audita y mejora**: Revisa `audit/structure-audit.md` para optimizaciones.
6. **Convenciones Git**: `GIT-CONVENTIONS.md` para commits estandarizados.

---
*Generado para el ecosistema OpenClaw — Septiembre 2026*