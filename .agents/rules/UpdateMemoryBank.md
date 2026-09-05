# UpdateMemoryBank Rule

## Purpose

Keep the TrackFlow memory bank accurate after meaningful repository changes so future agent sessions inherit the correct business, technical, and delivery context.

## Scope

Apply this rule whenever an agent changes code, documentation, configuration, structure, workflows, or agent assets in a way that affects project status, architectural understanding, operating assumptions, or planned next steps.

## Required behavior

After making a change, the agent must decide whether any of these files now need an update:

- `memory-bank/progress.md`
- `memory-bank/projectbrief.md`
- `memory-bank/techContext.md`

If one or more files are now stale, update them in the same task before claiming completion.

This rule is not optional. The repository enforces it through the `scripts/check_memory_bank.py` guard and the Git pre-commit hook in `.githooks/pre-commit`. A commit that changes the repo without a matching memory-bank update is rejected.

## How to choose the file

Update `memory-bank/progress.md` when the change affects:

- current project state
- completed work
- next steps
- known risks
- decisions that change delivery sequencing

Update `memory-bank/projectbrief.md` when the change affects:

- project goals
- business scope
- company priorities
- intended product direction
- the problem the repository is solving

Update `memory-bank/techContext.md` when the change affects:

- architecture
- technology choices
- folder structure expectations
- implementation constraints
- validation workflow
- integration boundaries

## Trigger examples

This rule should usually trigger after changes such as:

- creating or restructuring apps, services, packages, agents, or `.agents` assets
- repurposing an existing UI toward a TrackFlow logistics use case
- adding a new shared package or cross-app domain model
- introducing a new external integration, API boundary, or deployment assumption
- changing the expected developer workflow or validation commands
- finishing a milestone step that changes what the project has or what should happen next

## Non-triggers

An update is not required for every tiny edit. The agent may leave the memory bank unchanged when the work is purely local and does not alter shared understanding, such as:

- wording-only copy edits with no scope impact
- visual polish that does not change structure or workflow
- isolated bug fixes that do not affect architecture, status, or next steps

If the agent decides no memory update is needed, it should state that judgment briefly in its final audit.

## Acceptance criteria

- The memory bank stays aligned with the real repository state.
- Future agents can understand what changed without rediscovering it from scratch.
- No task that materially changes scope, structure, or technical direction is considered complete while the memory bank is stale.