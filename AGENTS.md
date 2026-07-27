# HealthCore Monorepo — Agent Instructions

Guidance for AI agents working in this repository.

---

## Session startup — required reading

Before writing code, read these files **in order**:

1. `memory-bank/projectbrief.md`
2. `memory-bank/techContext.md`
3. `memory-bank/progress.md`
4. The milestone context for your task: `context/0N_CONTEXT.md`
5. The milestone specs if present: `0N_SPECS.md` (e.g. `04_SPECS.md`)

If the task touches a specific UI app, also read that app's `README.md`.

---

## Mandatory pre-commit workflow

Complete these steps **in order** before every commit. Do not commit if any step fails.

### 1. Scope check

- Changed files match the assigned task only
- No unrelated refactors or drive-by edits
- No secrets staged (`.env.local`, credentials, private keys)

### 2. Context alignment

- HealthCore names, clinic names, form field `name` attributes, and business thresholds match the applicable `context/0N_CONTEXT.md`
- UI labels used instead of raw API/domain values where mappings exist
- Billing denial threshold default: **8%**; no-show threshold default: **20%**

### 3. Quality gates

Run applicable checks and fix all failures:

| Changed area | Commands |
| --- | --- |
| `src/` or `tests/` | `npm run typecheck` and `npm test` (repo root) |
| `uis/website/` | `npm run lint` and `npm run build` in that directory |
| `uis/backoffice/` | `npm run lint` and `npm run build` in that directory |
| `uis/talent-pipeline-tracker/` | `npm run lint` and `npm run build` in that directory |

### 4. Memory bank update

Update `memory-bank/progress.md` when the change:

- Completes or starts a milestone deliverable
- Adds a new app or major architectural decision
- Changes documented commands or path aliases in `techContext.md`

---

## Protected paths — do not modify without explicit developer confirmation

| Path | Reason |
| --- | --- |
| `context/**` | Authoritative company scenario |
| `milestones/**` | Programme requirements |
| `.github/**` | CI/CD configuration |
| `tests/utils/fixtures.ts` | Shared M2 test data contract |
| `.env`, `.env.local`, credentials | Security |
| Unrelated milestone work in progress | Scope control |

You **may** edit `memory-bank/`, `AGENTS.md`, `.agents/`, `skills/`, `uis/`, and `src/` when tasked — but do not change M2 public function signatures in ways that break tests without approval.

---

## HealthCore-specific reminders

- Tools that fail silently are not acceptable in clinical/operational contexts
- Prefer importing from `src/utils` over duplicating business logic
- Separate public (`uis/website`) and internal (`uis/backoffice`, `uis/talent-pipeline-tracker`) layouts
