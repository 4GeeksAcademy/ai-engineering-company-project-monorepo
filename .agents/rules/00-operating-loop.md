# Operating loop

**Scope:** Always active. Read before any edit in this monorepo.

**Rationale:** Domain facts live in root [`CONTEXT.md`](../../CONTEXT.md) (Brasaland briefing). Ignoring it produces a generic template company, the wrong currencies, or TrackFlow/Nexova/HealthCore assumptions.

## Guidance

1. Read root `AGENTS.md`, then **`CONTEXT.md` in full** (or at least the department section you will touch). Confirm the company is Brasaland — grilled food, 14 locations, Colombia + Florida.
2. Read `memory-bank/README.md` → `Projectbrief.md` → `Techcontext.md` → `Progress.md`. Those files must cite `CONTEXT.md`; if they disagree with `CONTEXT.md`, trust `CONTEXT.md` and fix the memory bank.
3. Prefer `.agents/skills/verify-brasaland-api` (or another skill under `.agents/skills/`) over inventing a workflow.
4. After a verified change, update `memory-bank/Progress.md` against the matching `CONTEXT.md` department need.
5. If code and `CONTEXT.md` disagree on domain (currencies, location count, product names), fix the code or record the gap — do not silently invent a different restaurant chain.

## Map work to `CONTEXT.md` departments

| If you touch… | `CONTEXT.md` owner / need |
| --- | --- |
| Location sales, stockouts, ingredient orders | Restaurant Operations — Felipe Guerrero (COP **and** USD) |
| Suppliers, purchase prices, consolidated spend | Procurement — Lucía Fernández (~20 suppliers, two markets) |
| Loyalty “Brasa Points”, CRM, public site | Marketing — Camila Ospina |
| HR portal, turnover by country | People — Ashley Turner |
| Recipes, training push to 14 kitchens | Training — Jake Morrison |
| Routers for locations / menus / sales / customers / suppliers; telemetry; pipelines | Technology — Nicolás Park |
| Chain sales USD+COP, NL assistant, Monday 07:00 report | Executive — Mariana Restrepo |

## Placement (monorepo)

| Files | Prefer |
| --- | --- |
| `services/**`, `api/**` | Skill `verify-brasaland-api` before claiming Technology’s central API |
| `uis/**` | Public corporate site → `uis/website/`; internal → `uis/backoffice/`; `uis/web/` is incident HTML only |
| `data/pipelines/**` | Must serve ops/finance questions for the 14 locations (`PIPELINE_DESIGN.md` + Executive/Operations needs) |
| `agents/**`, `agent.py` | Manual Groq loop; serves assistant-style work for staff/Mariana — no LangChain stack |

## Non-negotiables (from `CONTEXT.md` + repo)

- Company is **Brasaland** only. Never substitute another briefing company.
- Money and sales views: support **COP and USD** when the feature is financial.
- Scale: **14** company-owned locations across **two countries**.
- Technology target API nouns: **locations, menus, sales, customers, suppliers**.
- Loyalty product name is **Brasa Points** (today: physical stamp cards — do not claim a digital program exists until built).
- Do not create a new top-level app folder; do not commit secrets.
