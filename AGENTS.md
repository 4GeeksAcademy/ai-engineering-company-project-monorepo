# HealthCore Engineering Instructions

## Project context

HealthCore is an outpatient healthcare services company founded in 2011 in Austin, Texas. It operates 12 clinics across the United States and the United Kingdom, providing primary care, specialist consultations, chronic disease management, and preventive health programmes.

Before making a change, read the relevant source of truth in this order:

1. `CONTEXT.md` for company facts, domain requirements, and constraints.
2. The applicable file in `memory-bank/` for project, technical, and progress context.
3. The README for the target top-level folder and any README in the target component.
4. Existing implementation and tests near the change.

Do not invent company facts, clinic details, patient fields, regulatory requirements, API contracts, or infrastructure choices. If the repository does not specify something, preserve that uncertainty and record it as `Not specified` in documentation.

## Repository architecture

Keep work in the folder that owns it:

- `uis/`: user interfaces and frontend applications.
- `services/`: centralized APIs and background workers.
- `data/`: source data, pipelines, processed data, and evaluation sets.
- `agents/`: concrete AI agents.
- `skills/`: reusable agent capabilities.
- `mcps/`: Model Context Protocol servers.
- `workflows/`: automation and orchestration.
- `packages/`: reusable versioned libraries and shared types.
- `shared/`: schemas, templates, and other unbundled shared resources.
- `docs/`: cross-cutting architecture and decisions.
- `infra/`, `scripts/`, and `internal/`: operations and developer tooling.

Prefer the repository's centralized FastAPI API direction. Do not introduce microservices or a new framework without a documented requirement.

## Healthcare data and AI safety

- Treat patient, clinical, insurance, appointment, billing, and employee information as sensitive.
- Do not add real protected health information, credentials, tokens, or private identifiers to source code, fixtures, logs, prompts, documentation, or examples.
- Evaluate data handling against both HIPAA in the US and UK GDPR in the UK.
- Keep access control, auditability, data minimization, retention, and jurisdiction boundaries explicit when a change handles sensitive data.
- AI output must support human review for clinical, billing, compliance, and workforce decisions. Do not present predictions or generated content as authoritative without an appropriate review path.
- Do not silently weaken validation, logging, privacy, or error handling to make a workflow pass.

## Implementation standards

- Make the smallest change that satisfies the requirement and preserve existing public APIs unless a change is required.
- Follow local naming, formatting, framework, and component conventions.
- Reuse existing types, helpers, and package boundaries before adding abstractions.
- Keep user-facing text and validation behavior consistent with the applicable milestone context.
- Document every new app, service, agent, pipeline, workflow, or reusable skill in its owning directory.
- Do not modify unrelated user changes or revert a dirty worktree.

## Validation

Run the narrowest relevant validation after each implementation slice. For `uis/talent-pipeline-tracker`, the available commands are:

```bash
npm run lint
npm run build
npm run dev
```

Use `npm run start` only after a successful production build. Root-level test, database, deployment, and workspace commands are not currently specified.

When a requested task is documentation or agent configuration only, validate file paths, markdown structure, links, and `git diff --check` without changing application code.
