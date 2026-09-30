# Nexova Backoffice (`uis/backoffice`)

Internal operations app, built with **Next.js 16 (App Router)**, React 19 and Tailwind. Tools: **Análisis de
incidentes** (uploads a support-ticket CSV to `services/api` and shows the validation/metrics report),
**Proveedores** (supplier directory) and **Mi perfil**.

## Structure

```
src/
├── app/                      Next.js routes (App Router)
│   ├── layout.tsx            root layout: <html>, metadata, <AuthProvider>
│   ├── (public)/             no session needed
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                session required
│   │   ├── layout.tsx        layout guard: <RequireAuth> + sidebar
│   │   ├── page.tsx          /
│   │   ├── incidents/        /incidents
│   │   ├── suppliers/        /suppliers
│   │   └── account/profile/  /account/profile
│   └── not-found.tsx         unknown URL → /
├── views/                    the page components (client components)
├── auth/                     AuthContext (useAuth hook) and RequireAuth (guard)
├── lib/                      token.ts, api.ts, returnTo.ts, profileFields.ts
└── components/               sidebar layout, incidents and suppliers widgets
```

`(public)` and `(app)` are route groups: they share a layout but do not appear in the URL. The route files
only import a component from `views/`; every view is a client component (`"use client"`) because the session
lives in the browser.

## Login

The API only answers to a valid JWT, so every page except `/login` and `/register` needs a session. `/login` posts
the email and password to `POST /auth/login` and keeps the returned token in `localStorage`; from then on every
API call carries `Authorization: Bearer <token>` (`src/lib/api.ts`). Auth is stateless: no cookies and no
server-side session. The token expires by itself (`ACCESS_TOKEN_EXPIRE_MINUTES` on the API); a `401` from the API,
or "Cerrar sesión", forgets the token and sends the user back to `/login`. You need an active user on the API: set
`AUTH_INITIAL_EMAIL` / `AUTH_INITIAL_PASSWORD` for its first start (see `services/api/README.md`), or sign up at
`/register`.

## Route protection and token lifecycle

| Views | Access |
| --- | --- |
| `/login`, `/register` | Public (a logged-in user is sent to the app) |
| `/`, `/incidents`, `/suppliers`, `/account/profile`, and any unknown URL | Session required |

The public website (`uis/website`) has no authentication at all and must stay that way.

- **Guard** (`src/auth/RequireAuth.tsx`, used by `src/app/(app)/layout.tsx`): a client-side layout guard around
  every protected view. It reads the token from `localStorage` on every navigation; without one it redirects to
  `/login?next=<page>`, and login sends you back there. `next` only accepts paths inside the app (no open
  redirect: `?next=https://…` or `//…` fall back to `/`). Nothing protected is rendered or requested before
  that, not even in the server HTML (which only says "Comprobando la sesión…").
- **Why not Next.js proxy (formerly "middleware")?** It runs on the server, and the token is in
  `localStorage`, which only the browser can read. The guard is a UX gate; the real boundary is the API, which
  answers `401` without a valid token.
- **Storing:** login and a successful sign-up store the token in `localStorage` (`src/lib/token.ts`).
- **Sending:** every protected call goes through `apiFetch` (`src/lib/api.ts`), which adds
  `Authorization: Bearer <token>`. Only `POST /auth/login` and `POST /users` go without it.
- **Logout:** removes the token and goes to `/login`; the next login starts at `/`.
- **401:** a protected call answered `401` removes the token and goes to `/login?next=<that page>`. A late `401`
  for a token that has since been replaced does not end the newer session.
- **Several tabs:** logging out or in in one tab (or clearing storage) is applied to the others at once.

## Sign-up

`/register` posts email, password and the optional profile (name, phone, address) to `POST /users`, then logs
straight in with `POST /auth/login` and, on success, stores the token and goes to `/`. The form validates with the
API's own limits before sending, and shows the API's `409` (email taken) and `422` (validation) next to the field.
The API creates sign-ups active, so the new user is in straight away. If that automatic login still fails (network,
or an admin switched the account off in between), the page says the account was created and points to `/login`;
it is never reported as a failed sign-up.

## Pages

- `/login` — sign-in form.
- `/register` — sign-up form (account + optional profile), then automatic login.
- `/account/profile` — your email (read-only) and your profile (name, phone, address), loaded from `GET /auth/me`
  and saved with `PUT /profiles/me` (bearer token; only the changed fields, an emptied field is sent as `null`,
  which clears it).
- `/` — landing with links to backoffice tools.
- `/incidents` — CSV upload (drag & drop or file picker) → metrics (totals, invalid records by rule,
  category/status breakdown with percentages, satisfaction distribution) → CSV download button.
- `/suppliers` — supplier directory: list, filters, create, edit rate, suspend/activate.

## API calls in development

The app calls the API on its own origin, and `next.config.mjs` rewrites those calls to the API
(`API_PROXY_TARGET`, default `http://localhost:8000`). No CORS, and in Codespaces only port 5174 needs forwarding.
`/api` and `/auth` always go to the API; `/users` and `/profiles` only for API calls, not browser page loads.
To call an API on another domain instead, set `NEXT_PUBLIC_API_BASE_URL` (see `.env.example`).

## Running locally

From the repo root (npm workspaces):

```bash
npm install
cp uis/backoffice/.env.example uis/backoffice/.env.local   # optional: only if the API is not on localhost:8000
npm run dev:backoffice          # http://localhost:5174
```

Other scripts (from the repo root: `npm run build:backoffice`, `npm run typecheck:backoffice`; or from
`uis/backoffice`): `npm run build` (production build), `npm run start` (serve that build on :5174),
`npm run typecheck` (`next typegen` + `tsc`).

Requires `services/api` running (see its README).

**TypeScript version:** the backoffice uses TypeScript 5.9 (its own devDependency), while the rest of the repo
uses TypeScript 7. Next.js reads `tsconfig.json` and type-checks through the TypeScript JavaScript API, which
TypeScript 7 (the native compiler) no longer ships.

`AGENTS.md` / `CLAUDE.md` are written by `next dev` itself (notes for AI coding assistants); they are committed
so the working tree stays clean.

## End-to-end tests

With the API and the backoffice running (`npm run dev`, or `npm run build && npm run start`) and
`npx playwright install chromium`, from `uis/backoffice`, with `E2E_EMAIL=… E2E_PASSWORD=…` of an active user:

- `npm run e2e` — login and suppliers (needs a fresh seed: `uv run seed --reset` in `services/api`).
- `npm run e2e:register` — sign-up.
- `npm run e2e:profile` — profile page (restores the profile at the end).
- `npm run e2e:guard` — route protection, open-redirect check, several tabs; also opens the public website on
  `:5173` (skip with `E2E_WEBSITE_URL=none`).
- `npm run e2e:token` — token lifecycle (needs the supplier seed).

All five pass against `next dev` and against the production build. See the header of each file in `e2e/`.
