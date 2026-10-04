# Progress — Milestone 4

## Completed
- Docker development setup now runs website and backoffice in one interfaces container with bind mounts and isolated dependency/Next.js volumes.
- Added a minimal FastAPI scaffold because no backend code or requirements file existed in this checkout; it exposes `/health` and a Pydantic-validated `/api/v1/weekly-input` fixture, with uv dependencies and Uvicorn reload.
- Backoffice fetches weekly input from `http://backend:8000` and retains its sample fallback with a bounded timeout for the Codespaces network limitation.
- Docker Compose builds both services, publishes the three expected ports, uses the named `brasaland-dev-network`, and loads the root `.env` (ignored by Git); API port/base URL currently use Compose defaults because `.env` only contains UI ports.
- Local host checks return HTTP 200 for website, backoffice, backend health, and weekly input. Hot reload was confirmed for both Next.js and Uvicorn using reversible probes. DNS resolves `backend`, but TCP between containers times out in this Codespaces Docker Engine.
- Added UI and services Dockerfiles/dockerignore files, root Compose configuration, local non-secret port defaults, and root .env ignore rules.
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
- End-to-end container-to-container HTTP verification is blocked by Docker Engine networking in the current environment: the containers share a bridge and DNS resolves, but TCP connections time out.

## Next Steps
1. Replace the weekly-input development fixture with the intended real data source and business API once available.
2. Add `API_PORT=8000` and `API_BASE_URL=http://backend:8000` to the ignored local `.env` if the editor permits it.
3. Re-run container-to-container connectivity after Docker Engine bridge traffic is available.
4. Capture screenshots for PR evidence (`uis/website` and `uis/backoffice`), then open the PR with validation details.
