# Phase 3 — Password Recovery and Change Plan

## Goal and source

Implement AUTH-03 against the official [ai-eng-user-authentication-restore specification](https://github.com/4GeeksAcademy/ai-engineering-syllabus/tree/main/content/projects/ai-eng-user-authentication-restore), building on the API and backoffice snapshots already present on `feature/auth-api` (`beba6d9`) and `feature/auth-frontend` (`c0f9b03`, with the API-response hotfix `7b4c555`). The recovery specification requires a transactional email integration (Resend or SendGrid), short-lived single-use reset tokens, authenticated password changes, and matching internal UI.

## Scope and exclusions

- API: add `POST /auth/forgot-password`, `POST /auth/reset-password`, and authenticated `POST /auth/change-password`.
- Internal backoffice: add public `/forgot-password` and `/reset-password`, authenticated `/account/change-password`, link recovery from login, and make the password-change route available from account navigation.
- Add security/regression tests and document provider configuration and real-email testing.
- Keep JWT access-token behavior, registration/profile behavior, suppliers/incidents, and public `uis/website` unchanged.
- Do not stage or include unrelated worktree changes, local TinyDB data, virtual environments, generated files, API keys, or application files outside the backoffice.

## Decisions and implementation detail

### Recovery-token lifecycle

- Generate an opaque token from cryptographically secure random bytes; send the raw token only in the reset link and persist only its SHA-256 digest.
- Store recovery state in a dedicated TinyDB table, including user ID, digest, and UTC expiry; consumed tokens are removed. Tokens expire after **30 minutes**; issuing another token invalidates outstanding tokens for that account.
- Validate digest, account activity, expiry, and unconsumed state. Consume the token and update the hashed password; clear/invalidate any other outstanding token(s). Reuse/invalid/expired tokens return HTTP 400 with a generic error.
- Use helpers in `database.py` for creating, atomically redeeming, invalidating, and changing credentials; keep reset metadata out of user/profile response schemas. Serialize reset redemption and password change with a process-local lock; document that TinyDB is not a transactional/distributed multi-worker production store.
- Password change verifies the current password, returns 400 for mismatch, hashes the new password with the existing bcrypt helper, and invalidates outstanding reset tokens. Do not silently allow password updates through generic user update.

### Email provider and configuration

- Use **Resend** transactional email over its HTTPS API, with API key `RESEND_API_KEY`; configure sender using `RESEND_FROM_EMAIL` and the internal UI base URL using `BACKOFFICE_URL` (development default `http://localhost:3002`).
- Implement a small provider adapter with standard-library HTTPS/JSON facilities unless existing runtime dependencies establish a better fit. Fail closed for a registered address if delivery is not configured or fails; never disclose that failure or account existence through the public response. Log neither email addresses, raw tokens, nor reset links.
- Always return the same HTTP 200 confirmation response for unknown addresses and successful delivery. Do not create/send a link for unknown users. Provider failures should not turn into distinct user-facing responses; record only safe operational logging.
- `.env.example` may contain variable names and harmless placeholders, never real credentials. Real Resend configuration/verified sender is required for an actual end-to-end delivery test; automated tests use a mocked provider and inspect link/token delivery in memory.

### Frontend

- Keep routes in the existing App Router and use client components for form state, API calls, browser query parsing, and navigation. Read `token` with Next 16's `useSearchParams` hook. Continue using `readApiResponse` for non-JSON/proxy error safety; use same-origin `/api/auth/...` URLs.
- Forgot form: show the same confirmation after any successful HTTP response, disable resubmission after success, and show only generic operational errors on network/server failure.
- Reset form: require matching new-password confirmation, handle missing token, show an invalid/expired-token message plus a recovery link, and route to `/login?reset=success` on success. Login displays a success confirmation for that query parameter.
- Change form: current/new/confirm fields, matching and minimum-password checks, authenticated `authFetch`, clear success/error feedback, and clear password inputs after success.
- Add the visible “Forgot your password?” login link. Allow unauthenticated access only to `/forgot-password` and `/reset-password` in `AuthGate`; preserve login/register public access. Link password change from the account/profile area or sidebar.

## Work breakdown

1. Add request/response schemas and reset-specific settings, including expiry validation and URL configuration.
2. Implement Resend delivery adapter and secure token generation/digest handling.
3. Add TinyDB token storage helpers and API endpoints; invalidate reset tokens on password change/reset and test failure modes.
4. Add API tests for unknown/existing user enumeration safety, provider failures, email link contents via mock, expiry, invalid token, single-use, successful login with new password, authenticated password change/wrong current password, and generic-update guard.
5. Add the three backoffice routes, update login/AuthGate/navigation, and preserve the established client-side bearer-token model.
6. Add frontend/API environment instructions, Resend setup, local mocked testing guidance, and manual configured-email end-to-end checklist.
7. Run API test suite and package/build validation; run backoffice lint and production build; review every staged path; record verified evidence and snapshot separately on `feature/auth-recovery`.

## Validation and acceptance gates

- `POST /auth/forgot-password` returns identical 200 response for existing and missing addresses, and mocked real-user delivery includes the reset URL with a token that is never stored raw.
- Correct token succeeds once; expired, malformed, unknown, consumed, and superseded tokens return 400; new password is usable and old password is rejected.
- Password change requires bearer auth, rejects incorrect current password with 400, changes credentials on success, and invalidates recovery tokens.
- UI routes, query-string handling, feedback, disabled repeat submission, password-match validation, and login recovery link are manually/structurally verified.
- No secrets, reset links, user addresses, API data, generated files, or unrelated context edits enter the snapshot.
- A true email-provider end-to-end delivery remains contingent on user-supplied Resend configuration; report this explicitly if unavailable.

## Snapshot protocol

The phase-three branch starts from the pushed phase-two snapshot, `feature/auth-frontend` at `7b4c555`. Once all gates pass, stage only reviewed phase-three API/backoffice/docs/tests files, update the saga and this plan with actual outcomes, inspect the staged diff for secrets and unrelated paths, commit the phase separately, and push only after verifying the result. Never include or reset pre-existing dirty/untracked work.

## Verified implementation outcome

- Implemented Resend delivery, digest-only 30-minute recovery tokens, generic enumeration-safe forgot responses, one-time reset, authenticated password change, and internal backoffice flows. Reset/password-change operations are serialized in-process to prevent concurrent token redemption; TinyDB remains unsuitable for cross-process transactional guarantees.
- API validation: `services/api/.venv/bin/python -m pytest tests -q` — **22 passed** (Starlette `httpx` deprecation warning only).
- Backoffice validation: `npm run lint` and `npm run build` — **passed** on Next.js 16.3.6; the 12 app routes prerendered successfully.
- Editor diagnostics: no errors in API or backoffice.
- Real Resend delivery was not performed because no provider credentials/sender were supplied. No public website changes are part of this phase.
- Snapshot is pending staged-path review and must exclude all unrelated dirty and untracked workspace items.
