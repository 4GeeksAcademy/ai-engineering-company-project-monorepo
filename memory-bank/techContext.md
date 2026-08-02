# Technical Context — Milestone 4 Baseline

## Monorepo Structure Decisions
- Public frontend lives in `uis/website` (Next.js + TypeScript).
- Internal frontend lives in `uis/backoffice` (Next.js + TypeScript), with independent layout and UX.
- APIs and backend services must be created under `services/`.
- Shared TypeScript domain logic should remain in a single canonical module and be imported by apps to avoid duplication.

## Architecture Direction
- Start with modular monolith principles in the monorepo.
- Prioritize shared domain contracts and reusable UI/domain components.
- Keep business logic separate from rendering logic.
- Backoffice must display business-logic output in UI (not only console).

## Current Technical Risks
- No centralized service/API implementation yet.
- New frontend apps must avoid drift in domain assumptions.
- Cross-app imports require explicit, stable module boundaries.

## Enforced Guardrails
- Agent reads memory-bank before coding.
- No protected-file edits without explicit confirmation.
- Mandatory validation flow before commit.
- Skills and rules must remain aligned with `CONTEXT.md`.
