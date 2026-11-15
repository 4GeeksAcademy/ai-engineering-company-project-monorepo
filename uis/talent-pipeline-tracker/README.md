# HealthCore Talent Pipeline Tracker

Internal candidate management for the Executive Assistant search at HealthCore's Austin headquarters. Built with Next.js App Router and the course REST API.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the course API base URL (including its API version prefix, if applicable).
3. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).
4. Run `npm run lint` and `npm run build` to check the app.

The app calls the API directly from the browser, so the API must allow the local app's origin via CORS. The configured API returns paginated records (`data`, `total`, `page`, `limit`) with backend field names (`full_name`, `email`, `phone`, `position`, `linkedin_url`, `cv_url`, `experience_years`, `status`, `stage`, `applied_at`). The client maps those to its UI model and submits the corresponding API field names. Notes are loaded from and posted to `/records/:id/notes` as `{ "content": "..." }`.

Status and stage codes are always rendered using the HealthCore briefing labels, never shown as raw codes. Notes appear only on candidate detail pages. Registration and edit forms use required name, email, position, and application date fields, with additional API candidate properties available in the form.
