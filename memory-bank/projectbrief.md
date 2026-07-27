# HealthCore Monorepo — Project Brief

## Company

**HealthCore** is an outpatient healthcare services company founded in 2011 in Austin, Texas. It operates **12 clinics** — 9 in the United States (Texas, Florida, Georgia) and 3 in the United Kingdom (London and Manchester). The network employs approximately **200 people** and generates around **$28M** in annual revenue.

HealthCore's competitive edge is accessibility: same-day appointments, extended hours, and bilingual staff at US locations.

## Your unit

You are part of **HealthCore Digital**, the internal technology unit led by **James Osei (CTO)**. The unit builds systems, workflows, and intelligent tools so HealthCore can operate as a modern healthcare provider.

## Problem this monorepo solves

HealthCore's infrastructure has not kept pace with growth:

- **Dual EHR systems** (US and UK) with no shared data layer
- **Manual billing and spreadsheet-based HR/CME tracking**
- **No unified patient booking** — 22% network no-show rate, 14% US claims denial rate
- **Legacy public web presence** — a 2019 placeholder undermines patient trust

The monorepo centralises frontend applications, TypeScript business logic, agent infrastructure, and documentation so HealthCore Digital can ship incrementally without fragmenting code across repositories.

## Project objectives

| Stakeholder | Objective |
| --- | --- |
| **Priya Nair** (Patient Experience) | Bilingual public website and structured patient enquiry capture |
| **Tom Callahan** (Billing) | Denial-rate reporting and billing operational visibility |
| **Dr. Marcus Reid** (Clinical Ops) | No-show rate tracking and location-level clinical metrics |
| **Diane Foster** (People) | CME compliance monitoring and recruitment tooling (M3 tracker) |
| **James Osei** (CTO) | Reusable utilities, agent rules, memory bank, and future automation |

## Regulatory constraint

HealthCore operates under **HIPAA** (US) and **UK GDPR**. Any system handling protected health information (PHI) must meet legal standards for storage, access, and audit. Patient-facing forms collect enquiry data only — treat all clinical and billing identifiers as sensitive in internal tools.
