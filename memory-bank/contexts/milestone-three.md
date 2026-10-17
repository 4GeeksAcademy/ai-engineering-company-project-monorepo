# CONTEXT — HealthCore · Milestone 3: Talent Pipeline Tracker

> **Repository path:** `03-talent-pipeline-tracker/CONTEXT-healthcore.md`

---

## Your company

You are part of **HealthCore Digital**, the internal technology unit of HealthCore, an outpatient healthcare services company with 12 clinics across the United States and the United Kingdom. Everything you build supports operational processes that affect clinical staff and, indirectly, patient care. Tools that fail silently are not acceptable.

---

## The assignment

Diane Foster, VP of People, has sent the following email with James Osei, CTO, on copy:

> **To:** James Osei (CTO)
> **CC:** HealthCore Digital Team
> **Subject:** URGENT — Candidate management tool needed this week
>
> James,
>
> I need to escalate this directly. We are in the middle of selecting an **Executive Assistant** for the Austin headquarters and the process has completely outgrown our current setup. We have over a hundred applications and my team is managing everything in a shared spreadsheet. This morning I found that two candidates had their status overwritten by mistake and one of them had already been scheduled for an interview.
>
> I spoke with the tech team last week and they confirmed the backend is live. I need someone to build the frontend now. I cannot run a professional recruitment process for our own headquarters on a spreadsheet — especially when we are simultaneously asking clinical teams to trust our systems.
>
> What I need the tool to do:
>
> - Show all candidates in a list with name, position, status, and stage visible immediately.
> - Filter by status and stage, and search by name or email without reloading the page.
> - Open a candidate's full detail and update their status or stage from there.
> - Add internal notes after each call or interview, and remove them when they are no longer relevant.
> - Register candidates who come through referrals and correct data when it arrives incorrectly.
>
> Please make this your team's priority this week.
>
> Diane

---

## Context of the active search

| Field    | Value                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Position | Executive Assistant                                                                                                              |
| Company  | HealthCore                                                                                                                       |
| Location | Austin headquarters                                                                                                              |
| Profile  | Executive support experience, calendar and travel management, professional English, discretion in handling sensitive information |

---

## API and data

The mock API is centrally deployed and shared across all company contexts in the course. Fields, values, and structure are as defined in the backend technical specification. No adaptation is required.

### `status` values

| API value     | UI label    |
| ------------- | ----------- |
| `received`    | Received    |
| `in_progress` | In progress |
| `selected`    | Selected    |
| `discarded`   | Discarded   |

### `stage` values

| API value             | UI label            |
| --------------------- | ------------------- |
| `pending`             | Pending review      |
| `review`              | Under review        |
| `personal_interview`  | Personal interview  |
| `technical_interview` | Technical interview |
| `offer_presented`     | Offer presented     |

> Raw API values (`in_progress`, `personal_interview`, etc.) must never be visible in the interface. Always use the labels from this table.

---

## Specific acceptance criteria

- Status and stage fields show human-readable labels, never raw API values.
- Notes are visible only within the candidate detail view.
- The registration form includes all fields required by the API.

---

_Internal document — 4Geeks Academy · AI Engineering Track_
_For exclusive use in programme project generation_