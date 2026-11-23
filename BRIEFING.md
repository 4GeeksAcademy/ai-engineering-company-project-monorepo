# Welcome to HealthCore

## AI Engineering · 4Geeks Academy — Company Briefing

---

HealthCore is an outpatient healthcare services company founded in 2011 in Austin, Texas. It operates a network of **12 clinics** — 9 in the United States (Texas, Florida, and Georgia) and 3 in the United Kingdom (London and Manchester) — offering primary care, specialist consultations, chronic disease management, and preventive health programmes. The company employs approximately **200 people** across clinical staff, operations, administration, and a growing technology unit. Annual revenue sits around **28 million dollars**.

HealthCore was built on a simple idea: accessible, high-quality care that doesn't require patients to wait weeks for an appointment or navigate a confusing system. Same-day bookings, extended hours, and bilingual staff in US markets became the brand's signature. For most of its history, that was enough to grow steadily and earn a loyal patient base in both countries.

It is no longer enough.

## How the company is organised

HealthCore is led by **Dr. Sandra Okonkwo**, a physician who spent years inside large hospital systems before founding the company out of frustration with how much time clinicians spent on administration instead of patients. She is precise, evidence-driven, and deeply sceptical of technology that doesn't solve a real problem — but she has come to understand that without modern systems, HealthCore cannot manage what it has already built, let alone grow further.

The company is organised around the following areas:

**Clinical Operations** is where the medicine happens. Dr. Marcus Reid oversees approximately 120 clinical staff — physicians, nurse practitioners, nurses, and medical assistants — across the 12 locations. Each clinic operates somewhat independently, with its own processes and its own patient records system. The US and UK clinics use different electronic health record platforms, and they do not speak to each other.

**Patient Experience and Access** manages everything that happens before and after the clinical encounter: booking appointments, reminding patients, handling follow-up, and making sure the patient has a smooth journey from first contact to discharge. Priya Nair leads this function from London, and she is acutely aware that a 22% no-show rate across the network represents both a patient failure and a significant financial loss.

**Revenue Cycle and Billing** is responsible for getting paid for the care that HealthCore provides. In the US, that means navigating commercial insurance, Medicare, and Medicaid — a complex claims and reimbursement process where a 14% denial rate (more than double the industry average) is currently costing the company significant money. In the UK, billing is a mix of private pay and a small NHS contract. Tom Callahan manages both revenue streams, but without a unified view of either.

**Compliance and Data Governance** is what keeps HealthCore legally safe. Claire Whitfield manages the company's obligations under HIPAA in the US and UK GDPR in the United Kingdom — two different frameworks with different rules about how patient data can be stored, accessed, and shared. Any system that HealthCore builds or adopts must be evaluated through this lens. Claire's team is small, but her authority in the organisation is significant.

**People and Workforce** handles the 200 employees across 12 locations in two countries, each with different employment law frameworks. Diane Foster manages everything from hiring — clinical roles are hard to fill and take an average of 47 days to close — to onboarding, compliance training, and tracking the continuing medical education hours that clinicians are legally required to complete to maintain their licences.

**Technology** is the team that has been tasked with making all of this work. James Osei, the CTO, leads six people in Austin. They are responsible for a patchwork of legacy systems that were each built or acquired to solve a specific problem and have never been properly integrated. Two different EHR systems. A US billing platform. A UK billing spreadsheet. A phone-based US scheduling system. A manual diary for UK bookings. No shared data layer between any of them.

**Executive Leadership** centres on Dr. Okonkwo, who receives weekly reports from each department head — all formatted differently, sometimes contradictory, and always based on data that is several days old. She is managing a 28-million-dollar, two-country clinical network without being able to answer a basic question like "what is our no-show rate across the network this week?" without making phone calls.

## Where the company stands today

HealthCore has built something genuinely valuable: a network of clinics that patients trust and clinical staff want to work in. But the infrastructure underneath the clinical work has not kept pace with the company's growth. The consequences range from inconvenient to serious.

Patients in the US book by phone while patients in the UK call a front desk — there is no shared online booking system. A fifth of patients do not show up to their appointments, and no proactive outreach system exists to prevent it. Clinical staff spend 35 minutes a day on documentation tasks that AI could assist with. Billing denials cost millions annually. Compliance training is tracked on a spreadsheet. Patient data flows through systems that were never designed to share information.

Operating in healthcare adds a layer of responsibility that does not exist in other industries. Patient data is protected by law — HIPAA in the US, UK GDPR in the UK. Every system that handles that data must meet specific legal standards. Errors are not just inefficiencies; in healthcare, they can have consequences for real patients.

Dr. Okonkwo has created an internal unit called **HealthCore Digital** to build the systems, workflows, and intelligent tools that will allow the company to operate as a modern healthcare provider — safe, efficient, and genuinely centred on the patient.

**You are part of that unit.**

---

## The Departments and Their Problems

### 🏥 Clinical Operations

**Director:** Dr. Marcus Reid (~120 clinical staff across 12 locations)

Each of the 12 clinics operates with its own processes and patient records system. US clinics use one EHR platform, UK clinics use another, and they cannot communicate with each other. Clinical staff spend 35 minutes per day on documentation tasks that could be assisted by AI. When a patient moves between locations or crosses the US-UK boundary, their history does not follow them.

**What they need:** A unified patient record API that surfaces data from both EHR systems, AI-assisted clinical documentation to reduce administrative time, cross-location patient history visibility, and a clinical operations dashboard showing appointment volume, patient flow, and documentation time by location.

---

### 🗓️ Patient Experience and Access

**Manager:** Priya Nair (London)

Patients in the US book appointments by phone. Patients in the UK call a front desk. There is no shared online booking system. A 22% no-show rate across the network represents both poor patient experience and significant financial loss — approximately $1.8 million annually in lost appointment slots. No proactive outreach system exists to remind patients or reschedule at-risk appointments.

**What they need:** A unified online booking platform for both markets, an intelligent appointment reminder system with SMS/email/app notifications, a no-show prediction model that flags high-risk appointments for proactive contact, and a patient experience dashboard tracking booking rates, no-shows, and patient satisfaction by location.

---

### 💰 Revenue Cycle and Billing

**Manager:** Tom Callahan

In the US, a 14% claims denial rate — more than double the industry average of 5-8% — is costing HealthCore significant revenue. Claims are submitted manually with inconsistent coding practices across locations. In the UK, billing is split between private pay and a small NHS contract, managed separately with no unified view. Tom cannot answer "what is our collection rate this month?" without making phone calls.

**What they need:** An AI-assisted claims review system that flags high-risk submissions before they go out, automated coding suggestions based on clinical notes, a unified billing dashboard showing US and UK revenue streams in real time, denial pattern analysis to identify systematic issues, and automated follow-up workflows for denied or unpaid claims.

---

### 🔒 Compliance and Data Governance

**Manager:** Claire Whitfield

HealthCore operates under two different legal frameworks: HIPAA in the United States and UK GDPR in the United Kingdom. Every system that handles patient data must be evaluated through both lenses. Data access logs are maintained separately in each EHR system. Audit trails are incomplete. When a patient requests their data under GDPR or HIPAA, compiling it requires manual work across multiple systems.

**What they need:** A centralised compliance monitoring dashboard showing data access patterns across both jurisdictions, automated audit trail consolidation, a patient data request automation tool that compiles records from all systems, and a compliance risk scoring system that flags potential violations before they become breaches.

---

### 👥 People and Workforce

**Manager:** Diane Foster

Managing 200 employees across 12 locations in two countries, each with different employment law frameworks, creates significant overhead. Clinical roles are hard to fill and take an average of 47 days to close — nearly 20 days longer than industry benchmarks. Onboarding is manual. Continuing medical education (CME) hours, which clinicians are legally required to track to maintain their licences, are recorded on a spreadsheet.

**What they need:** An internal HR portal for holiday requests, absence management, and policy queries, an automated clinical onboarding flow with credential verification checklists, a CME tracking system with automatic expiry alerts, an HR KPI dashboard tracking time-to-hire, turnover, and absenteeism by location and role, and an HR chatbot that answers common employee questions.

---

### 💻 Technology

**CTO:** James Osei (6-person team in Austin)

HealthCore's technology estate is a patchwork of systems acquired or built over a decade: two different EHR platforms, a US billing system, a UK billing spreadsheet, a phone-based US scheduling system, and manual diaries for UK bookings. There is no shared data layer. No telemetry. No centralised logging. When a system fails, the team finds out when a clinic calls to report it.

**What they need:** A HealthCore central API that unifies patient, appointment, billing, and staff data across both EHR systems, real-time telemetry and monitoring from all 12 locations, a data pipeline feeding clinical, operations, and finance dashboards, automated health checks with alerts, and technical documentation indexed for semantic search.

---

### 📊 Executive Leadership

**CEO:** Dr. Sandra Okonkwo

Dr. Okonkwo manages a 28-million-dollar healthcare network across two countries without a unified dashboard. Her decisions are based on weekly reports from each department head — all formatted differently, sometimes contradictory, and always several days old. She cannot answer basic operational questions like "what is our no-show rate this week?" or "which location has the highest claims denial rate this month?" without making phone calls.

**What she needs:** A unified executive dashboard with real-time KPIs from all departments (appointment volume, no-show rate, claims denial rate, revenue by location, patient satisfaction), an automatically generated weekly report delivered every Monday at 7am, threshold alerts for critical metrics, and a natural-language AI assistant she can query directly.

---

## Why Choose HealthCore?

Choose HealthCore if you are drawn to:

- **Healthcare and regulated data** — building systems that handle protected health information under HIPAA and UK GDPR, where errors have legal consequences and privacy is non-negotiable.
- **Cross-border healthcare operations** — two countries, two regulatory frameworks, two EHR systems, and a unified patient experience that must work across all of it.
- **High-stakes AI applications** — clinical documentation assistance, claims denial prediction, and appointment no-show forecasting are not optional enhancements; they directly impact patient care and company viability.
- **Systems that serve real patients** — every dashboard, API, and automation you build exists to help people get the healthcare they need, when they need it, without unnecessary friction.

The AI challenges at HealthCore include natural language processing of clinical notes for billing code suggestions, predictive models for appointment no-shows trained on multi-location data, RAG systems over compliance documentation in two jurisdictions, and intelligent scheduling that balances patient preferences with clinic capacity. If you want to build systems where technical excellence directly translates to better healthcare delivery, HealthCore is your company.

---

_Internal document — 4Geeks Academy · AI Engineering Track_
_For exclusive use in programme project generation_
