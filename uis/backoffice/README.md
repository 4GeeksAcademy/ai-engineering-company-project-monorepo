# Nexova Backoffice (`uis/backoffice`)

Internal operations app, built with **Next.js 16 (App Router)**, React 19 and Tailwind. Tools: **Incidencias**
(the incident manager: summary panel, filters by status/category/origin/branch, list, report/edit form, detail with lifecycle and history; `resolved` and `discarded` are final),
**Análisis de incidentes** (uploads a support-ticket CSV to `services/api` and shows the validation/metrics report),
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
│   │   ├── incidents/        /incidents (manager), /incidents/new (register), /incidents/[incidentId] (detail), /incidents/analysis (CSV report)
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

Requires `services/api` running (see its README). In a GitHub Codespace, open the forwarded port 5174; `next.config.mjs` allows
exactly that forwarded hostname in `allowedDevOrigins` (otherwise `next dev` answers its JavaScript with 403 and
the pages never come to life).

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

## Incident manager

`/incidents` loads the incidents of the API (load the history once with `services/api/.venv/bin/python scripts/seed_incidents.py`).
Types, labels, the lifecycle table and the form validations come from `@repo/shared-types`
([`packages/shared`](../../packages/shared)), the same contract the API enforces, so the form rejects what the API
would reject, in Spanish and per field. Anything that still fails on the server is shown as a clear message:
no connection, a conflict (the incident changed state meanwhile, so it is reloaded), not found, or a server error
(`src/lib/errors.ts`); an unexpected rendering error lands on `app/(app)/error.tsx`. Customer emails are masked in
the list and only shown in the detail. Check it end to end with `npm run e2e:incidents` (see the header of
`e2e/incidents.e2e.mjs`).

### Registering an incident (`/incidents/new`)

Reachable from the sidebar ("Nueva incidencia"). One form (`components/incidents/IncidentForm.tsx`, also used to edit)
with every field of the model: the five mandatory ones (title, category, origin, **branch**, description) are labelled
"obligatorio", the other three (client company, agent, customer email) "opcional". The status, id and dates are not
asked for: the incident is created `open` and the server assigns the rest.

- **Branch** is always visible and mandatory (`central` by default, "when no specific branch applies"). When the origin is
  *Sucursal* it is highlighted (amber frame and a note), `central` is emptied and the field gets the focus, because the API
  refuses `central` for a branch incident; going back to another origin restores `central`.
- **Loading**: while sending, the button is disabled and reads "Registrando…" with a spinner, every control is locked
  (`<fieldset disabled>`, `aria-busy`) and a synchronous guard stops a fast double click from sending twice.
- **Errors in plain Spanish, next to the field**: the form validates first with the shared rules
  (`validateIncidentDraft`); what still comes back from the API (`400` with the problematic `field`) is translated by
  `friendlyFieldError` (`lib/errors.ts`) and shown under that field, with the focus on the first one and a summary
  ("Revisa los 3 campos marcados"). Network and server failures use `describeError` ("No se pudo conectar…", "El servidor ha
  tenido un problema… referencia abc12345"); what was typed is never lost.
- **Success**: the form is cleared (origin *Cliente*, branch `central`) and a confirmation ("Incidencia NXV-000102 registrada
  correctamente", with links to the incident and the list) receives the focus.

### The panel (`/incidents`)

"Panel de incidencias": summary cards, filters (status, origin, branch, category, text, client, agent, dates), a paginated
list and, in each row, the status control.

- **Loading**: "Cargando incidencias…" on the first load and "Actualizando…" over the previous table on every filter, sort or
  page change; the table is dimmed meanwhile.
- **If loading fails**: a clear message with a **Reintentar** button (`describeError`: no connection, server problem…); the
  previous table, if any, stays visible.
- **No data**: without filters, "Todavía no hay incidencias registradas" with a button to register the first; with filters,
  "Ninguna incidencia coincide con estos filtros" with **Limpiar filtros**.
- **Change the status from the list**: every non-final row has a "Cambiar…" dropdown offering only the valid moves
  (`allowed_transitions` from the API). The new status is shown **at once** ("Guardando…"); when the server answers, the row
  takes the saved data and the summary cards are refreshed. Resolving or discarding (final) asks for confirmation first. If the
  server refuses (connection, 409 conflict, 500…) the row **goes back to its previous status**, is highlighted ("No se guardó")
  and a message says what failed and that the previous state was restored; after a conflict the list is reloaded.
  `RowStatusControl.tsx` is the control; `IncidentsPage.tsx#handleChangeStatus` holds the optimistic update and the undo.

### The summary cards never take the page down

`SummarySection.tsx` loads `GET /api/incidents/summary` **on its own**, apart from the list: the same filters apply, but a slow or
failing summary does not hold back (or break) the filters, the list or the status changes.

- **Loading**: placeholders with the shape of the cards and "Cargando el resumen…"; after 4 s it adds "Está tardando más de lo
  normal; la lista sigue disponible"; after 20 s the request is given up ("El resumen tarda demasiado en responder") and offered again.
- **Failure** (no connection, 500 with its reference, a response that is not a summary): an amber notice in the summary's place
  with **Reintentar**; the list works normally.
- **A failed refresh keeps the last numbers** (dimmed) and says so.
- If the panel itself throws while drawing, an error boundary replaces only the summary with a notice.
- The list's own "Reintentar" and every status change reload the summary too.
