# Progress — HealthCore Digital

> **Last updated:** 2026-11-23
> This is a living log of what has been implemented, what is in flight, and sensible next steps.

---

## ✅ Completed

### Milestone 3 — Talent Pipeline Tracker (UI)

- [x] Candidate list view with name, position, status, and stage columns
- [x] Filter by status and stage; search by name/email (client-side, no reload)
- [x] Candidate detail view at `[id]` route
- [x] Status and stage update from detail view
- [x] Add and remove internal notes per candidate
- [x] Registration form for new candidates (referrals, corrections)
- [x] Human-readable labels for all status and stage values (raw API values never shown)
- [x] Mock API integration via shared backend endpoint

### Milestone 4 — AI-driven Engineering (agent infrastructure)

- [x] `BRIEFING.md` — full HealthCore company briefing from syllabus general contexts
- [x] `memory-bank/projectbrief.md` — business goals, KPIs, data model tied to HealthCore BRIEFING
- [x] `memory-bank/techContext.md` — stack, architectural decisions, folder conventions, constraints
- [x] `memory-bank/progress.md` — this log
- [x] `AGENTS.md` — session-start protocol, pre-commit workflow (≥4 steps), protected areas, references `BRIEFING.md`
- [x] `.agents/rules/` — at least one scoped, actionable rule file
- [x] `.agents/skills/` — at least one skill with objective, documented inputs, verifiable acceptance criteria
- [x] Folder mapping documented in `techContext.md` (where `/uis/website`, `/uis/backoffice`, `/services` go)

---

## 🚧 In Flight

- (None currently — Milestone 4 is governance artifacts only)

---

## 🔜 Next Steps

- [ ] **Milestone 5 — Backend**: Build central API for HealthCore locations, menus, sales, etc.
- [ ] **Milestone 6 — Telemetry**: Data pipeline and dashboards for operational metrics.
- [ ] **Milestone 7 — RAG & Memory**: Semantic knowledge base and search over clinical/operational docs.
- [ ] **Milestone 8 — Agents**: Support, onboarding, and training agents for HealthCore staff.
- [ ] **Milestone 9 — Workflows**: n8n automations for recruitment and clinic operations.
- [ ] **Milestone 10 — Real-time**: Live dashboards, alerts, streaming for clinic monitoring.

---

## Known Decisions Log

| Date       | Decision                                                                   | Rationale                                                                                                                    |
| ---------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-23 | Created `feature/agent-memory-bank` branch for Milestone 4                 | Milestone 4 builds governance artifacts; no app scaffolding needed                                                           |
| 2026-11-23 | Memory bank reflects HealthCore Digital (HealthCore outpatient healthcare) | Assigned company from CONTEXT.md                                                                                             |
| 2026-11-23 | `.agents/rules/` uses `healthcore-conventions.md` as the first rule        | Covers naming, import paths, status/stage label requirement — concrete and actionable                                        |
| 2026-11-23 | Skill: `memory-bank-update` created                                        | Common recurring task; criteria are fully verifiable without subjective judgment                                             |
| 2026-11-23 | Created `BRIEFING.md` at repo root from HealthCore general context         | Canonical company briefing from syllabus `00-general-contexts/` — identity, departments, problems, and why choose HealthCore |
