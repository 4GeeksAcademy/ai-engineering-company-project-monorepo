# Brasaland - Project Brief

## Business context

Brasaland is a restaurant chain founded in Medellín in 2008. The company operates 14 restaurants across Colombia and Florida, with approximately 115 employees and annual revenue of around $6 million.

The project is intended to support Brasaland's operational and internal digital needs while preserving the company's identity and business context across the different applications of the monorepo.

## Project objectives

- Build digital products that are coherent with Brasaland's business context and visual identity.
- Provide a public-facing corporate website.
- Provide internal applications for company operations.
- Establish persistent project context so coding agents can work consistently across sessions.
- Keep the different milestones of the existing monorepo integrated instead of replacing previous work.

## Current project scope

Hito 4 introduces an AI-assisted engineering setup and requires:

- A persistent memory bank.
- `AGENTS.md` with mandatory agent workflow and protected areas.
- `.agents/rules/` for development rules.
- `.agents/skills/` for reusable agent skills.
- A public website under `uis/website`.
- A backoffice application under `uis/backoffice`.
- Backend services under `services`.

## Existing project work

The repository already contains previous milestones that must be preserved:

- Hito 1: public/basic web work.
- Hito 2: TypeScript data utilities in `uis/backoffice/data-lab`.
- Hito 3: Talent Pipeline Tracker under `uis/backoffice`.

Hito 4 must build on this existing monorepo and must not unnecessarily duplicate or replace existing functionality.

## Brand identity

The currently defined Brasaland visual identity uses:

- Primary: `#C2410C`
- Text: `#1F2937`
- Background: `#FFF7ED`
- Accent: `#5CB66C`
- Heading font: Sekuya
- Body font: Inter

Color usage constraints already established:

- Green should be used with `#1F2937`.
- Orange and cream may be combined.
- Cream and dark text may be combined.
- Orange and dark text should not be combined directly.

The desired visual character is playful and family-oriented.

## Source and scope note

This document records the project context currently available for the Hito 4 work. The canonical company briefing remains `CONTEXT.md` once it has been created from `CONTEXT-brasaland-briefing.md`.