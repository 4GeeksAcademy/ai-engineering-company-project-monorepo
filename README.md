# HealthCore Monorepo

HealthCore project workspace containing:

- **Next.js applications** under `uis/` (public website, operations backoffice, talent pipeline tracker)
- TypeScript business logic in `src/utils`
- Agent infrastructure (`memory-bank/`, `AGENTS.md`, `.agents/`, `skills/`)
- Vitest unit tests in `tests/utils`

## Quick Start — All applications

From the repository root:

```bash
npm install
npm run dev
```

This starts every frontend concurrently:

| Service | URL | Purpose |
| --- | --- | --- |
| Application hub | http://localhost:4173 | Links to all apps |
| Public website | http://localhost:3000 | Bilingual corporate site + patient enquiry |
| Operations backoffice | http://localhost:3001 | Billing, clinical, CME dashboards |
| Utility tester | http://localhost:3001/utilities | M2 function manual runner |
| Talent pipeline tracker | http://localhost:3002 | Recruitment pipeline (M3) |

Copy `.env.example` to `.env.local` in each `uis/*` app if you need custom cross-app URLs.

### Individual apps

```bash
npm run dev:website      # port 3000
npm run dev:backoffice   # port 3001
npm run dev:tracker      # port 3002
npm run dev:hub          # port 4173 (links only)
```

## Production

```bash
npm run build
npm start
```

Builds all three Next.js apps, then serves them on ports 3000–3002.

## TypeScript utilities (Milestone 2)

```bash
npm run typecheck
npm test
npm run utils:playground
```

Business logic lives in `src/utils/` and is imported by `uis/backoffice` — never duplicated.

## Development Workflow

- Root quality gates: `npm run typecheck`, `npm test`
- All apps: `npm run lint:apps`
- Single app: `cd uis/<app> && npm run lint && npm run build`

## Repository Areas

- `memory-bank/` — Agent session context
- `src/` — M2 TypeScript utilities
- `tests/` — Vitest suites and fixtures
- `uis/website/` — Public Next.js site (M1 migration)
- `uis/backoffice/` — Internal operations dashboard (M4)
- `uis/talent-pipeline-tracker/` — Recruitment UI (M3)
- `context/` — Milestone company scenarios (programme-assigned)
- `public/index.html` — Local dev application hub

## Agent infrastructure

See root `AGENTS.md` for session startup files, pre-commit workflow, and protected paths.

## Legacy note

The original static HTML site (`index.html`, `application.html`, `utility-test.html`) has been migrated to Next.js apps under `uis/`. The `assets/` folder remains for reference artifacts; Tailwind v3 build scripts are retained for historical compatibility only.
