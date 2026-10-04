# AGENTS — Monorepo Operating Protocol

This file defines how any coding agent must operate in this repository.

## Mandatory Startup Read (Every Session)
Before writing or modifying code, the agent must read, in order:
1. `CONTEXT.md`
2. `memory-bank/projectbrief.md`
3. `memory-bank/techContext.md`
4. `memory-bank/progress.md`

If any of these files are missing or outdated, the agent must update them first.

## Required Pre-Commit Flow (Do Not Skip)
1. **Context sync**: confirm business and technical assumptions against `CONTEXT.md` and memory-bank.
2. **Scope check**: list impacted folders/files and verify changes are in the correct monorepo domain (`uis`, `services`, `data`, etc.).
3. **Validation run**: run project-relevant checks (build/lint/tests) and collect outputs.
4. **Memory update**: update `memory-bank/progress.md` with what changed and what is next.
5. **Delivery check**: ensure no business-logic duplication, no protected-file edits without approval, and document verification evidence.

## Protected Paths (Require Explicit Developer Confirmation)
The agent must not modify these paths without explicit approval in the active session:
- `.git/`
- `infra/`
- `internal/`
- `data/raw/`
- `packages/shared/package.json`
- Any file containing production credentials or secrets

## Placement Rules
- Public UI: `uis/website`
- Internal UI: `uis/backoffice`
- APIs/workers: `services/`
- Shared domain logic/contracts: shared canonical module (import, do not duplicate)

## Stop-and-Ask Conditions
The agent must pause and ask for confirmation when:
- A task requires changing protected paths.
- Requirements conflict with `CONTEXT.md` constraints.
- The requested change would duplicate existing business logic.
- Validation fails and there are multiple acceptable remediation paths.
