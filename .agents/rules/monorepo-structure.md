---
scope: always-on
---

# Estructura del monorepo — Nexova Solutions

- Respeta el README raíz y las guías locales. Antes de añadir código a una carpeta, lee su `README.md`.
- Si se crea una interfaz pública, ubícala en `uis/website/`; las aplicaciones administrativas van en `uis/backoffice/`.
- Ubica APIs y lógica backend dentro de `services/`, siguiendo sus README. Coloca pipelines y datasets en `data/` y agentes de IA en `agents/`.
- La skill específica de Milestone 4 va en `.agents/skills/`. No confundas skills con agentes de negocio.
- No crees árboles paralelos `frontend/`, `backend/` o `apps/` que contradigan la plantilla.
- En Milestone 4 no crees aplicaciones nuevas. Limítate a los entregables autorizados del hito.
- Usa términos del dominio Nexova: candidatos, vacantes, consultores, cursos, inscripciones y SLA. Contrasta los hechos con `CONTEXT.md`; separa datos actuales de metas futuras y no inventes cifras ni resultados.

**Permitido:** actualizar documentación o una skill del milestone bajo `.agents/skills/`, tras leer la guía aplicable y sin crear una aplicación.

**Prohibido:** crear `apps/candidates/` o `frontend/` para una interfaz de candidatos, o crear una aplicación nueva durante Milestone 4.
