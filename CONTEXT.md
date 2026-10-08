# CONTEXT.md — HealthCore

## Milestone 1: Public Website and Patient Enquiry

Canonical source: [HealthCore Web Fundamentals context](https://github.com/4GeeksAcademy/ai-engineering-syllabus/blob/main/content/contexts/01-web-fundamentals/CONTEXT-healthcore.en.md). Use this brief as the source of truth for all copy, services, clinic details, form fields, validations, and structured data. Do not invent clinic names, phone numbers, addresses, or services.

## Company

For this milestone, HealthCore's public website presents six US outpatient clinics across Texas, Florida, and Georgia. HealthCore was founded in 2011 in Austin, Texas, employs approximately 200 people, and generates around $28 million in annual revenue. Its competitive strengths are same-day appointments, extended hours, and bilingual staff at US locations.

## Website objective

HealthCore's current web presence is a 2019 placeholder that undermines patient confidence. Patient enquiries currently arrive by phone and take front-desk staff around 20 minutes to collect basic information. Priya Nair, Head of Patient Experience, needs a professional bilingual public website that presents HealthCore's care and US locations and collects structured patient enquiry details for a follow-up call.

The website must be fully available in English and Spanish. The enquiry form is for patients seeking care; it is not an appointment booking system, and it must not transmit or store submitted data in this demo.

## Landing page

Required section order: Header, Hero, Services, Why HealthCore, US Locations, Contact, Footer.

### Header

- Brand: HealthCore.
- Navigation: Home, Services, Locations, Contact.
- English/Spanish language toggle.

### Hero

- Headline: “Healthcare that fits your life”
- Subheadline: “6 outpatient clinics across the US offering same-day appointments, extended hours, and bilingual care — so you can get the attention you need, when you need it.”
- CTA: “Request an appointment”, linking to `application.html`.

### Services

1. **Primary Care & Chronic Disease**
   - Same-day appointments with primary care physicians.
   - Ongoing management of diabetes, hypertension, and asthma.
2. **Specialist Consultations**
   - Cardiology, endocrinology, pulmonology, and women's health.
   - Referrals coordinated within the HealthCore network.
3. **Preventive Health & Wellbeing**
   - Screenings, vaccinations, and annual check-ups.
   - Mental health counselling and psychiatry referrals.

### Why HealthCore

- Same-day appointments at most locations.
- Extended weekday hours until 7pm or 8pm; Saturdays are available.
- Bilingual English/Spanish staff at US locations.
- 6 US clinics across Texas, Florida, and Georgia.

### US clinic directory

| Clinic                    | City        | State | Phone          | Hours                        |
| ------------------------- | ----------- | ----- | -------------- | ---------------------------- |
| HealthCore Austin Central | Austin      | TX    | (512) 340-8800 | Mon-Fri 7am-8pm; Sat 9am-3pm |
| HealthCore Austin North   | Austin      | TX    | (512) 340-8810 | Mon-Fri 8am-7pm              |
| HealthCore San Antonio    | San Antonio | TX    | (210) 720-4400 | Mon-Fri 8am-6pm; Sat 9am-1pm |
| HealthCore Miami          | Miami       | FL    | (305) 510-7700 | Mon-Fri 7am-8pm; Sat 9am-4pm |
| HealthCore Orlando        | Orlando     | FL    | (407) 892-6600 | Mon-Fri 8am-6pm              |
| HealthCore Atlanta        | Atlanta     | GA    | (404) 330-9900 | Mon-Fri 8am-7pm              |

### Contact and footer

- General enquiries: `info@healthcore.com`.
- Austin HQ: (512) 340-8800.
- Miami: (305) 510-7700.
- UK (London): +44 20 7946 0100. This is a contact channel only; do not list non-US clinics or locations on the site.
- Partnership enquiries: `partnerships@healthcore.com`.
- Footer: © 2025 HealthCore. All rights reserved. Include LinkedIn, Facebook, and Instagram links as specified in the canonical source.

## Patient enquiry form

The form belongs in `application.html`. Use these exact `name` attributes:

| Field              | Name                  | Requirements                                                                                                                                       |
| ------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| First name         | `first_name`          | Required; 2–50 letters, including accented letters; no digits or punctuation.                                                                      |
| Last name          | `last_name`           | Required; 2–50 letters, including accented letters; no digits or punctuation.                                                                      |
| Date of birth      | `date_of_birth`       | Required; not in the future; age 0–120.                                                                                                            |
| Email address      | `email`               | Required; valid email format.                                                                                                                      |
| Phone number       | `phone`               | Required; begins with `+` and country code.                                                                                                        |
| Preferred language | `preferred_language`  | Required; English or Spanish.                                                                                                                      |
| Preferred clinic   | `preferred_clinic`    | Required; use clinic names from the directory.                                                                                                     |
| Preferred date     | `preferred_date`      | Required; at least one business day ahead and no more than 60 days ahead.                                                                          |
| Preferred time     | `preferred_time`      | Required; Morning (7am-12pm), Afternoon (12pm-5pm), or Evening (5pm-8pm).                                                                          |
| Service needed     | `service_type`        | Required; Primary Care, Chronic Disease Management, Specialist Consultation, Preventive Health, Women's Health, Paediatric Care, or Mental Health. |
| First visit        | `new_patient`         | Required Yes/No radio group.                                                                                                                       |
| Has insurance      | `has_insurance`       | Required Yes/No radio group.                                                                                                                       |
| Insurance provider | `insurance_provider`  | Required only when insured; maximum 100 characters.                                                                                                |
| Member ID          | `insurance_member_id` | Required only when insured; 6-20 alphanumeric characters.                                                                                          |
| Patient ID         | `patient_id`          | Optional; show only for returning patients; `HC-` followed by six alphanumeric characters.                                                         |
| Health concern     | `health_concern`      | Required; 20-500 characters with a live remaining-character counter.                                                                               |
| Contact consent    | `contact_consent`     | Required checkbox; must be checked.                                                                                                                |

If Paediatric Care is selected, the patient's age must be under 18. Evening availability must warn when the selected clinic closes before 8pm. If insurance is Yes, show and validate both insurance fields. If the patient is returning, show the optional Patient ID field.

Use the exact field-specific errors in the canonical source, translated into Spanish. Paediatric Care error: “Paediatric Care is available for patients under 18. Please check the date of birth or select a different service.”

### Required English validation messages

- First name: “First name must contain only letters and be at least 2 characters”
- Last name: “Last name must contain only letters and be at least 2 characters”
- Date of birth: “Enter a valid date of birth. Patient must be between 0 and 120 years old”
- Email: “Enter a valid email address (example: name@provider.com)”
- Phone: “Phone must include a country code (example: +1 305 555 0191)”
- Preferred language: “Select your preferred language”
- Preferred clinic: “Select the clinic you would like to visit”
- Preferred date: “Select a date at least 1 business day from today and no more than 60 days ahead”
- Preferred time: “Select your preferred time of day”
- Service type: “Select the type of care you are looking for”
- New patient: “Please indicate whether this is your first visit to HealthCore”
- Insurance choice: “Please indicate whether you have health insurance”
- Insurance provider: “Please enter your insurance provider name”
- Member ID: “Member ID must be between 6 and 20 alphanumeric characters”
- Health concern: “Please describe your health concern in at least 20 characters (X characters remaining)”
- Contact consent: “You must consent to being contacted before submitting this form”

On valid submission, simulate success locally and display:

> **Thank you for reaching out to HealthCore.**
>
> We have received your enquiry. A member of our front desk team will contact you within 1 business day to confirm your appointment details and answer any questions.
>
> If you need urgent assistance, please call your preferred clinic directly using the numbers listed on our website.
>
> We look forward to caring for you.

Include a visible note near the form: “Are you a healthcare provider or organisation looking to partner with HealthCore? Contact our operations team at partnerships@healthcore.com”.

## Structured data

On the landing page, include the canonical Schema.org `MedicalOrganization` details and one `MedicalClinic` entry for each of the six US clinics. Each clinic entry must include its name, telephone, opening hours, and a `parentOrganization` reference to HealthCore. Keep JSON-LD valid JSON.

## Verification expectations

- All user-facing content, labels, options, placeholders, validation errors, warnings, and success messages are available in English and Spanish.
- The form is accessible, validates on blur and submit, can be reset, and never sends or stores patient data.
- The site previews locally using the documented setup.
