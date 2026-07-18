# Nexova Talent Pipeline Tracker

Internal People and Talent interface for managing candidate records and hiring progress.

## Stack

- Next.js (App Router)
- React
- TypeScript

## Environment variables

Create a `.env` file in this project root with:

```bash
PROJECT_API_URL=https://playground.4geeks.com/tracker/api/v1
```

An example file is included in `.env.example`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Available routes

- `/` candidate list (filters by status/stage query params + search)
- `/candidates/new` register candidate
- `/candidates/[id]` candidate profile, status/stage updates, internal notes
- `/candidates/[id]/edit` edit candidate data

## Implemented milestone features

- Candidate list from `GET /records`
- Candidate detail from `GET /records/{id}`
- Status/stage patch via `PATCH /records/{id}`
- Notes list/add/delete via `/records/{id}/notes`
- Candidate create via `POST /records`
- Candidate edit via `PUT /records/{id}`
- Async loading/error/success feedback in key flows
- Company-specific labels for status/stage terminology
