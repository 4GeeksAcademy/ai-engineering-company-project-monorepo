# Rule: Monorepo Delivery Guardrails

## Scope
- Activation: **Always active**
- Applies to: all repository changes (`**`)

## Purpose
Keep AI-generated changes aligned with Brasaland context, monorepo boundaries, and delivery quality expectations.

## Rule
1. Read `CONTEXT.md` and memory-bank files before code changes.
2. Place code only in the appropriate top-level folder by responsibility.
3. Never duplicate business logic that already exists in shared modules.
4. Run validation relevant to modified apps/services before finalizing.
5. Update `memory-bank/progress.md` after implementation changes.

## Required Evidence
A change is complete only if all are true:
- Business context alignment is visible in changed content.
- At least one validation command has been executed for each modified runnable app.
- Progress memory was updated with completed work and next steps.
