# AGENTS.md

## Purpose

This file defines how coding agents must operate in the TrackFlow monorepo.

TrackFlow is a logistics and warehouse operations company, not a recruiting or generic demo product. Agents working in this repository must use the company context and memory bank before making changes so that all implementation work stays aligned with TrackFlow's real operating problems: inventory visibility, carrier orchestration, returns automation, customer support, and executive reporting.

This file is the repo-level protocol. More specific rules and reusable skills belong in `.agents/`.

## Repository mission

Build the internal systems, public interfaces, backend services, automations, and agent workflows that help TrackFlow operate as a modern two-country logistics company across the United States and Spain.

## Start-of-session reading order

Before proposing changes, writing code, or modifying documentation, every agent must read these files in this order:

1. `CONTEXT.md`
2. `memory-bank/projectbrief.md`
3. `memory-bank/techContext.md`
4. `memory-bank/progress.md`
5. `AGENTS.md`

If a relevant rule or skill exists later inside `.agents/`, read that immediately after these five sources.

## Mandatory workflow

Agents must follow this workflow for every task in this repository, in this exact order:

1. `Evaluate Dev prompt`
2. `get approval for modifying the various files`
3. `Execute changes as needed`
4. `Audit changes in comparison for the prompt`
5. `Seek approval to save changes to the files`

### How to interpret the workflow

- `Evaluate Dev prompt`: verify the request against `CONTEXT.md`, the memory bank, and current repo structure before editing.
- `get approval for modifying the various files`: identify the files likely to be changed and confirm that scope with the developer or user before editing protected or high-impact areas.
- `Execute changes as needed`: keep edits minimal, scoped, and consistent with the existing repo structure.
- `Audit changes in comparison for the prompt`: verify that the finished changes satisfy the request, do not drift into unrelated scope, stay aligned with TrackFlow's domain, and check whether `memory-bank/progress.md`, `memory-bank/projectbrief.md`, or `memory-bank/techContext.md` must be updated under `.agents/rules/UpdateMemoryBank.md`.
- `Seek approval to save changes to the files`: before finalizing broad or cross-cutting edits, present what changed and confirm that the result is acceptable.

## Scope rules

- Treat `CONTEXT.md` as the business source of truth.
- Treat `memory-bank/` as active working memory that must stay current as the project evolves.
- Prefer TrackFlow logistics use cases over generic examples or placeholder implementations.
- Do not continue expanding the candidate-hiring domain in `uis/talent-pipeline-tracker` unless the task explicitly says to repurpose or maintain it.
- New work should follow the documented monorepo structure rather than inventing parallel folders.

## Monorepo structure expectations

- Public-facing website work belongs under `uis/website`.
- Internal product and operations UI work belongs under `uis/backoffice`.
- Backend services belong under `services/` when introduced.
- Shared reusable types belong under `packages/shared` when more than one app or service needs them.
- Repo-specific agent rules and skills belong under `.agents/`.
- Product-facing agent implementations belong under `agents/`.

## Protected files and folders

Agents must not modify the following without explicit developer confirmation:

- `CONTEXT.md`
- `memory-bank/`
- `AGENTS.md`
- `.agents/`
- `packages/shared/`
- Any existing UI app being repurposed or renamed, including `uis/talent-pipeline-tracker`

If a task requires changing any of the above, the agent must call that out before editing.

## Change standards

- Keep edits small and reversible.
- Preserve existing naming, formatting, and structure unless the task requires a deliberate migration.
- Fix root causes where practical, but do not widen scope to unrelated cleanup.
- Prefer adding TrackFlow-relevant functionality over placeholder content.
- Document meaningful architecture or workflow decisions in `memory-bank/progress.md` and `memory-bank/techContext.md` when the task changes repo understanding.

## Validation requirements

After changes are made, agents must run the narrowest relevant validation available.

Examples:

- App-level `lint`, `typecheck`, or `build` commands for touched Next.js code
- Targeted diagnostics for edited files
- Focused behavioral verification for the changed surface

Validation must happen before claiming completion unless the environment makes validation impossible.

## Current repository reality

Agents must account for the current baseline already present in this repo:

- `memory-bank/` is now populated and should be kept updated.
- `.agents/` exists but is still empty.
- `AGENTS.md` is the current top-level operating contract.
- `uis/talent-pipeline-tracker` is implemented with Next.js, React, TypeScript, and Tailwind, but it reflects a hiring workflow rather than TrackFlow logistics.
- `src/` contains separate static TrackFlow-branded frontend assets.

Future decisions should reduce this structural ambiguity instead of adding more of it.

## Deliverable bias

When the request is ambiguous, choose the option that most directly helps the repo reach the course evaluation criteria:

- accurate project memory
- explicit agent workflow
- reusable repo rules and skills
- a working `uis/website`
- a working `uis/backoffice`
- company-relevant output visible in the interface

## When to stop and ask

Stop and ask before proceeding when:

- the requested change conflicts with `CONTEXT.md`
- the task would rewrite a protected file or folder without prior confirmation
- the task mixes unrelated domains and the intended target is unclear
- the repo contains unexpected user changes that alter the planned solution
- validation fails in a way that suggests the controlling code path is elsewhere
