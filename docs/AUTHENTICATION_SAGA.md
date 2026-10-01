# HealthCore Authentication Saga

## Purpose

Deliver authentication for HealthCore's internal applications in three ordered, independently verifiable phases. This document is the cross-project roadmap; implementation details and task checklists belong in a phase plan created immediately before that phase starts.

## Scope and guardrails

- Build a centralized FastAPI authentication service in `services/api`; persist users and profiles in TinyDB, separate from supplier data.
- Keep the public `uis/website` unauthenticated and unchanged. Authentication UI belongs only in the existing internal application(s) selected for the frontend phase.
- Use stateless bearer JWTs for access authentication. Never introduce cookie/session auth as a substitute, hardcode signing keys, or commit credentials.
- Keep credentials and authorization metadata on User; keep display/contact data on a one-to-one Profile. Minimize exposure of personal information and never log credentials, tokens, or reset links.
- Preserve existing application behavior except for the deliberate authentication boundary. Review the authorization impact of every protected endpoint, including incident-analysis access, before applying protection.
- Follow repository ownership, validation, and minimal-change guidance. Keep phase snapshots free of unrelated pre-existing worktree changes.

## Ordered phases and gates

### Phase 1 — Authentication API

**Source specification:** [ai-eng-user-authentication-api](https://github.com/4GeeksAcademy/ai-engineering-syllabus/tree/main/content/projects/ai-eng-user-authentication-api)

Provide TinyDB-backed user/profile lifecycle and permissions, password hashing, login and identity endpoints, environment-configured JWT issuance/validation, and bearer protection for the agreed existing API surface. Establish automated security and regression coverage.

**Exit gate:** API acceptance criteria are implemented; tests verify registration/login, valid and invalid authentication, authorization boundaries, persistence, and existing protected-route behavior; configuration and local setup are documented without secrets. Snapshot this phase on its own branch before starting phase 2.

### Phase 2 — Internal authentication flows

**Source specification:** [ai-eng-user-authentication-flows](https://github.com/4GeeksAcademy/ai-engineering-syllabus/tree/main/content/projects/ai-eng-user-authentication-flows)

Integrate registration, login, profile, protected-route, logout, and expired/unauthorized-session behavior into the existing internal Next.js experience. Store the access token in local storage and send it as a bearer token. Keep the public website unaffected.

**Dependency:** Phase 1 API contract and branch snapshot.

**Exit gate:** Internal-user flows work against the API, protected navigation and API 401 handling behave consistently, and relevant UI checks pass. Snapshot this phase separately before starting phase 3.

### Phase 3 — Password recovery and change

**Source specification:** [ai-eng-user-authentication-restore](https://github.com/4GeeksAcademy/ai-engineering-syllabus/tree/main/content/projects/ai-eng-user-authentication-restore)

Add forgot-password, reset-password, and authenticated change-password capabilities to the API and internal UI. Use a transactional email provider for reset links, keep email credentials in environment configuration, make reset tokens short-lived and single-use, and avoid revealing whether an account exists.

**Dependency:** Phases 1 and 2, including their snapshots.

**Exit gate:** End-to-end recovery/change behavior is covered, email configuration and local testing are documented, enumeration and token-reuse protections are tested, and the phase is snapshotted separately.

## Delivery protocol

1. Keep this saga at roadmap level; do not pre-write detailed plans for phases that have not started.
2. At the start of a phase, verify the prior phase's branch snapshot and create a focused, phase-specific implementation plan from its authoritative specification and the current repository state.
3. Implement only that phase's scope; run targeted tests and relevant regressions; update owning documentation and the memory-bank with verified outcomes.
4. Before snapshotting, inspect staged paths and ensure no unrelated user changes, generated artifacts, secrets, or local data are included. Record the branch and validation evidence.
5. Do not begin the next phase until the current phase passes its exit gate and is snapshotted.

## Current status

- Phase 1 — Authentication API: implemented and validated on branch `feature/auth-api`, commit `beba6d9` (`feat(api): add JWT authentication`). Validation recorded in `services/api/AUTHENTICATION_API_PLAN.md`.
- Phase 2 — Internal authentication flows: implemented and validated on branch `feature/auth-frontend`, commit `c0f9b03` (`feat(backoffice): add internal authentication flows`).
- The worktree contains unrelated changes and generated/local artifacts. Preserve them and stage only explicitly reviewed phase-owned files.
