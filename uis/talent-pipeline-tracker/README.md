# Talent Pipeline Tracker

Internal TrackFlow People and Talent frontend for managing the Executive Assistant hiring pipeline.

## Tech stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS

## Environment variables

Copy `.env.example` to `.env.local` and adjust if needed:

```bash
cp .env.example .env.local
```

Required variable:

- `NEXT_PUBLIC_TRACKER_API_BASE_URL` (default: `https://playground.4geeks.com/tracker/api/v1`)

## Run locally

```bash
npm install
npm run dev
```

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Implemented milestone features

- Candidate list page at `/` with async loading, success, and error states.
- URL query parameter filters for status and stage using `useSearchParams`.
- Client-side search by candidate name or email without page reload.
- Candidate detail page at `/candidates/[id]` with full profile fields.
- Status and stage updates via `PATCH /records/:id`.
- Notes listing, creation, and deletion in detail view only.
- Candidate registration form using `POST /records`.
- Candidate edit form using `PUT /records/:id`.
- Typed API models and organized code structure in `components`, `services`, `types`, and `lib`.
