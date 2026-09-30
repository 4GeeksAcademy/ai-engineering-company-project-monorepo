# Nexova Backoffice (`uis/backoffice`)

Internal operations app. First feature: **Análisis de incidentes**, a page that
uploads a support-ticket CSV to the backend (`services/api`, `incidents`
domain) and displays the validation/metrics report.

## Login

The API only answers to a valid JWT, so every page except `/login` needs a session.
`/login` posts the email and password to `POST /auth/login` (through the Vite proxy) and keeps the returned
token in `localStorage`; from then on every API call carries `Authorization: Bearer <token>`
(`src/lib/api.ts`). Auth is stateless: no cookies and no server-side session. The token expires by itself
(`ACCESS_TOKEN_EXPIRE_MINUTES` on the API); a `401` from the API, or "Cerrar sesión", forgets the token and
sends the user back to `/login`. You need an active user on the API: set `AUTH_INITIAL_EMAIL` /
`AUTH_INITIAL_PASSWORD` for its first start (see `services/api/README.md`). Accounts created through the
public sign-up wait for an admin to approve them and cannot log in before that.

## Route protection and token lifecycle

| Views | Access |
| --- | --- |
| `/login`, `/register` | Public (a logged-in user is sent to the app) |
| `/`, `/incidents`, `/suppliers`, `/account/profile`, and any unknown URL | Session required |

The public website (`uis/website`) has no authentication at all and must stay that way.

- **Guard** (`src/auth/RequireAuth.tsx`): a layout route around every protected view. It reads the token from
  `localStorage` on every navigation; without one it redirects to `/login`, remembering the page (and query) to
  come back to. Nothing protected is rendered or requested before that. This is client-side only (the server
  can't read `localStorage`); the real boundary is the API, which answers `401` without a valid token.
- **Storing:** login and a successful sign-up store the token in `localStorage` (`src/lib/token.ts`).
- **Sending:** every protected call goes through `apiFetch` (`src/lib/api.ts`), which adds
  `Authorization: Bearer <token>`. Only `POST /auth/login` and `POST /users` go without it.
- **Logout:** removes the token and goes to `/login`; the next login starts at `/`.
- **401:** a protected call answered `401` removes the token and goes to `/login` (then back to that page).
  A late `401` for a token that has since been replaced does not end the newer session.
- **Several tabs:** logging out or in in one tab (or clearing storage) is applied to the others at once.

## Sign-up

`/register` posts email, password and the optional profile (name, phone, address) to `POST /users`, then logs
straight in with `POST /auth/login` and, on success, stores the token and goes to `/`. The form validates with the
API's own limits before sending, and shows the API's `409` (email taken) and `422` (validation) next to the field.
The API creates sign-ups **inactive**, so today that automatic login gets a `401`: the page then says the account
was created and is waiting for an admin's approval (no token is stored). Once an admin activates the account, the
user signs in from `/login`. The Vite proxy forwards `/users` to the API for this call, except browser page loads.

## Pages

- `/login` — sign-in form.
- `/register` — sign-up form (account + optional profile), then automatic login.
- `/account/profile` — your email (read-only) and your profile (name, phone, address), loaded from `GET /auth/me`
  and saved with `PUT /profiles/me` (bearer token; only the changed fields, an emptied field is sent as `null`,
  which clears it). The Vite proxy forwards `/profiles` API calls, not page loads.
- `/` — landing with links to backoffice tools.
- `/incidents` — CSV upload (drag & drop or file picker) → metrics (totals,
  invalid records by rule, category/status breakdown with percentages,
  satisfaction distribution) → CSV download button.

## Running locally

From the repo root (npm workspaces):

```bash
npm install
cp uis/backoffice/.env.example uis/backoffice/.env   # optional: only needed if the API is not on localhost:8000 (Vite proxies /api and /auth by default)
npm run dev:backoffice
```

Requires `services/api` running (see its README) and a logged-in user — the page calls
`POST /api/incidents/analyze` and `GET /api/incidents/results/export` on
`VITE_API_BASE_URL`.

## End-to-end tests

With the API and `npm run dev` running (and `npx playwright install chromium`), from `uis/backoffice`:
`E2E_EMAIL=… E2E_PASSWORD=… npm run e2e` (login and suppliers; needs a fresh seed) and
`npm run e2e:register` (sign-up; `E2E_*` must be an active admin) and `npm run e2e:profile` (profile page; it
restores the profile at the end), `npm run e2e:guard` (route protection; also opens the public website on
`:5173`, skip with `E2E_WEBSITE_URL=none`) and `npm run e2e:token` (token lifecycle; needs the supplier seed). See the header of each file in `e2e/`.

## Verified

Manually driven end-to-end with a headless browser against a live
`services/api` instance: home page renders, upload of
`data/raw/incidents-nexova.csv` renders metrics that match the
CONTEXT's expected values exactly (100/96/4 records, category/status
percentages, 3.84 average satisfaction), and the download button produces a
valid `results.csv`. No console errors.
