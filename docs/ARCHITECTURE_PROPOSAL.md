# HealthCore Digital — Backend Architecture Proposal

**Author:** HealthCore Digital Team  
**Company:** HealthCore — 12-clinic outpatient network (US + UK)  
**Status:** Proposal (documentation deliverable — no implementation required)  
**Related context:** `context/00_CONTEXT.md`, `memory-bank/projectbrief.md`

---

## 1. Executive summary

HealthCore Digital needs a backend that can gradually replace a patchwork of legacy systems (dual EHR platforms, separate US/UK billing tools, phone-based scheduling) without overwhelming a **six-person engineering team**. The proposed approach is a **domain-modular monolith** built with **FastAPI**, organised using **layered architecture** principles inside each domain module.

This is not a generic “we like FastAPI” choice. It follows directly from HealthCore’s constraints: regulated PHI handling under **HIPAA** and **UK GDPR**, multiple departmental bounded contexts (clinical ops, patient access, billing, workforce, compliance), and the existing **monorepo** that already separates frontends under `uis/` while sharing TypeScript business logic in `src/utils/`.

---

## 2. Company characteristics that drive the decision

| HealthCore reality | Architectural consequence |
| --- | --- |
| 12 clinics, 2 countries, 2 EHR systems that do not interoperate | Need an **integration/adapters layer**, not business logic scattered inside route handlers |
| 14% US claims denial rate; 22% no-show rate — operational KPIs are board-level | Domains must expose **stable API contracts** for dashboards (`uis/backoffice`, future executive views) |
| HIPAA + UK GDPR; Claire Whitfield’s compliance authority | **Strict boundary** between PHI storage, audit logging, and public-facing endpoints |
| James Osei’s team: ~6 engineers | **Avoid microservices sprawl** early; one deployable API with clear module seams |
| Bilingual patient population (EN/ES) in US markets | Patient-facing APIs must support **locale-aware responses**, separate from internal ops APIs |
| Existing monorepo: `uis/website`, `uis/backoffice`, `uis/talent-pipeline-tracker`, `src/utils` | Keep **frontend/backend separation** inside the monorepo; backend lives under `services/` |

---

## 3. Recommended pattern: layered architecture within a domain-modular monolith

### 3.1 Pattern selected

**Primary pattern:** **Layered architecture** (presentation → application → domain → infrastructure), applied **per domain module** inside a single FastAPI service (`services/healthcore-api/`).

**Secondary influences:**

- **Domain-Driven Design (lite):** folder boundaries align with HealthCore departments / bounded contexts, not with technical tiers alone.
- **Ports and adapters (hexagonal):** EHR, payer, and notification systems are accessed only through adapter interfaces — critical because US and UK source systems differ.

### 3.2 Patterns considered and rejected (for now)

| Pattern | Why it was not chosen as the primary approach |
| --- | --- |
| **Classic MVC** | MVC maps cleanly to server-rendered apps; HealthCore frontends are **separate Next.js SPAs** (`uis/*`). Controllers would duplicate concerns already handled by React. MVC does not give explicit guidance for EHR adapters or compliance audit trails. |
| **Microservices / full serverless** | A 6-person team cannot operate 8+ independently deployed services with separate observability, secret rotation, and cross-service PHI tracing. HealthCore’s first goal is a **unified data layer** (James Osei’s stated need), not maximum isolation. Serverless may appear later for **async jobs** (reminder dispatch, report generation), not as the core API shape. |
| **Pure event-driven architecture** | Valuable long-term for appointment reminders and claim status updates, but premature as the *organising* pattern before a stable domain model and audit strategy exist. Events would be introduced **inside** the monolith first (internal pub/sub or task queue), then extracted if needed. |

### 3.3 Justification in HealthCore terms

1. **Layered architecture matches the compliance story.** Claire Whitfield needs to know *where* PHI enters the system, *who* can access it, and *what* leaves to third parties. Layers make that visible: routers never talk directly to EHR SDKs; they go through application services and audited adapters.

2. **Domain modules match how the business is already organised.** Tom Callahan (billing), Priya Nair (patient access), Dr. Marcus Reid (clinical ops), and Diane Foster (workforce) already think in separate problem spaces. Backend structure should mirror that so a billing fix does not require navigating appointment code.

3. **A modular monolith matches team size and delivery speed.** HealthCore Digital must ship incremental value (public enquiry capture, ops dashboards, recruitment tracker) without a “big bang” platform rewrite. One FastAPI codebase deploys once, shares database migrations and auth, but modules enforce boundaries.

4. **It extends the monorepo direction already taken.** Milestone 2 utilities (`src/utils/`) encode billing, no-show, and CME logic in TypeScript. The FastAPI backend will eventually **own authoritative data and mutations**; until then, layers allow parallel work — frontends consume mock or playground APIs while domain services are filled in behind stable routes.

---

## 4. Influence of standard FastAPI project structure

FastAPI community conventions (official docs, `full-stack-fastapi-template`, Tiangolo’s larger-project guidance) typically organise code as:

```text
app/
├── main.py              # FastAPI app factory, lifespan, middleware
├── api/
│   └── v1/
│       ├── api.py       # Aggregates routers
│       └── endpoints/   # Route modules (often one file per resource)
├── core/
│   ├── config.py        # Settings via pydantic-settings
│   └── security.py      # Auth dependencies
├── models/              # DB / ORM models
├── schemas/             # Pydantic request/response DTOs
├── crud/ or repositories/
├── services/            # Business logic
└── db/
    ├── base.py
    └── session.py
```

**How this influences HealthCore’s proposal:**

| FastAPI convention | HealthCore adaptation |
| --- | --- |
| `api/v1/endpoints/` split by resource | Becomes `api/v1/routers/<domain>/` split by **bounded context** (billing, clinical, workforce), because a single “claims” router would hide payer/location rules Tom’s team cares about |
| `schemas/` separate from `models/` | **Mandatory** — internal ORM models must never leak PHI fields to public patient responses; enquiry forms expose only what Priya’s `context/01_CONTEXT.md` specifies |
| `core/config.py` with environment variables | Extended with **jurisdiction flags** (`DATA_REGION=us\|uk`), separate DSNs or schema prefixes where GDPR data residency applies |
| Dependency injection via `Depends()` | Used for **auth scope** (public vs staff vs compliance officer) and **audit context** (who accessed which patient record) |
| Single `main.py` mounting routers | One `/api/v1` tree, but each domain router registers independently so modules can later become services if team grows |

We adopt FastAPI’s **router + schema + service** separation, but replace a flat `endpoints/` list with **domain-first packaging** under `services/healthcore-api/app/domains/`.

---

## 5. Proposed backend location and folder structure

Backend service root: **`services/healthcore-api/`** (one primary API service in the monorepo’s `services/` folder, per `services/README.md`).

```text
services/healthcore-api/
├── README.md
├── pyproject.toml / requirements.txt
├── alembic/                    # DB migrations (shared platform DB)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── compliance/             # PHI access, audit trail assertions
└── app/
    ├── main.py                   # App entry, CORS, middleware, router mount
    ├── core/
    │   ├── config.py             # Env-based settings
    │   ├── security.py           # JWT/API keys, role scopes
    │   ├── logging.py            # Structured logs (no PHI in message body)
    │   └── exceptions.py         # HTTP error mapping
    ├── api/
    │   └── v1/
    │       ├── router.py           # Includes all domain routers
    │       └── deps.py             # Shared Depends (current user, db session)
    ├── domains/                  # ← Primary separation criterion: business capability
    │   ├── patient_access/       # Priya Nair — enquiries, booking, reminders
    │   │   ├── router.py
    │   │   ├── schemas.py
    │   │   ├── service.py        # Application layer
    │   │   ├── models.py         # Domain persistence
    │   │   └── policies.py       # Validation rules (e.g. enquiry fields)
    │   ├── clinical/             # Marcus Reid — appointments, schedules, no-shows
    │   ├── billing/              # Tom Callahan — claims, denials, payers
    │   ├── workforce/            # Diane Foster — CME, recruitment records
    │   ├── compliance/           # Claire Whitfield — audit, DSAR, access logs
    │   └── executive/            # Sandra Okonkwo — read-only KPI aggregates
    ├── integrations/             # ← Secondary criterion: external system adapters
    │   ├── ehr_us/
    │   ├── ehr_uk/
    │   ├── payers_us/
    │   ├── notifications/        # SMS, email providers
    │   └── interfaces.py         # Ports (abstract base classes)
    ├── shared/
    │   ├── pagination.py
    │   ├── locale.py             # EN/ES formatting helpers
    │   └── identifiers.py        # HC- patient ID, CLM- claim ID formats
    └── db/
        ├── session.py
        └── base.py
```

### 5.1 Separation criteria (explicit)

| Criterion | What it separates | HealthCore example |
| --- | --- | --- |
| **Domain (bounded context)** | Business rules and API surface by stakeholder problem | Billing denial logic never lives in `patient_access/` |
| **Layer (horizontal)** | HTTP vs application vs persistence vs external IO | Routers do not call EHR APIs directly |
| **Integration adapter** | Third-party volatility isolated from domain | US EHR swap affects `integrations/ehr_us/` only |
| **Shared kernel** | Cross-cutting, non-domain utilities | ID formats, pagination, i18n — not claim validation |
| **Compliance cross-cut** | Audit and PHI policy enforced uniformly | Middleware + `compliance/` domain owns access logs |

### 5.2 Relationship to existing monorepo folders

| Monorepo path | Role after backend introduction |
| --- | --- |
| `uis/website/` | Public Next.js app — calls **patient_access** routes only (no staff PHI) |
| `uis/backoffice/` | Internal dashboard — calls **billing**, **clinical**, **workforce** routes |
| `uis/talent-pipeline-tracker/` | Already uses external tracker API; later migrates to **workforce** domain or stays on programme mock until unified |
| `src/utils/` (TypeScript) | Reference business rules during migration; long-term, Python domain services become source of truth for server-side calculations |
| `agents/` | Future consumers of internal APIs + integration ports (reminder agent → `notifications` adapter) |

---

## 6. FastAPI routers and endpoints by domain

Version prefix: **`/api/v1`**. Grouping rule: **one router package per domain**, sub-routes by **aggregate root** (the main business noun), not by HTTP verb.

### 6.1 Patient Access (`patient_access`) — public + authenticated patient flows

**Owner:** Priya Nair · **Audience:** Public website, future patient portal  
**Grouping:** Enquiry capture vs appointment self-service vs communications preferences

| Route group | Example routes | Purpose |
| --- | --- | --- |
| Enquiries | `POST /patient-access/enquiries` | Submit structured enquiry from `uis/website/application` (replaces client-only validation) |
| Enquiries | `GET /patient-access/enquiries/{id}` (staff) | Front desk follow-up queue |
| Booking | `GET /patient-access/locations` | Clinic list, hours — mirrors public site data |
| Booking | `POST /patient-access/appointment-requests` | Patient-requested slots (not instant confirm until EHR sync) |
| Reminders | `POST /patient-access/reminder-preferences` | Channel opt-in (SMS/email) — GDPR/HIPAA consent tracked |
| Reminders | `GET /patient-access/reminders/preview` (internal) | Dry-run reminder content before send |

**Criteria:** No clinical diagnosis data; minimal PHI; bilingual error messages; rate-limited public POST endpoints.

### 6.2 Clinical Operations (`clinical`) — staff-only

**Owner:** Dr. Marcus Reid · **Audience:** Backoffice, clinic ops tools

| Route group | Example routes | Purpose |
| --- | --- | --- |
| Appointments | `GET /clinical/appointments` | Filter by location, date, status (feeds no-show dashboards) |
| Appointments | `PATCH /clinical/appointments/{id}/status` | Mark completed, no-show, cancelled — syncs to EHR adapter |
| Schedules | `GET /clinical/locations/{id}/capacity` | Slot availability abstracted from US/UK EHR differences |
| Metrics | `GET /clinical/metrics/no-show-rates` | Location-level aggregates (backoffice clinical panel) |

**Criteria:** Requires staff auth; all reads/writes emit audit events to `compliance`.

### 6.3 Revenue Cycle & Billing (`billing`)

**Owner:** Tom Callahan · **Audience:** Backoffice billing views, future claims assist agents

| Route group | Example routes | Purpose |
| --- | --- | --- |
| Claims | `GET /billing/claims` | Filter by payer, location, status |
| Claims | `POST /billing/claims` | Create/submit claim — validation before payer export |
| Claims | `PATCH /billing/claims/{id}` | Status transitions (denied, appealed, resubmitted) |
| Analytics | `GET /billing/metrics/denial-rates` | Overall and by-payer (maps to M2 `denialRateByPayer`) |
| Analytics | `GET /billing/metrics/flagged-payers` | Payers above 8% threshold |

**Criteria:** US payer rules isolated in service layer; UK private/NHS billing as sub-module or strategy pattern — reflects Tom’s dual revenue streams.

### 6.4 Workforce (`workforce`)

**Owner:** Diane Foster · **Audience:** HR portal, talent tracker, compliance

| Route group | Example routes | Purpose |
| --- | --- | --- |
| Clinicians | `GET /workforce/clinicians` | Roster with location assignment |
| CME | `GET /workforce/cme/reports` | Compliance status per clinician (maps to M2 `generateCMEReport`) |
| CME | `GET /workforce/cme/at-risk` | At-risk / overdue clinicians |
| Recruitment | `GET /workforce/recruitment/records` | Candidate pipeline (aligns with talent tracker) |
| Recruitment | `POST /workforce/recruitment/records` | Register candidate |
| Notes | `GET/POST/DELETE /workforce/recruitment/records/{id}/notes` | Internal notes on candidates |

**Criteria:** Recruitment data is HR-confidential, separate from patient PHI routes — different auth scopes.

### 6.5 Compliance & Data Governance (`compliance`)

**Owner:** Claire Whitfield · **Audience:** Compliance officers, automated audits

| Route group | Example routes | Purpose |
| --- | --- | --- |
| Audit | `GET /compliance/audit-events` | Who accessed what patient record, when |
| DSAR | `POST /compliance/data-subject-requests` | GDPR/HIPAA patient data export workflow |
| Policies | `GET /compliance/access-policies` | Role-to-resource matrix (read-only for apps) |

**Criteria:** Append-only audit storage; no deletion endpoints without compliance review.

### 6.6 Executive (`executive`) — read-only aggregates

**Owner:** Dr. Okonkwo · **Audience:** Executive dashboard, Monday morning reports

| Route group | Example routes | Purpose |
| --- | --- | --- |
| KPIs | `GET /executive/kpis/network-summary` | No-show rate, denial rate, booking volume — single JSON for dashboard |
| Reports | `GET /executive/reports/weekly` | Pre-computed cross-domain summary |

**Criteria:** Read-only; heavy caching; never exposes row-level PHI to executive UI — aggregates only.

### 6.7 Internal integration (not public HTTP)

**Grouping:** Webhooks and sync jobs under `integrations/`, optionally exposed as internal routes (`/internal/sync/ehr-us`) protected by service credentials — not mounted on public ingress.

---

## 7. Frontend / backend organisation in a monorepo

HealthCore already uses a **monorepo with physically separate frontends** (`uis/*`) and shared documentation (`docs/`, `memory-bank/`). The backend proposal **extends** this model rather than splitting repositories.

### 7.1 Repository layout choice: monorepo (recommended)

| Approach | Fit for HealthCore |
| --- | --- |
| **Monorepo (keep)** | Single PR can update API schema + `uis/backoffice` consumer; James Osei’s small team avoids cross-repo versioning drift; shared `context/` and compliance docs |
| **Separate repos** | Would multiply CI/CD and secret management overhead without staffing to match |

Backend code lives in `services/healthcore-api/`; frontends remain in `uis/`. This matches how programme templates describe `services/` vs `uis/`.

### 7.2 API communication

| Concern | Proposal |
| --- | --- |
| Protocol | REST JSON over HTTPS; OpenAPI spec auto-generated by FastAPI at `/api/v1/openapi.json` |
| Client pattern | Each Next.js app uses a thin `lib/api/` client (already established in `uis/talent-pipeline-tracker/`) |
| Versioning | URL prefix `/api/v1`; breaking changes require `/api/v2`, not silent field removal |
| Auth | Public routes (enquiry submit) use API keys or anonymous rate limits; staff routes use JWT from internal IdP (future) or programme auth provider |
| Error shape | Consistent `{ "detail": "...", "code": "..." }` — bilingual messages for patient-facing routes only |

### 7.3 Environment variables

| Variable (example) | Consumed by | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `uis/*` frontends | Base URL for browser/server fetch |
| `DATABASE_URL` | `services/healthcore-api` | PostgreSQL — platform DB |
| `EHR_US_BASE_URL`, `EHR_US_CLIENT_SECRET` | integrations adapter | US clinic system |
| `EHR_UK_*` | integrations adapter | UK clinic system |
| `CORS_ORIGINS` | FastAPI middleware | Allowed Next.js dev/prod origins |
| `DATA_REGION_DEFAULT` | domain services | Jurisdiction-aware handling |
| `LOG_LEVEL`, `SENTRY_DSN` | core | Observability without PHI in logs |

Frontends **never** receive EHR or payer secrets — only the backend `core/config.py` loads integration credentials.

### 7.4 CORS

FastAPI `CORSMiddleware` configured explicitly:

- **Development:** `http://localhost:3000` (website), `3001` (backoffice), `3002` (tracker), `4173` (dev hub)
- **Production:** exact HealthCore deploy origins (e.g. `https://www.healthcore.com`, internal VPN host for backoffice)
- **Never** `*` with credentials for staff routes handling PHI

Public enquiry POST may use a narrower CORS policy (website origin only) than staff dashboards.

---

## 8. Risks and points of attention

### 8.1 PHI leakage across domain boundaries

**Risk:** If developers place patient identifiers in executive KPI queries, log statements, or recruitment modules “for convenience,” HealthCore violates HIPAA/GDPR and Claire Whitfield’s audit requirements.

**Mitigation:** Enforce domain packages; code review checklist; schemas that **exclude** PHI by default; structured logging rules in `core/logging.py`; compliance audit on every `clinical` and `billing` read.

**If ignored:** Regulatory incident, loss of patient trust, possible fines — unacceptable in healthcare.

### 8.2 “Big ball of mud” monolith despite folder structure

**Risk:** With only six engineers under deadline pressure, routers call SQL directly, US and UK EHR logic duplicates across modules, and TypeScript utilities in `src/utils/` diverge from Python domain services — recreating the legacy patchwork HealthCore is trying to escape.

**Mitigation:** Strict layer rules (router → service → repository/adapter only); lint/import boundaries between domains; migrate M2 calculations into `billing/` and `clinical/` services with shared test fixtures; treat `integrations/` as the **only** EHR touchpoint.

**If ignored:** Every change breaks unrelated departments; Tom’s denial metrics and Marcus’s no-show metrics disagree; Dr. Okonkwo’s dashboard becomes as unreliable as today’s phone-call reporting.

### 8.3 Additional attention: integration adapter neglect

**Risk:** Hard-coding EHR field names inside `clinical/service.py` couples HealthCore to vendors and blocks the unified patient record James Osei needs.

**Mitigation:** All external IO through `integrations/interfaces.py`; adapter tests with recorded fixtures; domain models use HealthCore canonical types (`Claim`, `Appointment`, `Clinician` — already defined in M2 context).

### 8.4 Additional attention: frontend/backend contract drift

**Risk:** `uis/website` form field names (`context/01_CONTEXT.md`) change without API schema updates, or backoffice assumes M2 fixture shapes forever while API returns different pagination.

**Mitigation:** OpenAPI-driven TypeScript client generation in CI; contract tests; `.env.example` in each app documenting `NEXT_PUBLIC_API_URL`.

---

## 9. Phased adoption (recommended sequence)

1. **Phase 1 — Platform shell:** `services/healthcore-api` with `core/`, health check, CORS, `/api/v1` router aggregation, compliance audit middleware stub.
2. **Phase 2 — Workforce recruitment:** Migrate talent tracker from programme mock API to `workforce/recruitment` routes (Diane Foster — already has UI).
3. **Phase 3 — Operational metrics:** Expose billing and clinical read models backing `uis/backoffice` (Tom + Marcus).
4. **Phase 4 — Patient access:** Persist enquiries from `uis/website/application` (Priya).
5. **Phase 5 — Integrations:** EHR adapters, reminder agent hooks (`agents/`), executive KPI layer.

This sequence delivers visible value per stakeholder while keeping architecture stable.

---

## 10. References

- FastAPI project layout: [https://fastapi.tiangolo.com/tutorial/bigger-applications/](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- FastAPI settings management: [https://fastapi.tiangolo.com/advanced/settings/](https://fastapi.tiangolo.com/advanced/settings/)
- HealthCore company context: `context/00_CONTEXT.md`
- Monorepo conventions: `memory-bank/techContext.md`, `services/README.md`, `uis/README.md`
- Milestone 2 domain types (canonical models): `context/02_CONTEXT.md`, `SPECS.md`

---

_Internal document — HealthCore Digital · 4Geeks Academy AI Engineering Track_
