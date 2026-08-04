# Implementation Plan — Milestone 4 (Hito 4): Monorepo AI Setup & Next.js Apps (Nexova HR Consulting)

Plan de implementación detallado para estructurar la infraestructura de IA (Memory Bank, AGENTS.md, `.agents/rules` y `.agents/skills`) e integrar las aplicaciones frontend Next.js (`./uis/website` y `./uis/backoffice`) conectando la lógica de negocio de TypeScript del Hito 2 adaptada al escenario real de **Nexova** (Consultoría de RRHH y Adquisición de Talento).

## 🧠 Método de los 3 Expertos & Self-Refinement Loop (Contextualizado para Nexova)

### 1. Perspectivas de los 3 Expertos

* **Experto 1: AI Systems & Knowledge Architect**
  * *Enfoque:* Diseño del Memory Bank y Gobernanza de Agentes.
  * *Dictamen:* `memory-bank/` debe alinearse al 100% con [.github/CONTEXT-nexova.es.md](file:///workspaces/ai-engineering-company-project-monorepo-matiasidiartviera/.github/CONTEXT-nexova.es.md). Debe documentar la empresa Nexova (consultoría de RRHH en Valencia y Miami), los procesos de selección, las entidades `Candidate` y `Vacancy`, y el objetivo de la plataforma. `AGENTS.md` establecerá la regla obligatoria de leer `memory-bank/` antes de cada interacción y prohibirá modificar archivos sensibles de configuración del monorepo (`CONTEXT.md`, `package.json` raíz, etc.).
* **Experto 2: Frontend Architect (Next.js & Monorepo Specialist)**
  * *Enfoque:* Arquitectura frontend de `./uis/website` y `./uis/backoffice`.
  * *Dictamen:* 
    1. **`uis/website`**: Migración del sitio público del Hito 1 (landing corporativa de Nexova) utilizando Next.js + TypeScript, con diseño profesional (Tailwind CSS/CSS modules) y semántica HTML.
    2. **`uis/backoffice`**: Aplicación Next.js dedicada para los 40 consultores de selección de Nexova. Tendrá su propio layout tipo Dashboard/Panel administrativo (diferente a la web pública). Importará directamente las utilidades del Hito 2 (`Candidate`, `Vacancy`, scoring, filtros y reportes) desde `src/` sin duplicar código.
* **Experto 3: QA & DevSecOps Lead**
  * *Enfoque:* Verificación de cumplimiento, type safety y flujo pre-commit.
  * *Dictamen:* Se definirá un flujo pre-commit obligatorio de 4 pasos en `AGENTS.md`. La skill `.agents/skills/candidate-scoring-ui/SKILL.md` contará con criterios de aceptación explícitos: sin mutación de estado en utilidades del Hito 2, tipado TypeScript estricto sin `any`, y verificación de arranque de `npm run dev` en ambas aplicaciones.

### 2. Self-Refinement Loop (Refinamiento Interno)

* *Iteración 1:* Inicialmente se consideraba utilizar tipos genéricos para candidatos en la UI del Backoffice. **Refinamiento:** Se ajustó para utilizar strictly las interfaces definidas en `CONTEXT-nexova.es.md` (`Candidate`, `Vacancy`, `EnglishLevel`, `SeniorityLevel`, `CandidateStatus`) importadas de la lógica existente de Hito 2.
* *Iteración 2:* Se revisó la estructura visual de `.github/copilot-instructions.md` para replicar en Next.js el tono corporativo de consultoría tradicional en vías de transformación digital y la semaforización de scoring en el Backoffice (Verde >=80, Amarillo 50-79, Rojo <50).
* *Iteración 3:* Se incorporó un sistema de seguimiento de estado explícito (Checklist con indicadores de estado: ⏳ Pendiente, 🔄 En Progreso, ✅ Completado, ❌ Error) para monitorear en tiempo real la ejecución de cada tarea.

---

## 📊 Estado de Control y Leyenda del Checklist

* ⏳ **Pendiente**: Tarea planificada lista para ejecutar.
* 🔄 **En Progreso**: Tarea actualmente en desarrollo.
* ✅ **Completado**: Tarea ejecutada y verificada exitosamente.
* ❌ **Error**: Tarea con fallo de ejecución o inconsistencia detectada.

---

## 📋 Lista de Tareas por Fases y Tracking de Estado

### 📍 FASE 1: Banco de Memoria Activo (`memory-bank/`) Específico de Nexova
- [x] ✅ **Tarea 1.1:** Crear el directorio `memory-bank/` en la raíz del proyecto.
- [x] ✅ **Tarea 1.2:** Crear `memory-bank/projectbrief.md` incorporando la historia de Nexova, líneas de negocio (headhunting, outsourcing, formación) y el desafío de automatizar el trabajo de 40 consultores.
- [x] ✅ **Tarea 1.3:** Crear `memory-bank/techContext.md` detallando la pila tecnológica (Next.js, React, TypeScript), el monorepo y el modelo de dominio (`Candidate`, `Vacancy`).
- [x] ✅ **Tarea 1.4:** Crear `memory-bank/progress.md` reflejando el progreso (Hito 1 web completado, Hito 2 utilidades TS completadas, Hito 4 infraestructura AI y apps Next.js en desarrollo).

### 📍 FASE 2: Gobernanza y Reglas de Agentes (`AGENTS.md` y `.agents/rules/`)
- [ ] ⏳ **Tarea 2.1:** Crear `AGENTS.md` en la raíz especificando:
  * Paso 1: Lectura obligatoria de `memory-bank/` al inicio de cada sesión.
  * Paso 2: Flujo de entrega pre-commit obligatorio (Linting, Type-check `tsc --noEmit`, comprobación de dev server, resumen de cambios).
  * Paso 3: Lista de archivos protegidos (ej. `CONTEXT.md`, `.github/`, configs base).
- [ ] ⏳ **Tarea 2.2:** Crear la carpeta `.agents/rules/` y definir al menos una regla de desarrollo (ej. `nexova-conventions.md`) especificando su alcance explícito (Scope: `always` o `glob: uis/**`).

### 📍 FASE 3: Definición de Skill de Agente Reutilizable (`.agents/skills/`)
- [ ] ⏳ **Tarea 3.1:** Crear la carpeta `.agents/skills/candidate-scoring-ui/` (skill para la tarea recurrente de generación/verificación de componentes de selección).
- [ ] ⏳ **Tarea 3.2:** Crear `SKILL.md` con:
  * Objetivo único y claro.
  * Entradas requeridas (`Candidate`, `Vacancy`, scoring result).
  * Salidas esperadas (Componente React con semaforización de score).
  * Criterios de aceptación verificables.

### 📍 FASE 4: Construcción de Apps Next.js en `./uis/website` y `./uis/backoffice`
- [ ] ⏳ **Tarea 4.1:** Inicializar la web pública en `./uis/website` (Next.js + TypeScript):
  * Reconstruir/Migrar la landing de Nexova (Hito 1) en `/` con componentes React modulares (`Header`, `Hero`, `Services`, `Footer`).
  * Estilos profesionales y coherentes con la identidad de Nexova.
- [ ] ⏳ **Tarea 4.2:** Inicializar el portal interno en `./uis/backoffice` (Next.js + TypeScript):
  * Crear layout propio de Backoffice (Sidebar de navegación + área principal de trabajo).
  * Vista de inicio en `/` (Dashboard de bienvenida para consultores).

### 📍 FASE 5: Integración del Módulo de Lógica TS (Hito 2) & Verificación
- [ ] ⏳ **Tarea 5.1:** Conectar la lógica de negocio de TypeScript del Hito 2 (`src/utils/` o similar) con `./uis/backoffice`:
  * Importación directa sin duplicación de código.
- [ ] ⏳ **Tarea 5.2:** Renderizar en la UI del Backoffice el listado de candidatos, cálculo de scoring frente a vacantes y reportes agregados.
- [ ] ⏳ **Tarea 5.3:** Verificación final con compilación estricta y pruebas de ejecución con `npm run dev` en ambos entornos.

---

## 🎯 Proposed Changes (Resumen de Componentes)

#### Memory Bank Infrastructure
- [NEW] [projectbrief.md](file:///workspaces/ai-engineering-company-project-monorepo-matiasidiartviera/memory-bank/projectbrief.md)
- [NEW] [techContext.md](file:///workspaces/ai-engineering-company-project-monorepo-matiasidiartviera/memory-bank/techContext.md)
- [NEW] [progress.md](file:///workspaces/ai-engineering-company-project-monorepo-matiasidiartviera/memory-bank/progress.md)

#### Agent Governance Infrastructure
- [NEW] [AGENTS.md](file:///workspaces/ai-engineering-company-project-monorepo-matiasidiartviera/AGENTS.md)
- [NEW] [nexova-conventions.md](file:///workspaces/ai-engineering-company-project-monorepo-matiasidiartviera/.agents/rules/nexova-conventions.md)
- [NEW] [SKILL.md](file:///workspaces/ai-engineering-company-project-monorepo-matiasidiartviera/.agents/skills/candidate-scoring-ui/SKILL.md)

#### Frontend Web Applications
- [NEW] [uis/website/](file:///workspaces/ai-engineering-company-project-monorepo-matiasidiartviera/uis/website) (Next.js Public Site)
- [NEW] [uis/backoffice/](file:///workspaces/ai-engineering-company-project-monorepo-matiasidiartviera/uis/backoffice) (Next.js Internal Backoffice for Nexova Consultants)

---

## 🔬 Verification Plan

### Automated Checks
- `npx tsc --noEmit` en `./uis/website` y `./uis/backoffice`.
- Comprobación de cero warnings/errores de compilación.

### Manual Verification
- Renderizado de `./uis/website` en `http://localhost:3000` con la landing page corporativa de Nexova.
- Renderizado de `./uis/backoffice` con el Dashboard de consultores y la ejecución visible de las funciones de scoring/matching de candidatos del Hito 2.
