# Technical Context — HealthCore Digital

## Stack

| Layer   | Technology            | Notes                                         |
| ------- | --------------------- | --------------------------------------------- |
| Frontend | Next.js (App Router)  | `/uis/talent-pipeline-tracker/`                |
| Styling | CSS Modules / globals | `/uis/talent-pipeline-tracker/app/globals.css`  |
| Backend | Mock REST API         | Centrally deployed; shared across all company contexts in the course |
| Language | TypeScript           | Strict mode (via `tsconfig.json`)              |
| Types   | `packages/shared-types/` | Shared TypeScript interfaces used across apps |

## Architectural Decisions

1. **Monorepo structure** — Apps live under `/uis` (frontends), services under `/services` (when created), shared code under `/packages/`, and data pipelines under `/pipelines/`.
2. **No server-rendered state** — The candidate tool uses client-side filtering and search via the `useRecordsFilters` hook.
3. **API abstraction** — All fetches go through `/uis/talent-pipeline-tracker/lib/api.ts`; components do not call `fetch` directly.
4. **Human-readable labels** — Raw API enums (`in_progress`, `personal_interview`) are never rendered; components use label mapping tables from `projectbrief.md`.

## Repository Layout

```
ai-engineering-company-project-monorepo/
├── CONTEXT.md               # Company context (HealthCore Digital)
├── AGENTS.md                # Agent protocol (this milestone)
├── .agents/
│   ├── rules/               # Scoped agent rules
│   └── skills/              # Reusable agent skills (SKILL.md)
├── memory-bank/             # Persistent project memory
│   ├── projectbrief.md      # Business goals, KPIs, data model
│   ├── techContext.md        # This file
│   └── progress.md          # Living status log
├── uis/                     # Frontend projects
│   ├── website/             # Public corporate website (future)
│   ├── backoffice/          # Internal admin app (future)
│   └── talent-pipeline-tracker/  # Current active frontend
├── services/                # Backend APIs and services (future)
├── packages/
│   └── shared-types/        # Shared TypeScript/JSON types
├── pipelines/
│   └── data/                # ETL / data pipeline scripts
├── apps/                    # General applications
├── skills/                  # Course-provided skill stubs
└── index.html               # Static landing page
```

## Technical Constraints

- **Monorepo tooling**: No workspace package manager configured yet (no `pnpm-workspace.yaml` committed). Individual apps have their own `package.json`.
- **Deployment**: Static hosting assumed for frontends. API is external (mock endpoint).
- **Python environment**: `.venv/` exists for data pipeline scripts under `pipelines/`.
- **CI / formatting**: No formatter or linter config yet — agent must not add one without human confirmation.
- **Lockfiles**: `pnpm-lock.yaml` and `node_modules/` are gitignored patterns; do not commit them.

## Folder Conventions

| Path               | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `/uis/website`     | Public corporate website (home `/`, brand/copy from BRIEFING) |
| `/uis/backoffice`  | Internal app with own layout (entry view on `/`) |
| `/services`        | Backend APIs and services                    |

> These folders are not yet created. When they are, they must follow the conventions above.
