# HealthCore backoffice

The backoffice is the internal HealthCore Digital entry view for operational teams. It is intentionally separate from the public patient website in `uis/website`.

## Scope

The root route presents a company-specific operations overview with:

- Network scale across 12 clinics and two countries.
- Patient access, revenue-cycle, and workforce signals from `CONTEXT.md`.
- Department priorities for Clinical Operations, Patient Experience, Revenue Cycle, and People & Workforce.
- A visible HIPAA and UK GDPR privacy reminder.
- A clear note that displayed figures are company context, not live patient data.

It contains no patient-level data and does not claim to be a live operational system.

The `/operations` route implements the Milestone 2 programming-fundamentals examples in `lib/milestone-two/`: typed claims, appointments, clinicians, and locations; collection and search helpers; denial and no-show calculations; CME compliance and licence alerts; and input validators. Its dashboard derives all KPI values from synthetic demonstration records in `lib/milestone-two/sample-data.ts`; these records are not live patient or workforce data. Replace them only when a reviewed, authorized backend data contract is available.

The `/suppliers` route implements the HealthCore supplier directory, including the seeded supplier registry, country/category filters, supplier registration, rate updates, and activation/suspension controls. It runs in this backoffice app on port 3002 and calls the centralized API through same-origin rewrites; no separate supplier frontend server is required.

## Continuous integration

`.github/workflows/backoffice-ci.yml` runs for pushes and pull requests that change `uis/backoffice/**` (and can be started manually). It installs the app's locked dependencies with `npm ci`, then runs `npm run lint` and `npm run build`. The same checks should pass locally before committing backoffice changes.

## Technology and route

This is a Next.js 16 (App Router) application built with React 19 and TypeScript. The entry route is `app/page.tsx` (`/`); the sidebar is a client component in `components/sidebar.tsx`, and overview content lives in the JavaScript module `lib/workspace-data.js`. No backend service is required for the current welcome view. Future APIs or background services belong under the repository's centralized `services/` folder.

The nested `talent-pipeline-tracker/` is a separate Next.js app with its own dependencies; it is excluded from this app's TypeScript and ESLint scope.

## Run locally

```bash
cd uis/backoffice
npm install
npm run dev      # http://localhost:3002
npm run lint
npm run build
npm run start    # after a successful build
```
