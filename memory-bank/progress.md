# Progress: Estado del Desarrollo del Monorepo Nexova

## 📌 Estado Actual

- [x] **Hito 1 (Sitio Web Público Base & Formulario HTML):** Completado en HTML/CSS Vanilla y JavaScript para validaciones.
- [x] **Hito 2 (Lógica de Negocio TypeScript):** Completado. Definición de entidades `Candidate` y `Vacancy`, funciones de filtrado, búsqueda, scoring 0-100, ordenamiento, transformaciones de reportes y validaciones con acumuladores de errores.
- [🔄] **Hito 4 (Monorepo AI Setup & Aplicaciones Next.js):** En desarrollo.

## 🎯 Roadmap de Hito 4

- [x] **Fase 1: Banco de Memoria (`memory-bank/`)**
  - [x] `projectbrief.md` — Contexto de negocio y solución Nexova.
  - [x] `techContext.md` — Stack técnico, entidades y restricciones.
  - [x] `progress.md` — Estado del desarrollo y siguientes pasos.
- [x] **Fase 2: Protocolo Global de Agentes (`AGENTS.md` y `.agents/rules/`)**
  - [x] `AGENTS.md` — Protocolo pre-commit y carpetas protegidas.
  - [x] `.agents/rules/nexova-conventions.md` — Convenciones técnicas.
- [x] **Fase 3: Skill de Agente Reutilizable (`.agents/skills/`)**
  - [x] `.agents/skills/candidate-scoring-ui/SKILL.md` — Skill atómica con criterios de aceptación.
- [x] **Fase 4: Aplicaciones Frontend Next.js (`./uis/website` y `./uis/backoffice`)**
  - [x] `./uis/website` — Migración de web corporativa a Next.js + TS.
  - [x] `./uis/backoffice` — Dashboard interno con layout separado.
- [ ] **Fase 5: Integración & Verificación Final**
  - [ ] Conexión del script de Hito 2 en el Backoffice sin duplicar código.
  - [ ] Pruebas y verificación de compilación/ejecución (`npm run dev`).
