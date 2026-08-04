# AGENTS.md — Monorepo AI Setup & Protocolo de Gobernanza

Este documento establece el protocolo obligatorio que cualquier agente de programación (Cursor, Windsurf, Claude Code, etc.) debe seguir al interactuar con el repositorio de **Nexova AI Monorepo**.

---

## 1. 📖 Archivos de Lectura Obligatoria al Iniciar Sesión

Antes de modificar o generar cualquier línea de código, el agente **DEBE** leer los siguientes archivos de contexto activo en la carpeta `memory-bank/`:

1. `memory-bank/projectbrief.md`: Contexto de negocio de Nexova, visión general y problema a resolver.
2. `memory-bank/techContext.md`: Stack tecnológico, entidades (`Candidate`, `Vacancy`) y restricciones técnicas.
3. `memory-bank/progress.md`: Estado actual del desarrollo y roadmap activo del hito.

---

## 2. 🔄 Flujo Obligatorio Antes de Cada Commit (Mínimo 4 Pasos)

El agente no debe realizar ningún commit sin haber ejecutado y verificado estrictamente el siguiente flujo en orden:

1. **Paso 1 — Formato & Linting:** Asegurar que el código formateado cumple con las reglas del repositorio y no introduce warnings innecesarios.
2. **Paso 2 — Verificación de Tipos (Type-Check):** Ejecutar compilación estricta de TypeScript (`npx tsc --noEmit` o script equivalente) en las aplicaciones afectadas sin errores.
3. **Paso 3 — Verificación de Ejecución:** Comprobar que los servidores de desarrollo (`npm run dev`) en `./uis/website` y `./uis/backoffice` inicien correctamente sin fallos de runtime.
4. **Paso 4 — Resumen & Commit Estructurado:** Generar un mensaje de commit descriptivo en español siguiendo la convención `tipo(scope): descripción` (ej. `feat(backoffice): integrar scoring de candidatos de hito 2`).

---

## 3. 🛡️ Archivos y Carpetas Protegidos (Prohibido Modificar sin Confirmación)

El agente **NO DEBE** modificar, sobrescribir ni eliminar los siguientes archivos y carpetas sin la confirmación explícita del desarrollador:

- `CONTEXT.md` o `.github/CONTEXT-nexova.es.md` (Contextos base de la empresa)
- `.github/hito4.md` (Especificaciones del hito)
- `package.json` de la raíz del monorepo
- `tsconfig.json` base de la raíz sin justificación explícita
- Cualquier archivo dentro de `src/` que altere las firmas de la lógica del Hito 2 sin coordinar la actualización de sus llamadas.

---

## 4. 🗂️ Convención de Directorios de Agentes

- `.agents/`: **Configuración de Agentes de Desarrollo.** Contiene `.agents/rules/` (convenciones de código) y `.agents/skills/` (skills reutilizables de desarrollo).
- `agents/`: **Código de Producto de Agentes.** Espacio reservado para los agentes de IA de negocio que se construirán en hitos posteriores (no confundir con `.agents/`).
