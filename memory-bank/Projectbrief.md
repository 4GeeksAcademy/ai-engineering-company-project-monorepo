# HealthCore Project Brief

## Company identity

HealthCore is an outpatient healthcare services company founded in 2011 in Austin, Texas. It operates 12 clinics: 9 in the United States and 3 in the United Kingdom. The company employs approximately 200 people and has annual revenue of approximately $28 million.

## What the company does

HealthCore provides:

- Primary care
- Specialist consultations
- Chronic disease management
- Preventive health programmes

Its competitive position is based on accessible care, including same-day appointments, extended hours, and bilingual staff at US locations.

## Business problem

HealthCore's clinical and operational infrastructure has not kept pace with its growth. The main problems are:

- Each clinic operates with its own processes and patient-record system.
- The US and UK clinics use different EHR platforms that do not communicate.
- US appointments are booked by phone and UK appointments through front desks; there is no shared online booking system.
- The network has a 22% no-show rate, representing approximately $1.8 million annually in lost appointment slots.
- Clinical staff spend approximately 35 minutes per day on documentation tasks that could be assisted by AI.
- The US claims denial rate is 14%, compared with an industry range of approximately 5-8%.
- UK billing is managed separately from US billing, including a UK billing spreadsheet.
- Compliance access logs and audit trails are incomplete and distributed across systems.
- Compliance training and continuing medical education tracking are manual or spreadsheet-based.
- Executive reports are delayed, inconsistent, and sometimes contradictory.
- The technology team has no shared data layer, telemetry, or centralised logging.

## Project objective

HealthCore Digital exists to build the systems, workflows, and intelligent tools needed for HealthCore to operate as a modern healthcare provider that is safe, efficient, and centred on the patient.

The overall objective is to connect operational data and workflows across both countries while improving patient access, clinical efficiency, revenue performance, compliance, workforce management, and executive visibility.

## Target users and customers

### External users

- Patients seeking care at HealthCore clinics.
- Spanish-speaking patients in US markets.

### Internal users

- Clinical Operations and approximately 120 clinical staff.
- Patient Experience and Access, led by Priya Nair.
- Revenue Cycle and Billing, led by Tom Callahan.
- Compliance and Data Governance, led by Claire Whitfield.
- People and Workforce, led by Diane Foster.
- Technology, led by CTO James Osei.
- Executive Leadership, led by Dr. Sandra Okonkwo.

## Important business processes

- Patient appointment booking, reminders, follow-up, and rescheduling.
- Clinical documentation and cross-location patient-history access.
- Claims submission, coding, denial prevention, denial analysis, and collections.
- US and UK billing across commercial insurance, Medicare, Medicaid, private pay, and the NHS contract.
- Patient-data access requests and compliance audit management.
- Monitoring data access patterns across HIPAA and UK GDPR jurisdictions.
- Recruitment, clinical onboarding, credential verification, and compliance training.
- Continuing medical education tracking and expiry alerts for clinicians.
- Executive reporting, KPI monitoring, threshold alerts, and weekly reporting.

## Business constraints

- HealthCore operates across the United States and United Kingdom.
- Systems must account for both HIPAA and UK GDPR.
- Patient data is protected health information and must be handled according to applicable legal requirements.
- The two countries use different EHR and billing systems.
- Any solution must work across 12 locations and different local processes.
- Healthcare errors can affect real patients and have legal consequences.
- The technology team consists of six people in Austin.
- HealthCore has approximately 200 employees across two employment-law environments.
- US locations require support for English and Spanish because bilingual care is part of the company's service model.

## Important requirements from `CONTEXT.md`

- Provide a unified patient record API that surfaces data from both EHR systems.
- Provide AI-assisted clinical documentation and cross-location patient-history visibility.
- Provide a clinical operations dashboard for appointments, patient flow, and documentation time.
- Provide unified online booking for both markets.
- Provide intelligent appointment reminders and no-show prediction.
- Provide AI-assisted claims review, coding suggestions, denial analysis, and denied-claim follow-up workflows.
- Provide a unified billing dashboard for US and UK revenue streams.
- Consolidate audit trails and data-access monitoring across both jurisdictions.
- Automate patient data-request compilation across systems.
- Provide HR workflows for onboarding, CME tracking, expiry alerts, and workforce KPIs.
- Provide a central API for patient, appointment, billing, and staff data.
- Provide telemetry, monitoring, centralised logging, health checks, and alerts.
- Provide data pipelines for clinical, operations, and finance dashboards.
- Provide an executive dashboard with real-time KPIs, weekly reports, threshold alerts, and a natural-language assistant.
