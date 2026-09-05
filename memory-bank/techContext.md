# Technical Context

## Current repository baseline

This repository is a monorepo template that already contains multiple top-level areas for apps, UIs, agents, skills, shared packages, scripts, workflows, and data. The company context has been replaced with TrackFlow-specific content, but the supporting agent infrastructure required by the challenge is not fully in place yet.

## Existing implementation surfaces

### 1. Next.js UI app

The main implemented application today is `uis/talent-pipeline-tracker`.

Current stack in that app:

- Next.js 16.2.12
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- ESLint 9 with `eslint-config-next`

Observed characteristics:

- App Router structure under `app/`
- Strict TypeScript configuration with `noEmit`
- Local path alias `@/*`
- Client-side data fetching against an external API
- Validation commands documented as `npm run typecheck`, `npm run lint`, and `npm run build`

Current business fit:

- The app is functional, but it is built around candidate tracking and executive assistant recruitment.
- It is not aligned with the logistics workflows described in `CONTEXT.md`.
- It may still be useful as a structural reference for future TrackFlow internal applications because it already demonstrates typed records, list/detail flows, forms, filtering, and API integration patterns.

### 2. Static TrackFlow-branded frontend assets

The `src/` folder contains standalone HTML and JavaScript files, including TrackFlow-branded content and client-side form validation logic. This indicates there is already some non-Next.js prototype or milestone work in the repo, separate from the `uis/` application structure.

Implication:

- The repository currently has more than one frontend implementation style.
- Before expanding product surfaces, the team should decide which TrackFlow experiences stay as static pages and which move into structured app folders under `uis/`.

### 3. Shared package

The `packages/shared` package exists with minimal placeholder shared types:

- package name: `@repo/shared-types`
- current exports: basic `Id` and `BaseEntity`

Implication:

- Shared typing infrastructure exists, but domain modeling has not started.
- Future TrackFlow entities such as inventory items, shipments, carriers, returns, clients, tickets, and KPI records should be added here when cross-app reuse becomes real.

## Monorepo conventions already documented in the repo

- `uis/` is reserved for user-interface projects.
- The `uis/README.md` explicitly recommends `uis/website` for the public site and `uis/backoffice` for the internal admin application.
- `apps/` is described as the place for monorepo applications more generally.
- `scripts/` is meant for reproducible support tooling.
- `.agents/` is the configuration area for repo-specific agent rules and skills, distinct from the product-facing `agents/` folder.

## Gaps relative to the challenge requirements

- `AGENTS.md` now exists, but its promised `.agents` coverage is still only partially implemented.
- `.agents/` now contains a `rules/UpdateMemoryBank.md` rule plus reusable skills at `.agents/skills/dummy-order-simulation/SKILL.md` and `.agents/skills/dummy-return-simulation/SKILL.md`.
- Repo-specific skill coverage has started, but the `.agents/skills/` area still needs additional capabilities beyond dummy order and reverse-logistics simulations.
- The implemented UI path does not yet match the recommended `uis/website` and `uis/backoffice` structure.
- There is no `services/` directory in the current root structure, even though the challenge guidance expects backend services to live there when created.
- There is no root workspace package manager configuration or visible monorepo task runner configuration yet.

## Technical constraints and assumptions

- Work should preserve the existing monorepo layout instead of introducing parallel structures.
- Changes should remain compatible with Windows-based local development.
- Since there is already working Next.js code in the repo, reusing its conventions is lower risk than inventing a second frontend stack unless a milestone explicitly requires otherwise.
- Because the existing implemented app is off-domain, future work must consciously rename, repurpose, or isolate it so agents do not infer the wrong business model.
- Memory-bank files and `AGENTS.md` now provide the first layer of source-of-truth context, but `.agents/skills/` and broader rule coverage still need to be built out.

## Recommended near-term architecture direction

### Public website

- Create or migrate toward `uis/website` for the TrackFlow corporate site.
- Use TrackFlow branding, company story, and service lines from `CONTEXT.md`.

### Internal backoffice

- Create or migrate toward `uis/backoffice` for internal TrackFlow operations.
- Start with one logistics-facing route or dashboard instead of extending the candidate tracker domain.

### Shared domain model

- Expand `packages/shared` only when there is actual reuse pressure.
- Prefer a small first set of domain types: warehouse, SKU, shipment, carrier, return request, support ticket, and client account.

### Backend and integrations

- Introduce `services/` when TrackFlow APIs or workflow services are added.
- Treat external carrier APIs, warehouse systems, and reporting pipelines as future integration boundaries.

## Validation and working practices observed so far

- The Next.js app already advertises `lint`, `typecheck`, and `build` as baseline validation commands.
- There is no evidence yet of central telemetry, automated testing infrastructure at the repo root, or cross-app orchestration.
- `.agents/rules/UpdateMemoryBank.md` now formalizes that meaningful repo changes must be reflected in `memory-bank/progress.md`, `memory-bank/projectbrief.md`, or `memory-bank/techContext.md` as appropriate.
- `.agents/skills/dummy-order-simulation/SKILL.md` defines a TrackFlow order simulation workflow and writes its output to the hidden root file `.trackflow-dummy-order.txt`.
- `.agents/skills/dummy-return-simulation/SKILL.md` defines a TrackFlow reverse-logistics simulation workflow and writes its output to the hidden root file `.trackflow-dummy-return.txt`.
- Documentation and structure are still ahead of implementation, which makes accurate project memory especially important right now.

## Git and repository hygiene lessons learned

A real repository-level issue surfaced during the main UI setup: the first push of the `feature/agent-memory-bank` branch was rejected by GitHub because generated Next.js output and dependency files were accidentally included in the commit. This produced the GitHub `GH001` large-file rejection and a failed remote push.

The root cause was straightforward: local installs created large `node_modules/` and `.next/` folders, and those generated artifacts were accidentally staged. The immediate fix was to remove them from Git tracking and ignore them at the repository root with the following rules:

- `**/node_modules/`
- `.next/`
- `out/`
- `.DS_Store`

This is now part of the repo's operational baseline. In future work, generated artifacts must stay untracked while only source files, config, and documentation are committed.
