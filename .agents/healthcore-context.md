# HealthCore Context Rule

## Scope

**Always active**

## Purpose

Ensure all generated code, copy, data models, and agent outputs reflect HealthCore's healthcare operations context — not generic placeholders.

## Instructions

1. **Use exact names from context files** — clinic names, field `name` attributes, entity interfaces (`Claim`, `Appointment`, `Clinician`), and stakeholder titles.
2. **Never expose raw domain values in UI** when a label mapping exists (e.g. `in_progress` → "In progress", CME `at_risk` → "At risk").
3. **Treat operational data as critical** — denial rates, no-show metrics, and CME compliance affect Monday reports to Tom Callahan, Marcus Reid, and Diane Foster. Avoid silent failures; show loading and error states.
4. **Import, don't duplicate** — use `src/utils` from frontends via `@healthcore/utils` or documented path aliases.
5. **Respect regulatory framing** — note HIPAA/GDPR when handling patient or clinical identifiers; do not log PHI to console in production paths.
6. **Preserve bilingual patient experience** — public website strings must support EN and ES per `context/01_CONTEXT.md`.
