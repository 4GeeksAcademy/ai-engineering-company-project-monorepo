# HealthCore public website

The HealthCore public website presents the company's outpatient services and US clinic locations, supports English and Spanish, and collects structured patient enquiries for front-desk follow-up.

## Scope

- Bilingual landing page with HealthCore services, accessibility commitments, clinic locations, and contact information.
- Patient enquiry form at `/application`; it simulates submission locally and does not send data to a backend.
- Client-side validation for the exact milestone fields and rules, including conditional insurance and returning-patient fields.
- Schema.org `MedicalOrganization` and `MedicalClinic` structured data on the landing page.

The form is an enquiry form, not an instant booking system. It is for patients seeking care, not provider partnerships.

## Technology

This is a Next.js 16 (App Router) application built with React 19 and TypeScript, matching the talent pipeline tracker's toolchain. It has no backend or external API dependency. The visual identity uses HealthCore's teal and coral palette, editorial display typography, and the local logo asset in `public/assets/logo.svg`.

| Path                       | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `app/page.tsx`             | Home route (`/`) with Schema.org JSON-LD                       |
| `app/application/page.tsx` | Patient enquiry route (`/application`)                         |
| `components/`              | React components (header, footer, home page, enquiry form)     |
| `lib/translations.js`      | English and Spanish copy (JavaScript module)                   |
| `lib/clinics.js`           | US clinic data shared by the locations list, form, and JSON-LD |
| `lib/i18n.tsx`             | Language context; the choice persists in `localStorage`        |
| `lib/validation.ts`        | Typed enquiry validation rules                                 |

## Run locally

```bash
cd uis/website
npm install
npm run dev      # http://localhost:3001
npm run lint
npm run build
npm run start    # after a successful build
```

## Source of truth

Content, clinic details, contact information, form field names, validation rules, translations, and structured-data requirements come from the repository's HealthCore Milestone 1 context in `memory-bank/contexts/milestone-one.md`.
