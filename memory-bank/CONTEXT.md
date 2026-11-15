# HealthCore Web Fundamentals Context — Milestone 1

Use the [canonical HealthCore Web Fundamentals context](https://github.com/4GeeksAcademy/ai-engineering-syllabus/blob/main/content/contexts/01-web-fundamentals/CONTEXT-healthcore.en.md) as the authority for this milestone. A local summary is maintained in [`CONTEXT-healthcore-milestone1.md`](../CONTEXT-healthcore-milestone1.md).

## Core target

Bilingual (English/Spanish) patient-facing public website with a landing page and a structured patient enquiry form. The form collects information for front-desk follow-up; it is not an appointment booking system and must not transmit or store submitted data in this demo.

## Content constraints

- Use only the approved company, services, US clinic directory, contact details, and clinic hours from the canonical brief.
- Do not invent clinic names, addresses, phone numbers, service offerings, or contact channels.
- Show the six specified US clinics publicly, across Texas, Florida, and Georgia.
- Keep all user-facing landing page and form content bilingual, including errors, option labels, placeholders, and success messages.
- Include the provider partnership contact note, distinct from the patient enquiry flow.

## Patient form requirements

Use the exact field `name` attributes and validation requirements from the canonical brief: names, date of birth, email, international phone, preferred language and clinic, preferred date and time, service, new-patient and insurance choices, conditional insurance details, optional patient ID for returning patients, health concern with character counter, and contact consent. Validate dates, pediatric eligibility, clinic-hour warnings, conditional fields, and consent. Display the specified success message after local validation.

## Deliverables

1. English/Spanish language switch.
2. Landing sections for Home, Services, Why HealthCore, Locations, and Contact.
3. Approved US clinic directory and Schema.org `MedicalOrganization` plus `MedicalClinic` records.
4. Patient enquiry form with client-side validation and clear/reset control.
5. Local preview instructions in the project README.
