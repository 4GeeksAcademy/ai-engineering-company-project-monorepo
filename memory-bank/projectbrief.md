# Project Brief — HealthCore Digital

> **Source:** Full company context in [`healthcore-BRIEFING.en.md`](../healthcore-BRIEFING.en.md)

## Business Description

**HealthCore** is an outpatient healthcare services company founded in 2011 in Austin, Texas. It operates **12 clinics** — 9 in the US (Texas, Florida, Georgia) and 3 in the UK (London, Manchester) — offering primary care, specialist consultations, chronic disease management, and preventive health programmes. The company employs ~200 people and generates ~$28M in annual revenue.

**HealthCore Digital** is the internal technology unit created by CEO Dr. Sandra Okonkwo to build the systems, workflows, and intelligent tools that will allow the company to operate as a modern healthcare provider. The unit is led by CTO James Osei (6-person team in Austin).

### Company Leadership

| Role                         | Name                | Area                                    |
| ---------------------------- | ------------------- | --------------------------------------- |
| CEO & Founder                | Dr. Sandra Okonkwo  | Executive Leadership                    |
| CTO                          | James Osei          | Technology (6-person Austin team)       |
| Clinical Operations Director | Dr. Marcus Reid     | ~120 clinical staff across 12 locations |
| Patient Experience Manager   | Priya Nair (London) | Booking, reminders, follow-up           |
| Revenue Cycle Manager        | Tom Callahan        | US & UK billing, claims, insurance      |
| Compliance & Data Governance | Claire Whitfield    | HIPAA (US) + UK GDPR                    |
| People & Workforce           | Diane Foster        | 200 employees, hiring, CME tracking     |

### Key Company Challenges

| Challenge                                    | Impact                                         |
| -------------------------------------------- | ---------------------------------------------- |
| Two incompatible EHR systems (US/UK)         | No unified patient records across borders      |
| 22% no-show rate                             | ~$1.8M annual lost revenue                     |
| 14% claims denial rate (vs 5-8% industry)    | Millions in lost billing revenue               |
| Manual scheduling (phone-based US, diary UK) | No shared online booking                       |
| 35 min/day clinical staff on documentation   | AI-addressable overhead                        |
| 47-day avg time-to-hire for clinical roles   | 20 days above industry benchmark               |
| No unified executive dashboard               | Decisions based on stale, inconsistent reports |

## Current Assignment

Diane Foster, VP of People, has tasked the team with building a **Candidate Management Tool** (Talent Pipeline Tracker) to replace a shared-spreadsheet recruitment process. The tool is needed urgently to support the selection of an Executive Assistant for the Austin headquarters.

### Core Problem

> Over a hundred applications managed in a shared spreadsheet caused data corruption (candidate status overwritten by mistake, a candidate already scheduled for an interview lost their status). The process has outgrown manual tooling.

### Product Goals

- Display all candidates in a list with name, position, status, and stage immediately visible.
- Filter by status and stage, and search by name or email without page reload.
- Open a candidate's full detail view and update their status or stage from there.
- Add internal notes after each call or interview, and remove them when no longer relevant.
- Register new candidates (referrals, corrections) through a form.

### Active Search Context

| Field    | Value                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Position | Executive Assistant                                                                                                              |
| Company  | HealthCore                                                                                                                       |
| Location | Austin headquarters                                                                                                              |
| Profile  | Executive support experience, calendar and travel management, professional English, discretion in handling sensitive information |

### KPI Alignment

| KPI                          | Measurement                                            | Link to Module                                         |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Candidate data accuracy      | Zero status-corruption incidents per recruitment cycle | Candidate list and detail views (status/stage updates) |
| Time-to-status               | < 1 hour from note entry to stage advancement action   | Note form + status update in candidate detail          |
| Recruitment cycle visibility | All active searches displayable in ≤ 3 clicks          | FilterBar + list + detail drill-down                   |

### Status Values

| API value     | UI label    |
| ------------- | ----------- |
| `received`    | Received    |
| `in_progress` | In progress |
| `selected`    | Selected    |
| `discarded`   | Discarded   |

### Stage Values

| API value             | UI label            |
| --------------------- | ------------------- |
| `pending`             | Pending review      |
| `review`              | Under review        |
| `personal_interview`  | Personal interview  |
| `technical_interview` | Technical interview |
| `offer_presented`     | Offer presented     |

> Raw API values (`in_progress`, `personal_interview`, etc.) must never be visible in the interface. Always use the human-readable labels from this table.
