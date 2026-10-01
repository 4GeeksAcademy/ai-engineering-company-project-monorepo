# Internal Authentication Flows Plan

## Scope

Implement the phase-two authentication experience in `uis/backoffice`, the tracked internal Next.js application. The public website and the untracked `uis/application` material are outside this phase.

## API contract

- `POST /auth/login` accepts `{ email, password }` and returns `{ access_token, token_type }`.
- `POST /users` registers a user and accepts email, password, and optional profile fields (`name`, `phone`, `address`).
- `GET /auth/me` returns the authenticated user and embedded profile.
- `GET /profiles/me` and `PUT /profiles/me` read and update the authenticated profile.
- Protected requests send `Authorization: Bearer <access_token>`.

## Implementation

- Add `/login` and `/register` client pages with field-level validation, API errors, token persistence, and post-auth navigation. Handle non-JSON proxy/upstream responses without leaking JSON parse exceptions.
- Add `/account/profile` with authenticated identity/profile loading and profile updates.
- Add a small client auth module for token storage, protected fetches, logout, and the shared 401 response.
- Add a client-side guard to internal routes because the token exists only in `localStorage`; do not use Next middleware for authentication.
- Add profile and logout actions to the existing backoffice navigation.
- Extend the existing same-origin Next rewrites for `/auth`, `/users`, and `/profiles` while preserving supplier and incident routes.
- Attach the bearer token to existing protected supplier and incident requests, and redirect on 401.

## Validation and snapshot

- Run `npm run lint` and `npm run build` in `uis/backoffice` (both passed).
- Exercise registration/login, protected navigation, profile loading/update, logout, and a 401 response against the phase-one API where available.
- Inspect staged paths and snapshot only reviewed phase-two files on a separate frontend-auth branch (completed as `feature/auth-frontend`, commit `c0f9b03`). Do not include generated files, local data, secrets, or unrelated worktree changes.