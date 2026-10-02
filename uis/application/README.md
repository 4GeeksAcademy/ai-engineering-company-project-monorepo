# `uis/application`

Nexova application front end. It currently contains the **supplier directory** page (`app/suppliers/`), used by the Purchasing / HR team to see, filter and manage suppliers against the API in [`services/api`](../../services/api).

## Structure

```
uis/application/
├── index.html
├── app/
│   ├── main.tsx            entry point
│   ├── App.tsx             header + routes (/ redirects to /suppliers)
│   └── suppliers/          supplier directory page
│       ├── page.tsx        the page: loads the list, filters, feedback
│       ├── SupplierRow.tsx one table row: rate editor, status toggle, renewal highlight
│       ├── SupplierForm.tsx new-supplier form with client-side validation
│       ├── api.ts          calls to the API (GET/POST/PATCH /api/suppliers)
│       └── types.ts        supplier types (fields, categories, statuses)
└── e2e/suppliers.e2e.mjs   Playwright end-to-end test
```

## What the page does

- Lists every supplier from the API: name, country, categories, monthly rate (with currency), renewal date and status.
- Filters by country and by category without reloading the page.
- Creates suppliers with client-side validation; if the API rejects the input it shows the API message.
- Edits the monthly rate and activates/suspends a supplier; the row updates after the API responds.
- Distinguishes active from suspended suppliers (green/red badge, dimmed row) and highlights contracts renewing within 60 days.

## Run it

```bash
# terminal 1 — API (port 8000)
cd services/api && uv run uvicorn main:app --port 8000

# terminal 2 — this app (port 5175), from the repo root
npm run dev:application
```

Open http://localhost:5175/suppliers. Vite proxies `/api` to `http://localhost:8000` (see `vite.config.ts`), so no CORS setup is needed, also in Codespaces.

## Checks

```bash
npm run typecheck:application     # from the repo root
cd uis/application && npm run e2e # needs API + app running and a fresh `uv run seed --reset`
```

`E2E_BROWSER=firefox npm run e2e` runs the same test in Firefox.
