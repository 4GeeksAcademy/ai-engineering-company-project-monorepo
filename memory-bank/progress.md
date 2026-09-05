# Progress

## Current phase

Foundation and repo-context setup.

This project is still in the infrastructure stage described by the challenge: establish persistent memory, clarify agent operating context, and prepare the monorepo for TrackFlow-specific product work before adding more features.

## What is now true

- `CONTEXT.md` is populated with TrackFlow's business briefing and operational pain points.
- The three required memory-bank files are now filled with company-specific and repo-specific context.
- The memory bank now records both sides of the project state:
	- the intended TrackFlow logistics platform direction
	- the actual codebase baseline currently present in the repository

## Existing implementation discovered during this update

- A working Next.js app exists at `uis/talent-pipeline-tracker`.
- That app implements candidate pipeline functionality against an external API and is not yet aligned with TrackFlow's logistics use cases.
- Standalone TrackFlow-branded HTML/JS assets exist under `src/`.
- `packages/shared` exists but still contains placeholder shared types.
- `.agents/` exists but is empty.

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
- `AGENTS.md` and `.agents/` are the next infrastructure step before heavier feature work.

## What remains to do next

1. Create `AGENTS.md` at the repo root with startup reading order, workflow rules, commit-preparation steps, and guardrails.
2. Add `.agents/rules` content for repo-specific conventions and protected areas.
3. Add at least one `.agents/skills/<skill>/SKILL.md` entry with explicit inputs and acceptance criteria.
4. Align the UI structure with the challenge expectations by introducing or planning `uis/website` and `uis/backoffice`.
5. Decide whether `uis/talent-pipeline-tracker` will be repurposed, archived, or left as a separate reference implementation.

## Risks and watchouts

- Domain drift: the existing candidate-tracker app can pull implementation effort away from TrackFlow logistics goals.
- Structural duplication: creating new apps outside the documented UI conventions will make the monorepo harder to navigate.
- Stale memory: if future architecture decisions are not recorded here, the memory bank will stop being useful quickly.

## Definition of done for this update

- The memory bank reflects the company, the repo's actual technical baseline, and the next planned setup steps.
- Future agent sessions have enough context to avoid generic template work and avoid misreading the current app as the project's business target.
