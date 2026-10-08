# HealthCore Web Fundamentals — Milestone 1

Canonical source: [HealthCore context in the 4Geeks Academy syllabus](https://github.com/4GeeksAcademy/ai-engineering-syllabus/blob/main/content/contexts/01-web-fundamentals/CONTEXT-healthcore.en.md)

This file records the approved facts used by the public website and its patient enquiry flow. Follow the linked brief for full copy, required field names, validation messages, and JSON-LD schema.

## Company and website

HealthCore is an outpatient healthcare services company founded in 2011 in Austin, Texas. It operates 12 outpatient clinics: nine in the United States (Texas, Florida, and Georgia) and three in the United Kingdom (London and Manchester). It offers primary care, specialist consultations, chronic disease management, and preventive health programmes; employs approximately 200 people; and generates around $28 million in annual revenue. Its competitive strengths are same-day appointments, extended hours, and bilingual staff at US locations.

For this milestone, the public website presents the six US outpatient clinics in the approved directory below. This public-site scope does not change the broader company profile above.

The site is for patients seeking care. It must be available in English and Spanish. The landing page presents HealthCore, services, US clinic locations, and contact details. The patient enquiry form collects structured details for a front-desk follow-up; it is not an appointment booking system. Do not invent clinic names, contact channels, or services.

## Approved services

- Primary care and chronic disease management, including diabetes, hypertension, and asthma.
- Specialist consultations: cardiology, endocrinology, pulmonology, and women's health; referrals coordinated within HealthCore.
- Preventive health and wellbeing: screenings, vaccinations, annual check-ups, mental health counselling, and psychiatry referrals.

## US clinic directory

| Clinic                    | City        | State | Phone          | Hours                        |
| ------------------------- | ----------- | ----- | -------------- | ---------------------------- |
| HealthCore Austin Central | Austin      | TX    | (512) 340-8800 | Mon-Fri 7am-8pm; Sat 9am-3pm |
| HealthCore Austin North   | Austin      | TX    | (512) 340-8810 | Mon-Fri 8am-7pm              |
| HealthCore San Antonio    | San Antonio | TX    | (210) 720-4400 | Mon-Fri 8am-6pm; Sat 9am-1pm |
| HealthCore Miami          | Miami       | FL    | (305) 510-7700 | Mon-Fri 7am-8pm; Sat 9am-4pm |
| HealthCore Orlando        | Orlando     | FL    | (407) 892-6600 | Mon-Fri 8am-6pm              |
| HealthCore Atlanta        | Atlanta     | GA    | (404) 330-9900 | Mon-Fri 8am-7pm              |

## Contact details

- General enquiries: info@healthcore.com
- Austin HQ: (512) 340-8800
- Miami: (305) 510-7700
- UK (London): +44 20 7946 0100. This is a contact channel only; do not list non-US clinics or locations on the site.
- Healthcare partnerships: partnerships@healthcore.com

## Patient enquiry form

The form belongs at `application.html`. Use the exact `name` attributes from the canonical source. It includes first and last name, date of birth, email, international phone, preferred language, preferred clinic, preferred date and time, service type, first-visit and insurance choices, conditional insurance details, optional returning-patient ID, health concern with live character count, and contact consent.

Validation must include the date-of-birth age bounds (0-120), business-day and 60-day appointment date window, under-18 check for paediatric care, clinic-hour warning for evening preferences, conditional insurance fields, `HC-` patient ID format, and 20-500 character health concern. Keep all labels, hints, errors, status messages, and option labels bilingual. Submission is simulated locally and must not transmit or store patient data.

The patient form must clearly distinguish patient enquiries from provider partnership enquiries and display the approved partnership email.
