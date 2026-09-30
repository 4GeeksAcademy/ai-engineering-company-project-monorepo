# HealthCore Technical Context

## Technology stack

### Repository-level stack

The repository is organised as a monorepo template for AI Engineering projects. The root README recommends a centralised FastAPI backend in `services/`, but no root workspace runner or root-level application package is configured.

### Existing application stack

The existing `uis/talent-pipeline-tracker` application uses:

- Next.js 16.3.6
- React 19.2.8
- React DOM 19.2.8
- TypeScript 5
- Tailwind CSS 4
- ESLint 9 with `eslint-config-next`
- `next/font`, currently using the Geist font family

### Shared package

`packages/shared` provides the private package `@repo/shared-types` at version `0.0.1`. It currently contains placeholder shared types including `Id` and `BaseEntity`.

## Existing architecture

The repository uses responsibility-based top-level folders:

- `uis/`: user interfaces and frontend applications.
- `services/`: backend APIs and background workers.
- `data/`: raw data, pipelines, processed data, and evaluation sets.
- `agents/`: autonomous or semi-autonomous AI assistants.
- `skills/`: reusable agent capabilities and instructions.
- `mcps/`: Model Context Protocol servers.
- `workflows/`: automation and orchestration.
- `packages/`: versionable shared libraries and types.
- `shared/`: schemas, templates, assets, and other unbundled shared resources.
- `docs/`: cross-cutting architecture and technical documentation.
- `infra/`: deployment and infrastructure configuration.
- `scripts/`: repeatable helper scripts.
- `internal/`: structured developer tools and CLIs.
- `memory-bank/`: project context, technical context, and progress documentation.

The concrete application currently present is a Next.js talent pipeline tracker under `uis/talent-pipeline-tracker`. Its source includes a candidate list page, candidate types, candidate detail routing, API helpers, formatting helpers, and a talent-pipeline component.

## Architectural decisions

- Keep frontend applications under `uis/` and backend services under `services/`.
- Use one central FastAPI company API early in the project rather than splitting into many microservices prematurely.
- Add routers or domain modules to the central API as domains grow.
- Extract background workers only when they genuinely need to run separately from the API.
- Put reusable code shared by multiple applications or domains in `packages/`.
- Use `shared/` for reusable resources that are not full packages or libraries.
- Document each application, service, agent, pipeline, workflow, and internal tool in its own area.

These are repository guidance decisions. A production implementation for the HealthCore central API is not currently present.

## Technical constraints

- Systems must support protected health information and applicable HIPAA requirements in the United States.
- Systems must support UK GDPR requirements in the United Kingdom.
- Data access, sharing, storage, and auditability must account for the two jurisdictions.
- The US and UK EHR platforms are different and do not communicate.
- Billing data comes from different US and UK processes and systems.
- Operational information currently lacks a shared data layer, telemetry, and centralised logging.
- Healthcare failures can affect patients and create legal or compliance consequences.
- The repository must support cross-functional work across UIs, APIs, data, AI, and automation.

## Development commands

For `uis/talent-pipeline-tracker`:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

The app README documents the default development URL as `http://localhost:3000`.

Root-level development commands, workspace installation commands, test commands, database commands, and deployment commands are not specified.

## Existing applications and services

### Existing applications

- `uis/website`: Next.js, React, and TypeScript public website with the home (`/`) and patient enquiry (`/application`) routes; dev server on port 3001.
- `uis/backoffice`: Next.js, React, and TypeScript internal operations overview (`/`); dev server on port 3002.
- `uis/backoffice/talent-pipeline-tracker`: Next.js frontend for managing candidates, including status/stage filtering, candidate details, candidate notes, and candidate registration requirements described in the milestone context.

### Existing shared code

- `packages/shared`: placeholder shared TypeScript types published internally as `@repo/shared-types`.

### Services

No implemented backend service is documented in the current repository. The repository guide recommends a central FastAPI service, but its implementation is not specified or present in the inspected tree.

## Important technical requirements from `CONTEXT.md`

- The central API should unify patient, appointment, billing, and staff data from existing systems.
- The API and related systems must support both EHR platforms and both countries.
- Dashboards should consume data pipelines covering clinical, operations, finance, workforce, and executive metrics.
- Monitoring should provide real-time telemetry, centralised logging, automated health checks, and alerts.
- Compliance tooling should consolidate audit trails and data-access patterns.
- Patient data requests should be compilable across all relevant systems.
- AI-assisted clinical documentation must reduce administrative time without weakening healthcare safeguards.
- Claims review and coding assistance should help reduce the 14% denial rate.
- Appointment reminders and no-show prediction should address the 22% network no-show rate.
- Technical documentation should be indexed for semantic search.
- Executive reporting should provide real-time KPIs, scheduled weekly reports, critical-metric alerts, and natural-language querying.

## Not specified

The inspected repository does not specify a production database, authentication design, authorisation model, cloud provider, deployment platform, API contract, observability vendor, AI model provider, test framework, or root package-manager workspace configuration.
