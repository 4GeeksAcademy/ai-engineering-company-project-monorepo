# HealthCore Technology Inventory

Purpose: track technology present in this repository and additions over time.

## Current Baseline

- Documentation-first monorepo structure for AI Engineering milestones.
- TypeScript shared package scaffold in `packages/shared/` (`@repo/shared-types`).

## Tracking Format

For each new item, append a line using:

- Date: YYYY-MM-DD
- Area: folder or subsystem
- Technology: tool/framework/service
- Status: existing | introduced | deprecated
- Notes: short reason or impact

Example:

- 2026-08-29 | services/api | FastAPI | introduced | Central API for patient and operations endpoints.

## Entries

- 2026-09-11 | uis/website | HTML5 semantic markup | introduced | Structure for the bilingual public landing page and patient application form.
- 2026-09-11 | uis/website | Tailwind CSS (CDN) | introduced | Utility-first mobile-first styling with tablet and desktop breakpoints.
- 2026-09-11 | uis/website | Schema.org JSON-LD | introduced | MedicalOrganization and per-clinic MedicalClinic structured data for search visibility.
- 2026-09-11 | uis/website/js | Vanilla JavaScript | introduced | Language switching and real-time client-side form validation without a build step.
- 2026-09-11 | infra | Python http.server | introduced | Lightweight static host on port 8080 for Codespaces preview and external audit.
- 2026-09-16 | packages/shared | TypeScript domain model and utility layer | introduced | Exact HealthCore Milestone Two entities, collection operations, operational reports, and business validations.
