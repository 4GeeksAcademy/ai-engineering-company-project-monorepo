# Progress — Milestone 4

## Completed
- Brasaland full business context loaded as source of truth in `CONTEXT.md` and `CONTEXT.es.md`.
- `memory-bank/` created with `projectbrief.md`, `techContext.md`, and this `progress.md`.
- Root `AGENTS.md` created with mandatory startup reads and pre-commit flow.
- `.agents/rules/monorepo-delivery-guardrails.md` created with explicit always-active scope.
- `.agents/skills/release-readiness-check/SKILL.md` created with single objective, documented inputs, and verifiable acceptance criteria.
- Next.js + TypeScript apps created in `uis/website` and `uis/backoffice`.
- Public website migrated to reusable TypeScript components and Brasaland-aligned sections.
- Shared business logic module implemented in `packages/shared/types/index.ts`.
- Backoffice imports shared logic module (no duplication) and renders computed output in the UI.
- Website aligned against Hito 1 reference repo sections:
  - Added explicit section ids and navigation parity (`que-hacemos`, `caracteristicas`, `contacto`).
  - Added dedicated `/aplicar` route with typed form and client-side validation.
  - Added SEO structured data (Schema.org Restaurant) in website layout.
  - Added legal links and expanded contact CTA parity.
- Validation completed:
  - `uis/website`: `npm run build` OK.
  - `uis/backoffice`: `npm run build` OK (webpack mode for local shared package compatibility).
  - `uis/website`: `npm run lint` OK after Hito 1 alignment.
  - `uis/website`: `npm run build` OK after Hito 1 alignment.

## In Progress
- None.

## Next Steps
1. Capture screenshots for PR evidence (`uis/website` and `uis/backoffice`).
2. Open PR from `milestone-4` to `main` with AGENTS.md link and validation summary.
