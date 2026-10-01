# Phase 1 Plan — Authentication API

**Status:** Implemented and validated; awaiting phase snapshot
**Saga:** [Authentication Saga](../../docs/AUTHENTICATION_SAGA.md)
**Authoritative project:** [ai-eng-user-authentication-api](https://github.com/4GeeksAcademy/ai-engineering-syllabus/tree/main/content/projects/ai-eng-user-authentication-api)
**Target phase branch:** `feature/auth-api` (create from the current base only after verifying worktree safety; never stage unrelated existing changes).

## Objective

Add secure, stateless authentication and authorization to the centralized FastAPI service. Keep users and linked profiles in TinyDB, maintain existing supplier persistence, and protect the agreed existing API surface without breaking authenticated use.

## Repository facts and constraints

- Entry point and routers are in `services/api`; current route groups are suppliers and incident analysis.
- `database.py` currently opens TinyDB at `data/suppliers.json`; auth should use separate tables while retaining supplier table/data compatibility.
- Existing supplier tests call routes anonymously, so they must be migrated to use valid credentials/token after protection is introduced.
- Current API project uses `uv`, Pydantic 2, FastAPI, TinyDB, pytest/httpx.
- Preserve pre-existing dirty-worktree files. Do not stage application artifacts, local environments/data, or unrelated memory-bank/context edits.
- Do not store auth data in Supabase/SQL, set cookies, hardcode secrets, commit `.env`, expose secrets, or log passwords/tokens.
- The upstream brief's dependency/import wording for `libpass[bcrypt]` and `passlib.hash.bcrypt` may be inconsistent. Verify the actual supported package API and select the smallest compatible dependency/configuration before coding; document the chosen import.

## Scope

### Data and models

- Add a User record with TinyDB identifier, normalized/unique email, hashed password only, active flag, constrained role (`admin`, `manager`, `user`), and creation metadata.
- Add a one-to-one Profile record/table keyed to user, with `id`, `user_id`, `name`, `phone`, and `address`; do not put display/contact fields on User.
- Registration is public, defaults new users to `user`, rejects duplicates, and creates a linked profile if any optional initial profile field is supplied.
- Define request/response models that forbid unexpected privilege fields and never return password hashes.

### Authentication and authorization

- Implement password hash/verify helpers using the verified bcrypt dependency.
- Implement environment-backed JWT secret and expiration; validate configuration rather than providing a production secret fallback. Document variable names and safe local setup.
- Add `/auth/login` and `/auth/me`; login returns a bearer JWT and `/auth/me` returns safe identity plus the linked profile.
- Add reusable `OAuth2PasswordBearer`/`get_current_user` dependency. Reject absent, malformed, expired, invalid-signature, or inactive-user credentials with 401 and an appropriate bearer challenge.
- Implement user endpoints under `/users` and profile endpoints `/profiles/me` per the authoritative README. Apply self/admin and owner-only rules; authenticated unauthorized access is 403. Public users cannot self-elevate or change credentials through generic user updates; password recovery/change is deferred to phase three.
- Protect at least five existing non-auth/non-user operations, including the existing supplier API. Decide explicitly whether both incident analysis endpoints should also require auth, document the choice, and retain valid-token functionality.
- Keep CORS behavior compatible with intended internal frontends; do not make the public website a client of authenticated routes.

### Persistence and integration

- Reuse the current TinyDB file only if table separation and deployment assumptions are sound; otherwise introduce a clearly documented auth-specific file/storage boundary. Preserve suppliers on fresh/test auth operations.
- Avoid exposing internal `doc_id` inconsistently; ensure token subject and dependent-module `user_uuid` use the stable TinyDB user identifier.
- Add router exports and include auth/user/profile routers in the app.

## Implementation sequence

1. Recheck repository guidance and upstream API acceptance checklist; confirm dependency import/API and environment variable conventions.
2. Add model/request/response schemas and isolated TinyDB user/profile operations with unit coverage.
3. Add password/JWT settings and helpers; verify token claims, expiry, and failure behavior.
4. Add registration, login, identity, user management, and profile routes with explicit permission checks.
5. Add the auth dependency to selected existing routes; migrate supplier tests to authenticate and preserve valid-token CRUD behavior.
6. Add end-to-end tests for registration → login → protected operation, profile ownership, admin/self access, 401/403 distinctions, and malformed/expired tokens.
7. Update API documentation and a secret-free `.env.example` if consistent with repository ignore/config patterns. Avoid writing real values.
8. Run formatter/lint if configured, targeted API tests, and relevant broader tests. Review diffs and staged paths before snapshot.

## Acceptance criteria

- Public registration creates exactly one User and linked Profile in TinyDB; duplicate email and invalid role/extra privilege input are rejected.
- Password hashes are bcrypt-based; plaintext password/hash are absent from API responses and logs.
- Login issues a signed, expiring JWT using environment configuration; identity endpoint resolves an active user and linked profile.
- Missing, malformed, expired, invalid-signature, unknown-user, and inactive-user tokens fail closed with 401.
- Self/admin and profile-owner authorization is explicit and tested; authenticated forbidden access returns 403.
- At least five existing non-auth/non-user route operations reject anonymous requests and function with a valid bearer token.
- Existing supplier persistence and domain behavior still pass under authenticated tests.
- User/Profile data is only in TinyDB, isolated from supplier table semantics; no Supabase/SQL auth schema is introduced.
- No secrets or unrelated user files are included in the implementation snapshot.

## Validation and phase snapshot

- Run from `services/api`: `uv run pytest` (plus any focused test command during development).
- Inspect test collection/results and verify startup with environment configured via local untracked settings.
- Review `git diff --check`, `git diff`, `git status`, and an explicit staged-path list. Do not use broad `git add .` in this dirty worktree.
- Snapshot only after all acceptance criteria pass. The saga requires a separate phase branch/snapshot before any detailed phase-two plan is written.

## Risks and decisions to resolve during implementation

- **Dependency mismatch (resolved):** `libpass[bcrypt]` installs the `passlib` import namespace, so use `from passlib.hash import bcrypt` as the upstream brief suggests while depending on maintained `libpass`, not the separate legacy `passlib` distribution.
- **JWT secret initialization:** Ensure tests and local app startup provide explicit test/dev configuration while production fails safely if secret is absent.
- **Auth database isolation:** Current tests monkeypatch supplier DB globals; design shared or separate TinyDB settings so tests isolate all auth and supplier records without cross-test leakage.
- **Endpoint scope:** Determine whether authentication should cover incidents in addition to suppliers from explicit upstream acceptance criteria and HealthCore access intent; do not leave sensitive operations exposed by accident.
- **Admin bootstrap:** Do not silently grant admin role to public registrations. If initial admin provisioning is required, use a deliberate environment/seed mechanism with documented safeguards.

## Implementation decisions and validation

- Registration accepts `email`/`password` without profile fields. `name`, `phone`, and `address` are optional; a profile is persisted when at least one is supplied. Its fields allow nulls so partial initial profile input matches the upstream brief.
- `/auth/login` accepts JSON credentials, matching the project's stated email/password contract. The OpenAPI bearer flow advertises `/auth/login` as its token URL; use the JSON login route to acquire a token.
- Generic `PUT /users/{id}` does not permit user self-service password changes. Only an administrator may set a password there; a dedicated secure self-service flow belongs to the recovery phase.
- User listing and role/account-status changes are admin-only; this is a deliberate least-privilege extension. Public registration always yields an ordinary active user.
- The Hatch wheel include list now explicitly includes the `auth` package and `models_auth.py`, so installed distributions do not omit the new modules.
- Bcrypt's 72-byte maximum is enforced by request validators using UTF-8 byte length, preventing silent truncation of multibyte passwords.
- Final validation: `SECRET_KEY=test-secret-for-local-tests ACCESS_TOKEN_EXPIRE_MINUTES=30 uv run pytest -q` passed (15 tests); `uv build` produced sdist and wheel successfully; `git diff --check` passed; editor diagnostics reported no API errors. Starlette emitted an upstream TestClient/httpx deprecation warning.
- **Dirty base branch:** Do not accidentally snapshot unrelated modifications; branch and commit strategy must preserve user work and avoid committing their files.
