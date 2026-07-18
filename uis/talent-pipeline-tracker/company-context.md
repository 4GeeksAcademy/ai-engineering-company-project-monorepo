# CONTEXT — Nexova · Milestone 3: Talent Pipeline Tracker

> **Repository path:** `03-talent-pipeline-tracker/CONTEXT-nexova.md`

---

## Your company

You are part of the AI Engineering team at **Nexova**, a human resources consulting and talent acquisition firm with offices in Valencia and Miami. Nexova's core business is precisely what this tool supports: finding the right people. Building this frontend is not just an internal project — it is a direct demonstration of Nexova's own capabilities.

---

## The assignment

Elena Vargas, L&D Manager, has sent the following email with Sergio Molina, CTO, on copy:

> **To:** Sergio Molina (CTO)
> **CC:** AI Engineering Team
> **Subject:** URGENT — We need the candidate management tool this week
>
> Sergio,
>
> I'm writing to you directly because the situation with the **Executive Assistant** selection process has become unmanageable. We received over a hundred applications and my team is still working from a shared spreadsheet. Yesterday we found duplicated entries and at least one candidate whose status hadn't been updated in two weeks.
>
> I know the backend is ready — I spoke with Javier and he confirmed it. I need someone from your team to build the frontend now. We cannot keep running a recruitment process for our own company on a spreadsheet. It's embarrassing and it's costing us candidates.
>
> What I need the tool to do:
>
> - Show all candidates in a list with name, position, status, and stage visible at a glance.
> - Filter by status and stage, and search by name or email without reloading the page.
> - Open a candidate's detail and update their status or stage from there.
> - Add internal notes after each call or interview, and delete them when they're no longer needed.
> - Register candidates who apply through referrals and correct data when it comes in wrong.
>
> Please make this a priority.
>
> Elena

---

## Context of the active search

| Field    | Value                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------- |
| Position | Executive Assistant                                                                            |
| Company  | Nexova                                                                                         |
| Location | Valencia headquarters                                                                          |
| Profile  | Executive support experience, calendar and travel management, professional English and Spanish |

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