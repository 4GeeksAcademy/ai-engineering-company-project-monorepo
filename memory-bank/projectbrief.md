# Project Brief — HealthCore Digital

## Business Description

HealthCore Digital is the internal technology unit of **HealthCore**, an outpatient healthcare services company operating 12 clinics across the United States and the United Kingdom. HealthCore Digital builds and maintains the operational software that supports clinical staff and, indirectly, patient care.

## Assignment

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

| KPI | Measurement | Link to Module |
| --- | ----------- | -------------- |
| Candidate data accuracy | Zero status-corruption incidents per recruitment cycle | Candidate list and detail views (status/stage updates) |
| Time-to-status | < 1 hour from note entry to stage advancement action | Note form + status update in candidate detail |
| Recruitment cycle visibility | All active searches displayable in ≤ 3 clicks | FilterBar + list + detail drill-down |

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
