# Talent Pipeline Tracker

Frontend for HealthCore's recruitment pipeline, built with Next.js, React, TypeScript, and Tailwind CSS. Currently includes a basic landing page.

## Planned features

- Show all candidates in a list with name, position, status, and stage visible immediately.
- Filter by status and stage, and search by name or email without reloading the page.
- Open a candidate's full details and update their status or stage from there.
- Add internal notes after each call or interview, and remove them when they are no longer relevant.
- Register candidates who come through referrals and correct their information from the candidate details page.

## Context of the active search

| Field | Value |
| --- | --- |
| Position | Executive Assistant |
| Company | HealthCore |
| Location | Austin headquarters |
| Profile | Executive support experience, calendar and travel management, professional English, discretion in handling sensitive information |

## API and data

The mock API is centrally deployed and shared across all company contexts in the course. Fields, values, and structure are defined in the backend technical specification. No adaptation is required.

### `status` values

| API value | UI label |
| --- | --- |
| `received` | Received |
| `in_progress` | In progress |
| `selected` | Selected |
| `discarded` | Discarded |

### `stage` values

| API value | UI label |
| --- | --- |
| `pending` | Pending review |
| `review` | Under review |
| `personal_interview` | Personal interview |
| `technical_interview` | Technical interview |
| `offer_presented` | Offer presented |

Raw API values such as `in_progress` and `personal_interview` must never appear in the interface. Always display the UI labels from these tables.

## Implementation plan

See [plan.md](plan.md) for the ordered implementation steps and requirement checks.

## Run locally

Install Node.js and npm, then run these commands from this directory:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

- `npm run dev` - Start the development server.
- `npm run build` - Build for production.
- `npm start` - Run the production build (after building).
- `npm run lint` - Check code with ESLint.

## Main files

- `app/page.tsx` - Home page.
- `app/layout.tsx` - Shared layout and metadata.
- `app/globals.css` - Global styles.
