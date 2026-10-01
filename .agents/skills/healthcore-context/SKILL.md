---
name: healthcore-context
description: Apply HealthCore company context, repository architecture, and healthcare data safeguards when planning or implementing any project deliverable.
---

# HealthCore Context Skill

Use this skill when a task affects HealthCore domain behavior, sensitive data, AI-assisted decisions, a milestone deliverable, or repository architecture.

## Inputs

- The user request and acceptance criteria.
- `CONTEXT.md`.
- The relevant file in `memory-bank/`.
- The README for the target repository area.
- Existing implementation, types, tests, and configuration near the change.

## Workflow

1. Identify the owning department, user, business process, and milestone from `CONTEXT.md`.
2. Extract exact facts, fields, labels, validation rules, metrics, and constraints. Keep a short list of facts that are not specified.
3. Map the request to the owning repository folder. Use `uis/` for interfaces, `services/` for APIs and workers, `data/` for pipelines and evaluation, `agents/` for concrete agents, `skills/` for reusable capabilities, `mcps/` for external tools, and `workflows/` for orchestration.
4. Inspect the nearest existing implementation and reuse its conventions, types, and helpers.
5. State one local hypothesis about the controlling behavior and one focused validation that could disconfirm it before editing.
6. Make the smallest change that satisfies the confirmed requirement.
7. Validate with the narrowest available command, then update the relevant documentation or memory-bank record when the project state changes.

## HealthCore safeguards

- Treat patient, clinical, appointment, insurance, billing, compliance, and employee information as sensitive.
- Never place real protected health information, credentials, tokens, or private identifiers in source, tests, fixtures, logs, prompts, or examples.
- Evaluate handling against HIPAA for US operations and UK GDPR for UK operations, including access, auditability, minimization, retention, and cross-border sharing.
- Keep human review and traceability for clinical documentation, claims review, no-show prediction, compliance scoring, scheduling, and workforce decisions.
- Do not present generated or predicted output as authoritative clinical, legal, financial, or employment advice.

## Output expectations

For planning or review, report:

- Confirmed HealthCore facts and applicable requirements.
- The owning component and relevant repository boundary.
- Assumptions or missing information, labeled `Not specified`.
- The focused validation to run.
- Risks involving privacy, compliance, data quality, or human oversight.

For implementation, preserve existing public APIs where possible, avoid unrelated refactors, and document new applications, services, agents, pipelines, workflows, or reusable skills in their owning directories.
