# HealthCore Operations Backoffice

Internal HealthCore Digital dashboard surfacing Milestone 2 operational reporting utilities.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- Imports `@healthcore/utils` from `../../src/utils` (not copied)

## Setup

```bash
npm install
npm run dev
```

Default URL: `http://localhost:3000` (use a different port if running alongside other apps: `npm run dev -- -p 3001`)

## Dashboard sections

| Section | Owner | M2 functions |
| --- | --- | --- |
| Revenue Cycle & Billing | Tom Callahan | `calculateDenialRate`, `denialRateByPayer`, `flagHighDenialPayers` |
| Clinical Operations | Dr. Marcus Reid | `noShowRateByLocation`, `flagHighNoShowLocations` |
| People & Workforce | Diane Foster | `generateCMEReport`, `getCliniciansAtRisk` |

Sample data loaded from `@healthcore/fixtures` (`tests/utils/fixtures.ts`).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
