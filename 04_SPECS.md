# SPECS — Milestone 4: Agent Infrastructure & Next.js Applications

Implementation specification for HealthCore's agent development infrastructure and the next generation of frontend applications. Build exactly what is described below.

---

## 1. Objective

This milestone has two deliverables:

1. **Agent infrastructure** — a memory bank, root agent instructions, development rules, and at least one reusable skill so AI agents can work consistently inside the HealthCore monorepo.
2. **Next.js applications** — migrate the Milestone 1 public website into `uis/website`, scaffold an internal backoffice in `uis/backoffice`, and surface Milestone 2 business logic in the backoffice UI.

All work must reflect the **HealthCore** company scenario documented in `context/00_CONTEXT.md`, `context/01_CONTEXT.md`, and `context/02_CONTEXT.md`. Generic infrastructure or UI that ignores the company context will not be accepted.

---

## 2. Company Context (Required Reading)

Before implementing anything, read:

| File | Use |
| --- | --- |
| `context/00_CONTEXT.md` | Company overview, departments, operational problems |
| `context/01_CONTEXT.md` | Public website content, form fields, validations, bilingual scope |
| `context/02_CONTEXT.md` | Business entities, report functions, validation rules |
| `context/03_CONTEXT.md` | Talent Pipeline Tracker (already built — do not rebuild) |
| `context/04_CONTEXT.md` | Milestone 4 scope note (agent rules may be generic in structure, not in content) |

Existing implementations to preserve and build on:

| Milestone | Location | Status |
| --- | --- | --- |
| M1 — Public website | `index.html`, `application.html`, `assets/`, `validation.js` | Migrate to `uis/website` |
| M2 — Business logic | `src/utils/`, `src/types.d.ts`, `tests/utils/` | Import into `uis/backoffice` |
| M3 — Talent tracker | `uis/talent-pipeline-tracker/` | Complete — reference only |

---

## 3. Agent Infrastructure

### 3.1 Memory bank — `memory-bank/`

Create a `memory-bank/` folder at the **repository root** with at least these files. Content must be specific to HealthCore — not placeholder lorem ipsum.

#### `memory-bank/projectbrief.md`

Document:

- **Company:** HealthCore — 12-clinic outpatient network (US + UK), ~200 staff, ~$28M revenue
- **Your unit:** HealthCore Digital (CTO James Osei)
- **Problem the monorepo solves:** Fragmented systems (dual EHR, manual billing, spreadsheet HR) blocking operational visibility and patient access
- **Project objectives:** Digital public presence (Priya Nair), operational reporting (Tom Callahan / Marcus Reid / Diane Foster), recruitment tooling (Diane Foster — M3), and future agent/automation work
- **Regulatory constraint:** HIPAA (US) and UK GDPR — patient data handling rules apply to anything touching PHI

#### `memory-bank/techContext.md`

Document:

- **Monorepo layout:** `src/` (M2 TypeScript utilities), `uis/` (frontends), `tests/`, `context/`, `agents/`, `skills/`, root static M1 assets (legacy until migration)
- **Stacks in use:**
  - Root: TypeScript + Vitest + Tailwind v3 (legacy static site)
  - `uis/talent-pipeline-tracker/`: Next.js 16, React 19, Tailwind v4
  - `uis/website/` and `uis/backoffice/`: Next.js + TypeScript + Tailwind (see §5)
- **Architectural decisions:** Separate Next.js apps per UI under `uis/`; business logic stays in `src/utils/` and is imported — never duplicated; client-side data fetching where URL state must stay in sync (see talent tracker pattern)
- **Technical constraints:** No external state libraries in Next.js apps; TypeScript strict; API env vars in `.env.example` only; do not commit secrets
- **Key commands:** `npm run typecheck`, `npm test`, per-app `npm run dev` / `npm run build` / `npm run lint`

#### `memory-bank/progress.md`

Document:

- **Completed:** M1 static site, M2 utilities (`collections`, `search`, `transformations`, `validations`), M3 talent pipeline tracker
- **In progress:** M4 agent infrastructure, website migration, backoffice dashboard
- **Planned next:** Agent implementations under `agents/`, additional skills, executive/operations dashboards, appointment management agents (per `context/00_CONTEXT.md` roadmap)

Keep this file updated as work progresses.

---

### 3.2 Root agent instructions — `AGENTS.md`

Create `AGENTS.md` at the **repository root** (separate from per-app `AGENTS.md` files under `uis/*`).

#### Session startup — files the agent must read

At the start of each session, before writing code, the agent **must read** (in order):

1. `memory-bank/projectbrief.md`
2. `memory-bank/techContext.md`
3. `memory-bank/progress.md`
4. The relevant milestone context file for the task (`context/0N_CONTEXT.md`)
5. The relevant specs file if one exists (`0N_SPECS.md`)

If the task touches a specific UI app, also read that app's `README.md`.

#### Mandatory pre-commit workflow

Before every commit, the agent **must** complete these steps **in order** and only commit if all pass:

1. **Scope check** — Confirm changed files match the assigned task; no unrelated edits; no secrets (`.env.local`, credentials) staged
2. **Context alignment** — Verify HealthCore-specific names, field names, labels, and business rules match the applicable `context/0N_CONTEXT.md` (e.g. clinic names, form `name` attributes, denial/no-show thresholds)
3. **Quality gates** — Run applicable checks and fix failures:
   - Root: `npm run typecheck` and `npm test` when `src/` or `tests/` changed
   - UI apps: `npm run lint` and `npm run build` in the affected `uis/*` directory
4. **Memory bank update** — Update `memory-bank/progress.md` if the change materially advances milestone status, adds a new app, or changes architecture/decisions documented in `techContext.md`

Document these four steps explicitly in `AGENTS.md`.

#### Protected paths — do not modify without explicit developer confirmation

The agent **must not modify** the following without the developer explicitly approving in the current session:

| Path | Reason |
| --- | --- |
| `context/**` | Authoritative company scenario — assigned by programme |
| `milestones/**` | Milestone requirements — assigned by programme |
| `.github/**` | CI/CD and automation |
| `tests/utils/fixtures.ts` | Shared test data contract for M2 utilities |
| Any `.env`, `.env.local`, or secret/credential file | Security |
| Another developer's in-progress work on unrelated milestones | Scope control |

The agent **may** modify `memory-bank/`, `AGENTS.md`, `.agents/`, `skills/`, `uis/`, and `src/` when tasked — but must not rewrite M2 function signatures or entity interfaces in ways that break existing tests without explicit approval.

---

### 3.3 Development rules — `.agents/`

Create a `.agents/` folder at the repository root with at least **one** documented rule file.

Each rule file must include:

- **Rule name and purpose**
- **Scope** — one of: `always active`, `file-pattern based`, or `agent-requested`
- **Instructions** — concrete, actionable guidance

#### Required rule (minimum)

Create `.agents/healthcore-context.md` (or equivalent) with:

- **Scope:** `always active`
- **Purpose:** Ensure all generated code, copy, and data models reflect HealthCore's healthcare context
- **Instructions:** Use exact entity/field names from context files; never expose raw API values where UI labels are defined; treat billing/clinical/HR data as operationally critical; prefer importing existing utilities over duplicating logic

Optional additional rules (recommended):

- File-pattern rule for `uis/**/*.tsx` (React/Next conventions, loading/error states)
- File-pattern rule for `src/utils/**/*.ts` (pure functions, no mutation, typed returns)

---

### 3.4 Agent skill — `skills/`

Implement at least **one agent skill** for a recurring HealthCore workflow. Store it under `skills/` following the skill format used elsewhere in the monorepo (objective, when to use, inputs, steps, acceptance criteria).

#### Required skill: Monday Operations Brief

**Location:** `skills/monday-operations-brief/SKILL.md` (or equivalent)

| Item | Specification |
| --- | --- |
| **Objective** | Produce a structured operational summary for James Osei's Monday review using M2 utility functions — denial rates, no-show impact, and CME compliance risk |
| **When to use** | Developer or agent needs to validate M2 reporting output, prepare demo data for backoffice, or verify utilities against fixtures before a release |
| **Inputs** | `claims: Claim[]`, `appointments: Appointment[]`, `clinicians: Clinician[]`, `locations: ClinicLocation[]`, `asOfDate: string` (ISO date), optional `weekEndingDate: string` |
| **Steps** | Import from `src/utils` (not copy); run `calculateDenialRate`, `denialRateByPayer`, `flagHighDenialPayers`, `noShowRateByLocation`, `flagHighNoShowLocations`, `generateCMEReport`, `getCliniciansAtRisk`; format output as markdown sections per department (Billing, Clinical Ops, People) |
| **Acceptance criteria** | Output includes all three department sections; denial threshold default 8%; no-show threshold default 20%; CME lists clinicians with `at_risk` or `overdue`; no raw utility errors on valid fixture data from `tests/utils/fixtures.ts`; skill doc lists exact function imports and expected output headings |

---

## 4. Next.js + TypeScript Applications

### 4.1 General constraints

| Item | Value |
| --- | --- |
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | React hooks only — no Redux, Zustand, Jotai, etc. |
| Location | All new frontends under `uis/` |
| Legacy static site | Root `index.html` / `application.html` remain until migration is verified; do not delete without explicit approval |

Follow the same per-app structure established in `uis/talent-pipeline-tracker/`:

```text
uis/<app-name>/
├── app/              # Next.js routes
├── components/       # UI components
├── lib/              # Helpers, i18n, data loaders
├── public/           # Static assets
├── .env.example
├── README.md
└── package.json
```

Each app runs independently (`npm install` + `npm run dev` inside the app directory).

---

### 4.2 Public website — `uis/website/`

#### Purpose

Replace the Milestone 1 static site with a Next.js application for HealthCore's bilingual public presence (Priya Nair / Patient Experience).

#### Routes

| Route | Purpose | Source |
| --- | --- | --- |
| `/` | Landing page (all M1 sections) | `index.html` |
| `/application` | Patient enquiry form | `application.html` |

Language switching (EN / ES) must be supported app-wide — equivalent to M1 `language-toggle.js` behaviour. All user-facing strings, validation messages, and success copy must translate per `context/01_CONTEXT.md`.

#### Landing page sections (required, in order)

Migrate every section from M1 with reusable React components:

1. **Header** — logo/name, nav (Home, Services, Locations, Contact), language toggle
2. **Hero** — headline, subheadline, CTA to `/application` (exact copy from `context/01_CONTEXT.md`)
3. **Services** — three columns (Primary Care & Chronic Disease; Specialist Consultations; Preventive Health & Wellbeing)
4. **Why HealthCore** — four benefit bullets
5. **Locations** — US clinic table/grid (six clinics — exact names, phones, hours)
6. **Contact** — enquiry emails and phone numbers
7. **Footer** — copyright, social links

#### Patient enquiry form (`/application`)

- All fields, `name` attributes, validation rules, conditional fields, and error messages **exactly** as specified in `context/01_CONTEXT.md`
- Client-side validation before simulated submit (no backend required)
- Success message block after valid submit
- Partnership note visible (`partnerships@healthcore.com`)
- Live character counter on `health_concern`
- Conditional insurance fields and returning-patient `patient_id` field

#### Visual identity

Preserve Milestone 1 branding:

- Primary palette: teal / cyan / sky gradients (`teal-700`, `cyan-700`, `slate-900`)
- Typography: clean sans-serif, bold headings
- Responsive: mobile-first, breakpoints for tablet and desktop
- Accessibility: semantic HTML, ARIA where needed, alt text on images

#### SEO & structured data

- Page metadata (title, description) for EN and ES
- Schema.org `MedicalOrganization` JSON-LD on landing page
- `MedicalClinic` entries for each US location per `context/01_CONTEXT.md`

#### Assets

Migrate or reference logos, favicon, and images from `assets/` into `uis/website/public/`.

#### Code quality

- Reusable components (e.g. `SiteHeader`, `HeroSection`, `ServicesGrid`, `LocationsTable`, `ContactSection`, `SiteFooter`, `EnquiryForm`)
- Shared TypeScript types for form values and validation results
- Separate presentation from validation logic (`lib/validation.ts` or similar)

---

### 4.3 Internal backoffice — `uis/backoffice/`

#### Purpose

First internal HealthCore Digital dashboard shell surfacing Milestone 2 operational logic for Tom Callahan (Billing), Dr. Marcus Reid (Clinical Ops), and Diane Foster (People / CME).

#### Routes

| Route | Purpose |
| --- | --- |
| `/` | Entry view — welcome screen or empty dashboard layout with navigation to operational sections |

Additional section routes are optional in M4 but the dashboard **must** display M2 output on `/` or linked panels from `/`.

#### Layout

- **Separate layout** from `uis/website` — internal tool chrome (sidebar or top nav), not public marketing header
- Frame copy as HealthCore Digital internal operations tool
- Loading and error states for any async/data-driven section

#### Business logic integration (critical)

Import utilities from their **original monorepo location** — do **not** copy source into `uis/backoffice/`:

```typescript
// Example — configure tsconfig paths or relative import from monorepo root
import {
  calculateDenialRate,
  denialRateByPayer,
  denialRateByLocation,
  flagHighDenialPayers,
  noShowRateByLocation,
  flagHighNoShowLocations,
  generateCMEReport,
  getCliniciansAtRisk,
} from "../../../src/utils";
```

Recommended: add a `paths` alias in `uis/backoffice/tsconfig.json` (e.g. `@healthcore/utils` → `../../src/utils`).

Use sample data from `tests/utils/fixtures.ts` (or equivalent typed loaders) until live APIs exist.

#### UI must show M2 output (not console-only)

At minimum, render visible UI for:

| Section | Functions | Display |
| --- | --- | --- |
| **Billing** | `calculateDenialRate`, `denialRateByPayer`, `flagHighDenialPayers` | Overall denial %, per-payer rates, flagged payers above 8% |
| **Clinical Ops** | `noShowRateByLocation`, `flagHighNoShowLocations` | Per-location no-show rates, flagged locations above 20% |
| **People / CME** | `generateCMEReport`, `getCliniciansAtRisk` | Table or cards for at-risk/overdue clinicians with hours remaining and compliance status |

Raw function return values must not be the only output — present human-readable labels, units (`%`, hours), and HealthCore department headings.

---

## 5. Code Structure (Target)

```text
/
├── memory-bank/
│   ├── projectbrief.md
│   ├── techContext.md
│   └── progress.md
├── AGENTS.md
├── .agents/
│   └── healthcore-context.md
├── skills/
│   └── monday-operations-brief/
│       └── SKILL.md
├── src/                          # M2 — import from backoffice
│   ├── utils/
│   └── types.d.ts
├── uis/
│   ├── website/                  # M4 — public Next.js app
│   ├── backoffice/               # M4 — internal Next.js app
│   └── talent-pipeline-tracker/  # M3 — existing
├── index.html                    # Legacy M1 (keep until migration approved)
└── application.html
```

---

## 6. Acceptance Criteria

### Agent infrastructure

- [ ] `memory-bank/` exists with `projectbrief.md`, `techContext.md`, and `progress.md` containing HealthCore-specific content
- [ ] Root `AGENTS.md` lists mandatory session-read files, a 4-step ordered pre-commit workflow, and protected paths
- [ ] `.agents/` contains at least one rule with documented scope (`always active`, file-pattern, or agent-requested)
- [ ] At least one skill under `skills/` with objective, inputs, and verifiable acceptance criteria aligned with M2 utilities

### `uis/website`

- [ ] Next.js app runs with `npm run dev` from `uis/website/`
- [ ] `/` includes all M1 landing sections in order with correct HealthCore content
- [ ] `/application` includes all form fields and validations from `context/01_CONTEXT.md`
- [ ] EN/ES language switching works for all user-facing text
- [ ] Reusable React components with TypeScript typing
- [ ] Visual identity consistent with M1 (teal/cyan palette, responsive layout)
- [ ] Schema.org markup present on landing page

### `uis/backoffice`

- [ ] Next.js app runs with `npm run dev` from `uis/backoffice/`
- [ ] `/` shows a welcome or dashboard entry view with internal layout distinct from website
- [ ] M2 utilities imported from `src/utils/` — no copied duplicates
- [ ] Billing, Clinical Ops, and CME report output visible in the UI
- [ ] Loading/error states where data is loaded or computed

### Quality

- [ ] `npm run typecheck` passes at repo root when `src/` unchanged or updated consistently
- [ ] `npm test` passes when M2 utilities unchanged or updated consistently
- [ ] `npm run lint` and `npm run build` pass in each new/modified `uis/*` app
- [ ] No secrets committed; each app has `.env.example` if env vars are used

---

## 7. Out of Scope

- Backend API changes or new HealthCore central API
- Replacing or refactoring `uis/talent-pipeline-tracker/` (M3 complete)
- Deleting legacy root `index.html` / `application.html` without explicit developer approval
- External state management libraries
- Live EHR/billing system integrations (use fixtures/sample data)
- Full agent runtime implementations under `agents/` (infrastructure and skill only for this milestone)

---

## References

- `context/00_CONTEXT.md` — company overview and department problems
- `context/01_CONTEXT.md` — public website content, form spec, bilingual rules
- `context/02_CONTEXT.md` — entities, functions, thresholds, sample scenarios
- `context/03_CONTEXT.md` — talent pipeline tracker scenario
- `context/04_CONTEXT.md` — milestone 4 scope
- `SPECS.md` — Milestone 2 utility specifications
- `03_SPECS.md` — Milestone 3 talent tracker specifications
- `uis/talent-pipeline-tracker/` — reference Next.js app structure
