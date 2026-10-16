# Project Brief

## Project name

TrackFlow monorepo foundation

## Company summary

TrackFlow is a logistics company focused on warehousing, order fulfillment, last-mile delivery, and reverse logistics for ecommerce brands. It operates in the United States and Spain, with warehouses in Los Angeles and Zaragoza. The business problem is not demand, but operational fragmentation: inventory is split across two warehouses and two systems, carrier operations are manual, returns are reviewed one by one, customer support is repetitive and human-only, and leadership relies on manual weekly reporting.

## Why this project exists

This monorepo is the delivery base for TrackFlow Tech, the internal unit responsible for turning TrackFlow into a more automated and measurable logistics operation. The repo needs to support product surfaces, backend services, automations, agent workflows, shared types, and memory-driven development inside one coherent structure.

The immediate goal is to establish project memory and repo context before more agent-driven development happens. Without persistent business and technical context, new agent sessions will tend to produce generic outputs, duplicate structure, or build features that do not match TrackFlow's operating model.

## Business goals

- Unify visibility across Los Angeles and Zaragoza operations.
- Reduce manual work in warehouse operations, carrier management, reverse logistics, customer support, and executive reporting.
- Build internal and external product surfaces that expose TrackFlow data in a usable way.
- Create a codebase and agent workflow that can support later milestones: backend APIs, telemetry, RAG, skills, agents, and workflows.

## Core product directions from CONTEXT.md

### Warehouse operations

- Unified inventory API across both warehouses.
- Order ingestion pipeline that parses inbound orders from email.
- Warehouse dashboard with low-stock visibility and alerts.

### Last mile and carrier management

- Carrier selection engine using destination, weight, and urgency.
- Unified tracking endpoint across multiple carriers.
- Public parcel tracking portal.
- Carrier performance dashboard.

### Reverse logistics

- Automated returns approval with per-client rules.
- Collection and label workflow after approval.
- AI-assisted inspection based on product photos.
- Returns analytics dashboard.

### Customer experience

- First-line support agent for tracking and return status.
- Knowledge base suitable for later RAG indexing.
- Unified ticketing workflow and support dashboard.
- Optional multilingual support, with English and Spanish in scope.

### Commercial and executive operations

- Unified client reporting and renewal risk visibility.
- Real-time executive dashboard with cross-country KPIs.
- Automated weekly reporting and natural-language assistant capabilities.

## Intended monorepo shape

The course guidance requires the repo to become a structured monorepo where:

- `memory-bank/` stores project memory that agents must read first.
- `AGENTS.md` defines repo-level agent operating rules.
- `.agents/` contains concrete rules and reusable skills for this repository.
- `uis/website` becomes the public-facing company website.
- `uis/backoffice` becomes the internal application surface.
- `services/` will hold backend services when they are introduced.

## Current reality in this repository

- The TrackFlow business context is present in `CONTEXT.md`.
- `memory-bank/` is active and enforced by repo workflow (`AGENTS.md` and `.agents/rules/UpdateMemoryBank.md`).
- A Milestone 2 implementation now exists under `src/` with typed logistics models, utility functions (filters/search/scoring/transformations/validations), a barrel export, and a test/demo interface.
- Milestone 2 output artifacts are now generated through shared helper logic in `src/milestone2-output.js` and synced by `scripts/generate_milestone2_output.cjs`.
- `uis/website` and `uis/backoffice` are now TypeScript Next.js surfaces rather than JavaScript-only scaffolds.
- The website includes Milestone 1 structural sections (header/nav/contact/footer) as part of the public TrackFlow presentation.
- In `src/TrackFlow.html`, the primary nav now includes clickable section links for `Header`, `Nav`, `Contact`, and `Footer`, plus `Apply` to `application.html`.
- Backoffice displays imported Milestone 2 output from `.trackflow-milestone2-output.json` on screen via `uis/backoffice/lib/milestone2.ts`.
- Backoffice build/dev flows auto-sync Milestone 2 output generated from `src/testing-interface.js` data before startup.
- Milestone 2 output generation supports selecting different shipment records from the testing interface dataset instead of always using the first shipment.
- The repo still contains `uis/talent-pipeline-tracker`, which remains useful as a technical reference but is not aligned to TrackFlow logistics scope.
- Repository hygiene is enforced: generated Next.js directories such as `node_modules/` and `.next/` are ignored in the root `.gitignore` so large dependency outputs are not pushed.

## Scope boundaries for upcoming work

- Future work should move toward TrackFlow logistics use cases, not continue expanding the unrelated talent pipeline domain unless it is being repurposed intentionally.
- New applications should follow the repo's documented folder conventions instead of creating duplicate top-level structures.
- Memory-bank files must stay updated whenever architecture, workflow, or major scope decisions change.

## Success criteria for the foundation phase

- The repo has persistent business and technical context tailored to TrackFlow.
- Future agent work can read the memory bank and understand both the target business and the current implementation baseline.
- The next infrastructure steps are explicit: expand `.agents` rules, add at least one reusable skill, and align UI/application structure with the monorepo conventions.
