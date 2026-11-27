# AGENTS.md — AI Agent Protocol

This file defines how AI agents should operate in the HealthCore Digital monorepo. Agents **must** read this file at the start of every session.

---

## 1. Session Start — Mandatory Reads

Before making any edits, the agent **must** read the following files in order:

| #   | File                          | Purpose                                                                                |
| --- | ----------------------------- | -------------------------------------------------------------------------------------- |
| 1   | `AGENTS.md`                   | This file — agent protocol, workflow, and protected areas                              |
| 2   | `healthcore-BRIEFING.en.md`   | Canonical company briefing — HealthCore identity, departments, constraints, leadership |
| 3   | `CONTEXT.md`                  | Milestone-specific context — HealthCore domain, field names, AC                        |
| 4   | `memory-bank/projectbrief.md` | Business goals, KPIs, data model (status/stage values)                                 |
| 5   | `memory-bank/techContext.md`  | Stack, architecture decisions, folder conventions, constraints                         |
| 6   | `memory-bank/progress.md`     | Current project status — what is done, in flight, planned next                         |

If any file is missing or empty, the agent must flag it to the human before proceeding.

---

## 2. Pre-Commit Workflow

Before staging and committing any change, the agent **must** execute the following steps **in order**:

1. **Run formatter** — Ensure all changed `.ts`, `.tsx`, `.py`, `.json`, and `.md` files are properly formatted. If no formatter is configured, flag it to the human (do not add one without confirmation).
2. **Run type-check and lint** — Execute `tsc --noEmit` in the relevant app directory (e.g., `uis/talent-pipeline-tracker/`) to catch type errors. If a linter config exists, run it. Address any errors.
3. **Update `memory-bank/progress.md`** — If the change introduces a new feature, modifies behavior, or fixes a bug, update the progress log under the appropriate section. Otherwise skip with a note.
4. **Self-review diff scope** — Review all changed files with `git diff --stat` and verify:
   - [ ] No protected paths are modified (see §3 below).
   - [ ] No debug code, `console.log`, or commented-out blocks remain.
   - [ ] Raw API values (`in_progress`, `personal_interview`, etc.) are never rendered to the user.
   - [ ] The change is limited to the scope requested — no unrelated refactors or renames.

---

## 3. Protected Areas

The following paths **must not** be modified without **explicit human confirmation**:

| Path                                         | Reason                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `.gitignore`                                 | Generated lockfile patterns; changing could commit unwanted files         |
| `.vscode/tasks.json`                         | Task runner config — only the human or a scaffold script should update it |
| `uis/talent-pipeline-tracker/package.json`   | Dependencies — installing, updating, or removing packages                 |
| `uis/talent-pipeline-tracker/next.config.js` | Build configuration — changing could break the build                      |
| `packages/shared-types/index.ts`             | Shared types — changes cascade to all apps and services                   |
| `healthcore-BRIEFING.en.md`                  | Full company briefing — only the human should update company context      |
| `CONTEXT.md`                                 | Milestone context — only the human should update domain context           |
| Any `node_modules/` or lockfiles             | Never committed to the repository                                         |

> **Exception**: If a task explicitly instructs the agent to modify one of these paths, the agent may proceed after re-confirming with the human.

---

## 4. Skills Index

The following agent skills are available in this repository:

| Skill                | Location                                     | When to use                                                                                       |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `memory-bank-update` | `.agents/skills/memory-bank-update/SKILL.md` | After completing a milestone feature, update the living progress log in `memory-bank/progress.md` |

Additional skills may be added under `.agents/skills/<skill-name>/SKILL.md`.

---

## 5. Repository Conventions

- **Branch naming**: Milestone branches follow `feature/<milestone-name>` (e.g., `feature/agent-memory-bank`).
- **Commit messages**: Use conventional commits — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- **Code ownership**: Frontend code goes under `/uis/`, backend under `/services/`, shared types under `/packages/shared-types/`.
- **Human-readable labels**: Raw API enum values must be mapped to display labels before rendering. No exceptions.
