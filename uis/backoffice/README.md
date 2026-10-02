# Nexova Backoffice (`uis/backoffice`)

Internal operations app. First feature: **Análisis de incidentes**, a page that
uploads a support-ticket CSV to the backend (`services/api`, `incidents`
domain) and displays the validation/metrics report.

## Pages

- `/` — landing with links to backoffice tools.
- `/incidents` — CSV upload (drag & drop or file picker) → metrics (totals,
  invalid records by rule, category/status breakdown with percentages,
  satisfaction distribution) → CSV download button.

## Running locally

From the repo root (npm workspaces):

```bash
npm install
cp uis/backoffice/.env.example uis/backoffice/.env   # optional: only needed if the API is not on localhost:8000 (Vite proxies /api by default)
npm run dev:backoffice
```

Requires `services/api` running (see its README) — the page calls
`POST /api/incidents/analyze` and `GET /api/incidents/results/export` on
`VITE_API_BASE_URL`.

## Verified

Manually driven end-to-end with a headless browser against a live
`services/api` instance: home page renders, upload of
`data/raw/incidents-nexova.csv` renders metrics that match the
CONTEXT's expected values exactly (100/96/4 records, category/status
percentages, 3.84 average satisfaction), and the download button produces a
valid `results.csv`. No console errors.
