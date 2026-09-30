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

## Pages

- `/login` — sign-in form.
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

## Verified

Manually driven end-to-end with a headless browser against a live
`services/api` instance: home page renders, upload of
`data/raw/incidents-nexova.csv` renders metrics that match the
CONTEXT's expected values exactly (100/96/4 records, category/status
percentages, 3.84 average satisfaction), and the download button produces a
valid `results.csv`. No console errors.
