# Progress

## Current phase

Foundation and repo-context setup.

This project is still in the infrastructure stage described by the challenge: establish persistent memory, clarify agent operating context, and prepare the monorepo for TrackFlow-specific product work before adding more features.

## What is now true

- `CONTEXT.md` is populated with TrackFlow's business briefing and operational pain points.
- The three required memory-bank files are now filled with company-specific and repo-specific context.
- `.agents/rules/UpdateMemoryBank.md` now exists as the first repo-specific agent rule.
- `AGENTS.md` now explicitly ties memory-bank freshness checks to the `Audit changes in comparison for the prompt` workflow step.
- `.agents/skills/dummy-order-simulation/SKILL.md` now exists as the first reusable repo skill.
- `.trackflow-dummy-order.txt` now exists at the repo root as the hidden simulation output file for dummy order runs.
- `.agents/skills/dummy-return-simulation/SKILL.md` now exists as a second reusable repo skill for reverse-logistics simulations.
- `.trackflow-dummy-return.txt` now exists at the repo root as the hidden simulation output file for dummy return runs.
- The memory bank now records both sides of the project state:
	- the intended TrackFlow logistics platform direction
	- the actual codebase baseline currently present in the repository

## Existing implementation discovered during this update

- A working Next.js app exists at `uis/talent-pipeline-tracker`.
- That app implements candidate pipeline functionality against an external API and is not yet aligned with TrackFlow's logistics use cases.
- Standalone TrackFlow-branded HTML/JS assets exist under `src/`.
- `packages/shared` exists but still contains placeholder shared types.
- `.agents/` now contains a rule requiring agents to keep the memory bank up to date after meaningful repository changes.
- `.agents/skills/` now contains a TrackFlow-specific dummy order simulation skill that models intake, warehouse assignment, carrier selection, and ETA assumptions.
- `.agents/skills/` now also contains a TrackFlow-specific dummy return simulation skill that models approval review, warehouse receiving, inspection, and disposition.

## Important repo-state note

The codebase currently mixes:

- the correct business context for TrackFlow
- a partially unrelated internal UI implementation
- template-level monorepo folders that are not yet formalized into a TrackFlow architecture

This is not a blocker, but it is a risk for future agent sessions. Without explicit memory and rules, an agent could easily continue building the recruitment tracker instead of the logistics platform.

## Decisions captured in memory

- The project's source of truth is TrackFlow logistics, not the talent pipeline example app.
- Future applications should follow the documented monorepo conventions, especially `uis/website` and `uis/backoffice`.
- `memory-bank/` must be maintained as active operational context, not static documentation.
- Memory-bank maintenance is now formalized as a repo rule inside `.agents/rules/UpdateMemoryBank.md`.
- The AGENTS workflow keeps the required five steps, but the audit step now explicitly includes checking whether the memory bank is stale.
- `AGENTS.md` is established, and `.agents/` now includes a memory-maintenance rule plus two reusable TrackFlow simulation skills.

## What remains to do next

1. Add more `.agents/rules` content for repo-specific conventions beyond memory maintenance and protected areas.
2. Add more `.agents/skills/<skill>/SKILL.md` entries beyond the current dummy order and dummy return simulation workflows.
3. Align the UI structure with the challenge expectations by introducing or planning `uis/website` and `uis/backoffice`.
4. Decide whether `uis/talent-pipeline-tracker` will be repurposed, archived, or left as a separate reference implementation.
5. Start implementing a TrackFlow-relevant interface surface so the repo has visible company-specific product output under the intended structure.

## Risks and watchouts

- Domain drift: the existing candidate-tracker app can pull implementation effort away from TrackFlow logistics goals.
- Structural duplication: creating new apps outside the documented UI conventions will make the monorepo harder to navigate.
- Stale memory: if future architecture decisions are not recorded here, the memory bank will stop being useful quickly.

## Definition of done for this update

- The memory bank reflects the company, the repo's actual technical baseline, and the next planned setup steps.
- Future agent sessions have enough context to avoid generic template work and avoid misreading the current app as the project's business target.
