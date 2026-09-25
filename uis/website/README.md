# HealthCore public website

The HealthCore public website presents the company's outpatient services and US clinic locations, supports English and Spanish, and collects structured patient enquiries for front-desk follow-up.

## Scope

- Bilingual landing page with HealthCore services, accessibility commitments, clinic locations, and contact information.
- Patient enquiry form at `application.html`; it simulates submission locally and does not send data to a backend.
- Client-side validation for the exact milestone fields and rules, including conditional insurance and returning-patient fields.
- Schema.org `MedicalOrganization` and `MedicalClinic` structured data on the landing page.

The form is an enquiry form, not an instant booking system. It is for patients seeking care, not provider partnerships.

## Technology

This is a static HTML, CSS, and JavaScript site. It has no package manager, framework, backend, or external API dependency. The visual identity uses HealthCore's teal and coral palette, editorial display typography, and the local logo asset in `assets/logo.svg`.

## Run locally

Open `index.html` directly in a browser, or serve this folder with any static file server:

```bash
python3 -m http.server 4173 --directory uis/website
```

Then open `http://localhost:4173/index.html`.

## Source of truth

Content, clinic details, contact information, form field names, validation rules, translations, and structured-data requirements come from the repository's HealthCore Milestone 1 context in `memory-bank/contexts/milestone-one.md`.
