# Rule: Context Alignment and Change Control

## Scope

- Type: always active
- Applies to: whole monorepo

## Purpose

Prevent generic or unsafe changes by forcing alignment with company context and milestone constraints before implementation.

## Required behavior

1. Confirm business context from memory-bank plus nearest context file before editing.
2. Keep terminology aligned with assigned scenario (Nexova in current audited folders).
3. Do not modify protected paths listed in `AGENTS.md` without explicit developer approval.
4. When requirements and implementation diverge, report the gap first, then propose the smallest safe fix.
5. Any meaningful architecture/workflow change must update `memory-bank/progress.md` in the same branch.

## Verification checklist

1. Context source files were reviewed before coding.
2. User-visible labels and docs use scenario-correct wording.
3. Protected paths were untouched or explicitly approved.
4. Progress memory was updated for substantive changes.

## Anti-patterns

1. Copying generic templates that ignore assigned company constraints.
2. Editing infra/secrets/context roots without approval.
3. Shipping behavior changes with no memory-bank update.
