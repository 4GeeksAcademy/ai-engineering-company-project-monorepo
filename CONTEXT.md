# CONTEXT.md — HealthCore (Milestone 4: AI-driven Engineering)

> This context is specific to **Milestone 4 — AI-driven Engineering (agent infrastructure)**.
> For the full company briefing, see [`healthcore-BRIEFING.en.md`](./healthcore-BRIEFING.en.md).
> For Milestone 1 website specs, see the `CONTEXT-healthcore-milestone1.md` file.

HealthCore is an outpatient healthcare services company founded in 2011 in Austin, Texas. It operates 12 outpatient clinics: nine in the United States (Texas, Florida, and Georgia) and three in the United Kingdom (London and Manchester). It offers primary care, specialist consultations, chronic disease management, and preventive health programmes; employs approximately 200 people; and generates around $28 million in annual revenue. Its competitive strengths are same-day appointments, extended hours, and bilingual staff at US locations.

---

## Milestone 4 Objective

Build the **agent governance infrastructure** for the HealthCore monorepo so that AI coding agents can operate safely, consistently, and with full awareness of business and technical context. No application code is required in this milestone.

---

## Key Deliverables

1. **`healthcore-BRIEFING.en.md`** — Full HealthCore company briefing at repo root, sourced from the canonical syllabus context.
2. **`memory-bank/`** — Three files (`projectbrief.md`, `techContext.md`, `progress.md`) providing persistent project memory.
3. **`AGENTS.md`** — Agent protocol defining mandatory reads, pre-commit workflow, and protected areas.
4. **`.agents/rules/`** — Scoped, actionable rule files (at least one) with clear scope and concrete conventions.
5. **`.agents/skills/`** — Reusable skill(s) with documented inputs and verifiable acceptance criteria.

---

## Repository Conventions (Milestone 4)

| Convention       | Rule                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch name      | `feature/agent-memory-bank`                                                                                                                                                            |
| PR target        | `main` on the student fork                                                                                                                                                             |
| Protected areas  | `.gitignore`, `.vscode/tasks.json`, app `package.json` and `next.config.js`, `packages/shared-types/index.ts`, `healthcore-BRIEFING.en.md`, `CONTEXT.md`, `node_modules` and lockfiles |
| Pre-commit order | (1) formatter, (2) type-check/lint, (3) update `progress.md`, (4) self-review diff scope                                                                                               |

---

## Company Context (from healthcore-BRIEFING.en.md)

### Organisation

| Department          | Lead                     | Key Concern                                                 |
| ------------------- | ------------------------ | ----------------------------------------------------------- |
| Clinical Operations | Dr. Marcus Reid          | 2 disconnected EHR systems; 35 min/day documentation burden |
| Patient Experience  | Priya Nair               | 22% no-show rate (~$1.8M/yr); no online booking             |
| Revenue Cycle       | Tom Callahan             | 14% claims denial rate (2x industry avg)                    |
| Compliance          | Claire Whitfield         | HIPAA (US) + UK GDPR; no unified audit trail                |
| People              | Diane Foster             | 47 days avg to fill clinical roles; manual CME tracking     |
| Technology          | James Osei (CTO)         | 6-person team; patchwork legacy systems; no telemetry       |
| Executive           | Dr. Sandra Okonkwo (CEO) | No real-time unified dashboard across departments           |

### Regulatory Constraints

- **HIPAA** (US clinics) — Patient data handling, access logs, breach notification.
- **UK GDPR** (UK clinics) — Different consent, data portability, and erasure rules.
- Any system handling patient data must be evaluated under both frameworks.

---

## Stack (for agent reference)

| Layer        | Technology               | Location                        |
| ------------ | ------------------------ | ------------------------------- |
| Frontend     | Next.js (App Router)     | `uis/talent-pipeline-tracker/`  |
| Styling      | CSS Modules              | App-level `globals.css`         |
| Backend      | Mock REST API            | External (shared across course) |
| Language     | TypeScript (strict)      | `tsconfig.json` per app         |
| Shared types | `packages/shared-types/` | `index.ts`                      |

---

## Folder Map

| Path                      | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `/uis/website`            | Public corporate website (home `/`, brand from BRIEFING) |
| `/uis/backoffice`         | Internal app with own layout (entry view on `/`)         |
| `/uis/<app-name>/`        | Other frontend apps                                      |
| `/services`               | Backend APIs and services                                |
| `/packages/shared-types/` | Shared TypeScript/JSON types                             |
| `/pipelines/data/`        | ETL / data pipeline scripts                              |
| `/.agents/rules/`         | Scoped agent conventions                                 |
| `/.agents/skills/`        | Reusable agent skills                                    |
| `/memory-bank/`           | Persistent project memory (business + technical context) |

---

## Milestone 1 website context (archived reference)

The Milestone 1 (public website) specifications — landing page sections, clinic directory, enquiry form fields, validation messages, structured data, and bilingual requirements — are preserved in [`CONTEXT-healthcore-milestone1.md`](./CONTEXT-healthcore-milestone1.md). Milestone 4 does not modify the public website.
