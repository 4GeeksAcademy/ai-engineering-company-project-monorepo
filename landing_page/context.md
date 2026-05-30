# CONTEXT.md — Nexova

## Milestone 1: Your Company's Public Website


> This document describes your company and the specific situation you're building this milestone for. Read it completely before writing any code. Everything you build must reflect this context.

---

## Your company

**Nexova** is a human resources consulting and talent acquisition firm founded in 2011, headquartered in Valencia, Spain, with an expansion office in Miami, Florida. It operates across three business lines: executive and mid-management headhunting, customer support team outsourcing for technology companies, and corporate training in soft skills and leadership. It has approximately 120 employees and generates 8 million dollars in annual revenue. Its clients are primarily mid-sized companies in the technology, retail, and financial services sectors.

---

## Your department and the problem you must solve

You work in the **Marketing and Communications** team, led by Carmen Ruiz. Nexova's corporate website was built in 2019 and hasn't had meaningful updates. It's slow, not accessible, and doesn't reflect the company's current positioning. Additionally, there's no system to capture leads: people interested in job opportunities or services must send a generic email to <info@nexova.com>. Carmen needs a modern website that professionally presents Nexova's services and captures information from potential candidates in a structured way.

---

## Your stakeholder

**Carmen Ruiz**, Head of Marketing

> Hi,
>
> I need you to build our new corporate website. It should have a landing page that presents who we are, what we do, and why companies choose us to manage their talent. I also need a separate page with a form so professionals interested in job opportunities can register. We currently receive CVs by email with no structure and it's chaos. I want to capture: contact details, professional experience, sector of interest, English level, and availability. The site must be responsive, accessible, and SEO optimized. Use Tailwind for design and make sure the form validations work correctly.

---

## Language scope

- Multilingual support is **optional but highly recommended** due to Nexova's operations between Spain and Miami.
- You must choose one **base language** for the full website and form experience.
- If you implement a second language, treat it as an enhancement (do not reduce quality/completeness in the base language).

## Landing page content

Your landing page must include the following sections, in this order:

### Header

- Logo or name "Nexova"
- Navigation: Home | Services | Talent | Contact

### Hero

- **Headline:** "We build exceptional teams for growing companies"
- **Subheadline:** "Human resources consulting and talent acquisition firm with over 10 years helping technology, retail, and financial services companies find and develop the best talent."
- **Call to action:** Button "Join our talent pool" linking to the form

### Services (3 columns)

1. **Executive Headhunting**
   - Search and selection of executive and mid-management profiles
   - Personalized process with replacement guarantee

2. **Customer Support Outsourcing**
   - Specialized teams for technology companies
   - Continuous training and dedicated supervision

3. **Corporate Training**
   - Soft skills and leadership programs
   - In-person and online courses adapted to each organization

### Why Nexova (2 columns)

- **12 years of experience** in the Latin American market
- **Regional presence:** Spain and United States
- **+500 successful selection processes** completed
- **Sector specialization** in technology, retail, and finance

### Contact

- Email: <contacto@nexova.com>
- Valencia: +34 960 123 456
- Miami: +1 305 555 0191

### Footer

- © 2025 Nexova. All rights reserved.
- LinkedIn | Instagram

---

## Talent registration form fields

Your form must capture the following information:

| Field                        | Type     | Validation                                                    | Required |
| ---------------------------- | -------- | ------------------------------------------------------------- | -------- |
| **Full name**                | text     | Minimum 2 words                                               | Yes      |
| **Email**                    | email    | Valid email format                                            | Yes      |
| **Phone**                    | tel      | Format: +[country code] [number] (e.g., +34 612 345 678)      | Yes      |
| **Country of residence**     | select   | Spain / United States / Other                                 | Yes      |
| **Years of experience**      | number   | Between 0 and 50                                              | Yes      |
| **Sector of interest**       | select   | Technology / Retail / Financial Services / Consulting / Other | Yes      |
| **English level**            | select   | Basic / Intermediate / Advanced / Native                      | Yes      |
| **Availability**             | radio    | Immediate / 1 month / 2-3 months / Just exploring             | Yes      |
| **LinkedIn (profile URL)**   | url      | Valid URL format                                              | No       |
| **Additional comments**      | textarea | Maximum 500 characters                                        | No       |
| **I accept the data policy** | checkbox | Must be checked to submit                                     | Yes      |

---

## Specific validations

1. **Email:** Must validate that it contains @ and a valid domain (e.g., <user@domain.com>)
2. **Phone:** Must start with + followed by country code
3. **Years of experience:** Cannot be negative or greater than 50
4. **LinkedIn:** If provided, must be a valid URL (start with http:// or https://)
5. **Comments:** Limit to 500 characters with visible counter
6. **Data policy:** Checkbox must be checked; if not, show error: "You must accept the data processing policy to continue"

---

## Expected error messages

When a field doesn't meet validation, display these specific messages:

- **Full name:** "Name must contain at least first and last name"
- **Email:** "Enter a valid email (example: <name@company.com>)"
- **Phone:** "Phone must include country code (example: +34 612 345 678)"
- **Country:** "Select your country of residence"
- **Years of experience:** "Years of experience must be between 0 and 50"
- **Sector:** "Select your sector of interest"
- **English level:** "Indicate your English level"
- **Availability:** "Select your availability"
- **LinkedIn:** "If you include LinkedIn, it must be a valid URL"
- **Comments:** "Comments cannot exceed 500 characters (X remaining)"
- **Data policy:** "You must accept the data processing policy to continue"

---

## Success message

When the form validates correctly (simulate submission), display:

> **Thank you for your interest in Nexova!**
>
> We have received your information. Our selection team will review it and contact you if your profile matches any of our current or future opportunities.
>
> In the meantime, follow us on LinkedIn to stay updated on our vacancies and professional development content.

---

## Specific restriction

The form is designed for **professionals in active or passive job search**, not for companies looking to hire Nexova's services. If a user asks about hiring headhunting or training services, the form must include a visible message that says: "Are you a company looking for talent? Write to us at <contacto@nexova.com>"

---

## Required Schema.org markup

Implement the following Schema.org markup on your landing page:

```json
{
  "@context": "<https://schema.org>",
  "@type": "Organization",
  "name": "Nexova",
  "description": "Human resources consulting and talent acquisition",
  "url": "<https://nexova.com>",
  "foundingDate": "2011",
  "address": [
    {
      "@type": "PostalAddress",
      "addressCountry": "ES",
      "addressLocality": "Valencia",
      "addressRegion": "Comunidad Valenciana"
    },
    {
      "@type": "PostalAddress",
      "addressCountry": "US",
      "addressLocality": "Miami",
      "addressRegion": "Florida"
    }
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+34-960-123-456",
    "contactType": "customer service",
    "availableLanguage": ["Spanish", "English"]
  },
  "sameAs": [
    "https://linkedin.com/company/nexova",
    "https://instagram.com/nexova"
  ]
}
```