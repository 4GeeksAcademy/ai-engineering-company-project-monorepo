# AGENTS Operational Contract

This file defines mandatory agent behavior for this monorepo.

## 1) Required memory-bank read order at session start

Before analysis or code changes, every agent must read these files in order:
1. `memory-bank/projectbrief.md`
2. `memory-bank/techContext.md`
3. `memory-bank/progress.md`

If one of these files is missing or stale, the agent must report it before implementing changes.

## 2) Mandatory workflow before each commit

Every commit must follow these explicit ordered steps:
1. Re-read `CONTEXT.md` plus any scoped context file for the area being modified (for example `scripts/context.md` or `uis/**/context.md`).
2. Re-check impacted requirements in the relevant README or milestone checklist for that folder.
3. Run targeted validation for changed scope (lint/build/tests where available) and capture the result.
4. Update `memory-bank/progress.md` with what changed, what was validated, and remaining risks.
5. Confirm no protected path (section 3) was modified without explicit developer approval.
6. Only then stage and commit.

## 3) Protected paths requiring explicit developer confirmation

Agents must not modify these files/folders without explicit developer confirmation in the current session:
1. `CONTEXT.md`
2. `company-choice.md`
3. `data/raw/**`
4. `infra/**`
5. `internal/**`
6. `mcps/**`
7. Any `.env` file (`**/.env`, `**/.env.*` except `.env.example`)
8. Lockfiles and package manager metadata outside the active task scope

## 4) Scope and context discipline

1. Keep implementation and language aligned with the assigned company context (Nexova in current milestone artifacts).
2. Avoid generic wording in UI and docs when context-specific terminology is required.
3. Prefer minimal, targeted changes over broad refactors.

## 5) Required rule and skill discovery

At session start, agents must also read:
1. `.agents/rules/context-and-change-control.md`
2. `.agents/skills/nexova-milestone-audit/SKILL.md`
