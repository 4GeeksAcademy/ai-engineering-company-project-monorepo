# HealthCore Safety and Context Rule

Apply this rule to all work in this repository.

## Required context

Read `CONTEXT.md` before making domain changes. Read the relevant `memory-bank/` file and folder README before making changes in a component. Use the milestone context document when implementing a milestone-specific deliverable.

## Source-grounded behavior

Use only facts, fields, labels, validation rules, and workflows specified by the repository. Do not guess missing clinic data, patient data, API behavior, infrastructure, or compliance decisions. Mark missing information as `Not specified` in documentation.

## Regulated data

HealthCore handles protected healthcare and workforce information across the US and UK. Do not use real patient information or secrets in code, tests, logs, prompts, fixtures, or examples. Consider HIPAA and UK GDPR for storage, access, sharing, audit trails, retention, and cross-border processing.

## AI behavior

AI-assisted clinical, billing, compliance, scheduling, and workforce features must be designed as decision support with human review, traceable inputs, and explicit failure handling. Do not claim that generated output is clinically, legally, or financially authoritative.

## Repository boundaries

Place work in the owning top-level folder. Prefer the documented centralized API architecture and existing shared packages. Keep frontend, backend, data, agent, workflow, and infrastructure concerns separated. Add or update documentation for every new reusable component.

## Validation and change safety

Make focused changes, preserve unrelated worktree changes, and run the narrowest relevant validation. Documentation-only changes must not alter application code.
