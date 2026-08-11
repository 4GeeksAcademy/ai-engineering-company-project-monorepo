---
name: nexova-milestone-audit
description: Audit implementation scope against Nexova milestone requirements and produce evidence-based gaps and next actions. Use when validating folder readiness before delivery.
---

# Nexova Milestone Audit

## Single objective

Produce an evidence-based readiness audit for a specified monorepo scope, mapped to Nexova context and milestone requirements.

## When to use

Use this skill when asked to:
1. Audit a milestone folder before submission.
2. Check requirement coverage against README/context checklist.
3. Create or refresh memory-bank status based on real implementation evidence.

## Required inputs

1. `scopePaths`: one or more folder paths to audit (for example `uis/landing_page`, `scripts`, `uis/talent-pipeline-tracker`).
2. `contextFiles`: the scenario sources to enforce wording and constraints (for example `CONTEXT.md`, `scripts/context.md`).
3. `requirementSources`: files containing acceptance criteria (README, milestone checklist, task prompt).
4. `outputTarget`: destination file(s) for summary updates (for example `memory-bank/progress.md`).

## Procedure

1. Inventory files in each scope and ignore generated artifacts where possible.
2. Extract requirement statements from provided requirement sources.
3. Map each requirement to concrete implementation evidence (file-level references).
4. Classify each item as implemented, partial, missing, or unclear.
5. Record key risks and propose smallest next actions.
6. Update memory-bank output target with concise audit findings.

## Explicit acceptance criteria

The audit is complete only if all of the following are true:
1. Every requirement has a status: implemented, partial, missing, or unclear.
2. Every implemented/partial claim includes at least one concrete file reference.
3. At least one risk section is included (or explicitly marked none found).
4. At least three prioritized next actions are listed when gaps exist.
5. Output language is aligned with the active company context and avoids generic framing.

## Output format

1. Scope audited
2. Requirement coverage table or list
3. Risks and blockers
4. Prioritized next actions
5. Memory-bank update note
