olla

## 🎯 The Challenge



Nexova's People & Talent department is in the middle of an active recruitment campaign. The open position received over 100 applications in less than two weeks, and the team is overwhelmed: they're tracking candidates in a shared spreadsheet, writing interview notes in separate documents, and updating statuses manually over email threads. The process is falling apart.

The Technology team has already built and exposed a REST API to manage the candidate pipeline. They have proposed locating the interface in the `/uis` folder, as a separate project (`talent-pipeline-tracker`), since this is an auxiliary tool for People & Talent and not a core system solution. Your job is to build that frontend — the one the People team will use starting Monday. It must let them see all candidates at a glance, filter them by status and stage, and access each candidate's full detail without losing context.

The Head of People has shared what they need with urgency:

> #### What the tool must do
>
> - Show all candidates in a list — name, position, current status, and current stage at a glance.
> - Allow filtering by status and by stage, and searching by name or email without reloading the page.
> - Open a candidate's detail view and, from there, change their status or stage with a single interaction.
> - Add internal notes to a candidate and delete them when they're no longer relevant.
> - Register new candidates directly from the interface and edit a candidate's data when something needs to be corrected.

The API is ready and documented at [https://playground.4geeks.com/tracker/api/v1/docs](https://playground.4geeks.com/tracker/api/v1/docs). All requests must be handled asynchronously — the UI must communicate loading states and handle errors gracefully. The team cannot afford a tool that breaks silently or leaves the user without feedback.

This is a real internal tool that real people will use from day one. Build it like one.

---


---

## 💻 What You Need to Do

### Views and routing

- [ ] Create a **candidate list page** (`/`) that displays all candidates fetched from `GET /records`.
- [ ] Create a **candidate detail page** (`/candidates/[id]`) that fetches and displays full candidate data from `GET /records/:id`.
- [ ] Navigation between list and detail must use Next.js routing — no full page reloads.

### Candidate list

- [ ] Display each candidate's full name, position applied for, current status, and current stage.
- [ ] Implement **filter by status** and **filter by stage** using query parameters (`useSearchParams`).
- [ ] Implement a **search input** that filters by name or email without reloading the page.
- [ ] Show a loading state while data is being fetched and an error message if the request fails.

### Candidate detail

- [ ] Display all available fields: name, email, phone, position, LinkedIn, CV link, years of experience, status, stage, and application date.
- [ ] Include a control to **update status** via `PATCH /records/:id`.
- [ ] Include a control to **update stage** via `PATCH /records/:id`.
- [ ] Display the list of notes fetched from `GET /records/:id/notes`.
- [ ] Allow adding a new note via `POST /records/:id/notes`.
- [ ] Allow deleting a note via `DELETE /records/:id/notes/:note_id`.

### Candidate management

- [ ] Include a **form to register a new candidate** (`POST /records`).
- [ ] Include a **form to edit a candidate's data** (`PUT /records/:id`).
- [ ] Both forms must validate required fields before submission.
- [ ] Show success and error feedback after each form submission.

### State and async handling

- [ ] All API calls must be handled with `async/await`.
- [ ] Every data-fetching operation must have at least three UI states: loading, success, and error.
- [ ] After a `PATCH`, `PUT`, or `POST`, update the UI to reflect the change without requiring a full page reload.

### Code structure

- [ ] Organize the project with a clear folder structure: `/components`, `/hooks` (if applicable), `/types`, `/lib` or `/services`.
- [ ] Define TypeScript types for all data structures received from the API.

⚠️ **IMPORTANT:** The terminology, labels, and framing visible in your UI must reflect your company's context as described in your **CONTEXT.md**. For example, if your company is TrackFlow, the interface should feel like an internal TrackFlow People & Talent tool, even though the API field names remain those defined by the tracker backend. A generic implementation that ignores the company scenario will not be accepted.

⚠️ **IMPORTANT:** Use only Next.js (App Router), React, and TypeScript. Do not use external state management libraries (Redux, Zustand, Jotai, etc.). Component-level state with hooks is sufficient for this milestone.

---

## ✅ What We Will Evaluate

- [ ] The candidate list page renders data fetched from the API correctly.
- [ ] Filters by status and stage work using query parameters without full page reloads.
- [ ] Search by name or email works without reloading the page.
- [ ] The detail page loads and displays all fields for the correct candidate by ID.
- [ ] Status and stage can be updated from the detail view using `PATCH`.
- [ ] Notes can be listed, added, and deleted from the detail view.
- [ ] New candidates can be registered via a form using `POST`.
- [ ] Existing candidate data can be edited via a form using `PUT`.
- [ ] Loading, success, and error states are visible to the user for all async operations.
- [ ] TypeScript types are defined and used for API data structures.
- [ ] The folder structure separates components, types, and data access logic.
- [ ] Next.js App Router is used correctly for navigation and dynamic routes.
- [ ] No prop drilling — component state is scoped appropriately.
- [ ] The UI reflects the company scenario from the assigned CONTEXT.md (labels, terminology, framing).

> Note: Visual design and styling will not be formally evaluated in this milestone, but the interface must be usable and display all required information clearly.

---

## 📦 How to Submit

Push your changes to your monorepo on GitHub and share the link following your instructor's delivery instructions. Make sure `.env` is not committed, and include a `.env.example` file documenting the required environment variables.

---

T