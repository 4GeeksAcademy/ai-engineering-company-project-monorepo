# Memory Bank Log Template Rule

Status: active
Scope: entire repository

## Objective

Standardize log entries in memory-bank files so updates are consistent, parseable, and auditable.

## Rule

Every append to memory-bank logs must follow the exact single-line templates below.

## Required templates

### TECH_STACK template

Use this exact field order:

- YYYY-MM-DD | AREA | TECHNOLOGY | STATUS | NOTES

Field requirements:

- YYYY-MM-DD: valid date.
- AREA: repo path or subsystem name.
- TECHNOLOGY: framework, library, platform, database, infra tool, or protocol.
- STATUS: one of existing, introduced, deprecated.
- NOTES: concise impact statement.

Valid example:

- 2026-08-29 | services/api | FastAPI | introduced | Central API for patient and operations endpoints.

### PROGRESS_LOG template

Use this exact field order:

- YYYY-MM-DD | MILESTONE | AREA | CHANGE | NEXT

Field requirements:

- YYYY-MM-DD: valid date.
- MILESTONE: milestone number or governance label.
- AREA: repo path, domain, or feature.
- CHANGE: completed action only (past tense).
- NEXT: immediate follow-up action.

Valid example:

- 2026-08-29 | Milestone 1 | uis/website | Implemented bilingual landing page sections and responsive layout. | Add form validation and localized error messages.

## Validation checklist before writing

1. One logical change per line.
2. No multiline entries.
3. Use pipe separators with spaces on both sides: " | ".
4. Keep entries append-only under the existing Entries section.
5. Do not reorder or edit old entries unless adding a correction entry.

## Correction format

If a previous line is inaccurate, append a correction line:

- YYYY-MM-DD | Correction | TARGET-AREA | Corrected entry from <date> regarding <topic>. | Reference superseded line and continue with updated tracking.

## Exception

No log entry is required for read-only tasks that do not modify repository files.
