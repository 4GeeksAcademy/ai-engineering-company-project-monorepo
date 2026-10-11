# Brasaland - Project Progress

## Current status

Hito 4 is being implemented on top of the existing Brasaland monorepo.

The Hito 3 Talent Pipeline Tracker now lives under `uis/backoffice/`, separate from root-level backend services.

The initial directory structure for Hito 4 is being prepared.

Target directories:

```text
.agents/rules/
.agents/skills/
memory-bank/
uis/website/
uis/backoffice/
services/
```

The existing Hito 3 application remains at:

```text
uis/backoffice/
```

and should not be replaced.

## Completed before Hito 4

### Hito 1

The project contains the initial public web work, including the existing HTML/CSS/JavaScript files.

### Hito 2

The TypeScript/Vite Data Lab is working under `uis/backoffice/data-lab/`.

Validated operations include:

- `npm install`
- `npm run build`
- `npm run dev`

### Hito 3

The Talent Pipeline Tracker Next.js application is working under:

```text
uis/backoffice/
```

Validated operations include:

- typecheck
- lint
- build
- development server
- candidate listing and filters
- candidate detail
- candidate editing
- status and stage updates
- candidate notes

## Hito 4 next steps

1. Ensure the Hito 4 directory structure exists.
2. Create `CONTEXT.md` at the repository root from `CONTEXT-brasaland-briefing.md`.
3. Review the existing repository structure and relevant README files before implementing new applications.
4. Complete and verify the memory bank.
5. Create root `AGENTS.md`.
6. Add at least one scoped rule under `.agents/rules/`.
7. Add at least one reusable skill under `.agents/skills/` with explicit acceptance criteria.
8. Initialize and implement `uis/website`.
9. Continue validating the existing Talent Pipeline Tracker under `uis/backoffice`.
10. Add backend services under `services` according to the repository/template conventions.
11. Run the required validation checks.
12. Review the Git diff and repository status.
13. Commit and push the completed Hito 4 work.
14. Open the required pull request and notify the tech lead.

## Working principle

Hito 4 should extend the current monorepo. Existing milestones should be preserved unless a change is explicitly required by the new milestone.