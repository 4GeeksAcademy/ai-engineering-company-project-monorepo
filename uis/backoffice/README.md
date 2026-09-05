# TrackFlow Backoffice

Internal logistics operations entry view for TrackFlow.

## Purpose

This app starts the internal `uis/backoffice` surface with a company-relevant route (`/`) that shows warehouse assignment, carrier recommendation, and expected delivery windows for planning decisions.

## Tech

- Next.js App Router
- React
- JavaScript

## Run locally

```bash
cd uis/backoffice
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scope note

If this UI starts depending on real APIs or workers, add those backend services under `/services` following `services/README.md`.
