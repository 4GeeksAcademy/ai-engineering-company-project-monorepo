# Brasaland Tech Context

## Stack actual
- Monorepo en GitHub.
- TypeScript para lógica de negocio (Hito 2) en src/types y src/utils.
- Frontend web inicial en HTML + Tailwind CDN (index.html y application.html).

## Decisiones de arquitectura vigentes
- Gestor de monorepo: npm workspaces.
- UIs en uis/* como apps Next.js + TypeScript.
- APIs y workers exclusivamente en services/*.
- Reutilización de lógica por import desde ubicación original en el repo, sin duplicar archivos.

## Módulos de dominio disponibles (Hito 2)
- src/types/models.ts
- src/utils/collections.ts
- src/utils/search.ts
- src/utils/transformations.ts
- src/utils/validations.ts

## Restricciones técnicas
- Soporte de operación en COP y USD.
- Soporte de negocio para Colombia y USA.
- Separación estricta UI vs dominio: no mezclar reglas de negocio en componentes.
- Cualquier API nueva debe vivir en services, no en uis.

## Convenciones de entrega
- El agente debe leer memory-bank antes de cambios.
- Todo cambio relevante actualiza progress.md.
- Antes de commit: build/typecheck y checklist funcional mínimo.
