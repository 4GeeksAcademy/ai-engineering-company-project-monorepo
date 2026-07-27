# HealthCore Public Website

Next.js migration of the Milestone 1 bilingual public website for HealthCore Patient Experience.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4

## Setup

```bash
npm install
npm run dev
```

Default URL: `http://localhost:3000`

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page (hero, services, locations, contact) |
| `/application` | Patient enquiry form with validation |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Notes

- EN/ES language toggle applies app-wide via `LanguageProvider`
- Form field `name` attributes and validation rules match `context/01_CONTEXT.md`
- Legacy static site remains at repository root until migration is approved
