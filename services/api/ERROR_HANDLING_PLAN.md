# Phase 4 — Error Handling Plan

## Goal and source

Implement the error-handling requirements from the official [ai-eng-error-handling specification](https://github.com/4GeeksAcademy/ai-engineering-syllabus/blob/main/content/projects/ai-eng-error-handling/README.md) across HealthCore's existing internal Next.js backoffice, centralized FastAPI API, and Python scripts. The work should make failures actionable without disclosing secrets or sensitive operational details.

## Phase gate and branch

Phase 3 is implemented and its snapshot is verified: `feature/auth-recovery` at pushed commit `2af5061` (`feat(auth): add password recovery and change flows`), matching `origin/feature/auth-recovery`. Begin phase 4 from this snapshot. Existing unstaged modifications and untracked files are unrelated or pre-existing; do not stage, overwrite, or revert them. This plan and any later edits must be reviewed independently before snapshotting.

## Scope

- Audit async data/API operations in `uis/backoffice` for scoped catches, loading/success/error states, actionable error recovery, and cleanup in `finally` blocks.
- Audit API routes in `services/api` for appropriate HTTP errors, structured responses, safe client-visible details, and narrowly scoped exception handling for persistence/provider/external calls.
- Audit Python scripts for input validation, file/CSV errors reported to stderr, and non-zero exit on critical failures.
- Add or adjust focused tests for the error paths changed in this phase.
- Update owning API/backoffice/script documentation with accurate behavior and validation commands.

## Exclusions and safety

- Do not change the public `uis/website` application or authentication boundaries.
- Do not log tokens, passwords, reset links, email addresses, patient-level source rows, uploaded filenames that may contain sensitive data, provider payloads, or database connection/configuration secrets.
- Do not broadly catch and suppress exceptions, replace meaningful HTTP statuses, expose tracebacks, or make speculative infrastructure changes.
- Preserve existing route contracts and successful behavior unless an error-handling defect requires a minimal correction.
- Do not touch unrelated dirty files, local database artifacts, virtual environments, or generated assets.

## Initial audit findings

These are inspection targets, not assumptions that the entire feature is defective; confirm behavior and tests before changing each item.

- `uis/backoffice/lib/auth.ts`: `readApiResponse` includes raw non-JSON response text in thrown errors, which may expose proxy/internal details; JSON `detail` values are also surfaced directly. `authFetch` lets network failures reject to callers, so callers must handle them.
- `uis/backoffice/app/suppliers/page.tsx`: catches errors and clears loading/saving state, but directly calls `response.json()` and uses server detail as user-facing text; list failure has no retry action, and mutations share one error state without clear retry guidance.
- `uis/backoffice/app/incidents/incident-analysis.tsx`: catches upload/export errors and clears busy state; response parsing assumes JSON for upload errors, and export failure has no retry-oriented error action. Review URL cleanup and safe display of server messages.
- `services/api/routes/auth.py`: the recovery email call is narrowly caught and logged generically. Audit other route/database boundaries and ensure unexpected failures are not returned with sensitive details.
- `services/api/routes/incidents.py`: file reading and CSV parser errors are partly mapped to 4xx responses; audit read failures, malformed uploads, and export generation without exposing source content.
- `scripts/analyze.py`: catches the domain `IncidentFileError` and output `OSError`, and returns non-zero; verify parser/domain coverage for missing, unreadable, and malformed input.
- `skills/data-analysis/scripts/pandas_clean.py`: reads a fixed `data.csv` without handling missing/unreadable/malformed input; determine if it is an in-scope runnable script and add safe stderr/non-zero handling without leaking source contents.

## Work breakdown

1. Inventory each async frontend request and each API/script failure boundary; record relevant existing coverage.
2. Define sanitized error parsing in the shared backoffice API helper and apply it to affected callers. Add user-facing retry/recovery actions and preserve reliable loading cleanup.
3. Correct backend exception-to-HTTP mapping at the relevant operations, retaining FastAPI validation behavior and safe generic 500 responses; add tests for expected failure modes.
4. Add safe input/I/O handling and clear stderr/non-zero exits to in-scope scripts, with tests or documented reproducible checks.
5. Update API/backoffice/script docs with confirmed behavior and commands.
6. Run targeted API tests, backoffice lint/build, script-focused checks, and `git diff --check`; inspect all changed/staged paths and exclude unrelated state.
7. Update this plan, the authentication saga, and memory-bank progress with verified outcomes. Snapshot phase 4 separately only after the exit gate passes and staged-path review is clean.

## Validation and acceptance gates

- Every changed async UI operation has a loading state, fulfilled content or confirmation, a safe human-readable failure message, a meaningful recovery action where possible, and `finally` cleanup for busy state.
- API errors use suitable HTTP statuses and structured JSON details. No traceback, credential, reset token/link, patient/source row, provider payload, or local path/database secret is returned.
- Script input and file/CSV failures are reported to stderr in plain language and critical failures exit non-zero.
- Focused regression tests cover the changed failure paths; API suite and backoffice lint/build pass.
- Run `git diff --check`; review diff and stage paths without disturbing or including unrelated worktree changes.
- No source change to the public website or authentication scope.

## Status

- Phase 4 implementation is complete and validated on the existing `feature/auth-recovery` work branch. No snapshot/commit was created.
- Backoffice behavior: API messages are allowlisted and raw proxy/backend details are suppressed; supplier retry appears only for list-load failures; incident upload/export errors have distinct recovery actions; async loading/busy states are reset in `finally` blocks.
- API/shared package: incident upload-read and export-generation failures map to safe structured HTTP errors, client filenames are not echoed, and generic analyzer I/O failures map to a safe domain error.
- Script: the pandas sample reports missing pandas and common input/read/CSV errors to stderr with a non-zero exit; no dataset rows or local paths are emitted.
- Validation: API plus analyzer package suites: **27 passed** (one existing Starlette TestClient/httpx deprecation warning); backoffice `npm run lint` and `npm run build` passed; analyzer package regression: **1 passed**; script syntax compilation passed. `git diff --check` passed.
- Limitation: the pandas runtime CSV cases could not be exercised because `pandas` is not importable by the configured terminal interpreter (the package-install operation did not make it available there). The script's syntax and safe missing-dependency exit were verified; CSV runtime checks still require a working pandas installation.
- Phase 5 remains pending; do not start it until this phase is reviewed and snapshotted separately.
