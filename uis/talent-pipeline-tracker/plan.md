# Talent Pipeline Tracker — Build Plan

Follow the steps in order. Use `public/ui-ux/` screenshots as visual references.
Before writing Next.js code, read the relevant installed guides in `node_modules/next/dist/docs/`, as required by `AGENTS.md`.

Visual styling is not formally evaluated in the assignment; usability and clearly displayed required information are required. Drawers, expanded form presentations, and screenshot comparisons are additional scope retained in this plan.

## 1. Set up the project structure

Check the existing structure and add any missing folders or starter files. Implement their contents in the related steps below:

```text
app/
  page.tsx                       # Candidate list at /
  candidates/[id]/page.tsx        # Candidate detail at /candidates/[id]
  layout.tsx                     # Root layout, fonts, and global style imports
  globals.css                    # Global styles
components/                      # List rows/cards, filters, notes, forms, loading/error feedback
lib/api.ts                       # Shared fetch helper and typed endpoint functions
types/                           # Candidate, note, payload, and response types
.env.example                     # Documents NEXT_PUBLIC_API_URL
hooks/useRecordsFilters.ts       # Optional: URL filters and local search
```

Use local `useState`, `useReducer`, or small hooks for view state. Do not introduce Redux, Zustand, Jotai, or similar global state libraries.

- [ ] Confirm `app/page.tsx` exists for the candidate list.
- [ ] Read the assigned `CONTEXT-company.md` before writing application code; use its company scenario, labels, and terminology throughout the interface.
- [ ] Confirm this app is inside your existing fork of the course monorepo at `uis/talent-pipeline-tracker`, rather than a new standalone repository.
- [ ] Create `app/candidates/[id]/page.tsx` for candidate details.
- [ ] Confirm `app/layout.tsx` exists for the root layout, fonts, and global style imports.
- [ ] Confirm `app/globals.css` exists for global styles.
- [ ] Create `components/` for list rows/cards, filters, notes, forms, and loading/error feedback.
- [ ] Confirm `lib/api.ts` exists for the shared fetch helper and endpoint functions.
- [ ] Create `types/` for candidate, note, payload, and response types.
- [ ] Create `.env.example` to document `NEXT_PUBLIC_API_URL` in step 2.
- [ ] Decide whether `hooks/useRecordsFilters.ts` is needed; create it if it helps keep the list page readable.

## 2. Configure the API URL and shared fetch helper

Complete this setup before starting step 3: Show all candidates in a list.

Files: `lib/api.ts`, `.env.example`.

No authentication is required for now.

- [ ] Configure `NEXT_PUBLIC_API_URL` and document it in `.env.example`.
- [ ] Create `.env.local` in the app directory with `NEXT_PUBLIC_API_URL=https://playground.4geeks.com/tracker/api/v1`.
- [ ] Treat endpoint paths as relative to `NEXT_PUBLIC_API_URL`, which may already include `/api/v1`; do not append that prefix twice.
- [ ] Create a shared fetch helper in `lib/api.ts`. Show a clear error if `NEXT_PUBLIC_API_URL` is missing, normalize trailing slashes, merge headers with `new Headers(init?.headers)`, and handle HTTP errors, invalid JSON, and explicitly permitted empty responses.
- [ ] Use `async/await` for API requests, check `response.ok`, and parse JSON only when the endpoint expects a JSON response. Throw useful errors for HTTP failures and malformed responses so each workflow can display them.

## 3. Show all candidates in a list

Goal: name, position, status, and stage are visible immediately.

Files: `app/page.tsx`, candidate list components in `components/`, and `lib/api.ts`.

- [ ] Check the list response for the exact field names for ID, name, position, status, stage, and email (needed for search). Note missing or nullable values and define the corresponding candidate type.
- [ ] Inspect GET `/records`: identify whether the list is an array or inside a wrapper, record the list key, and define its response type.
- [ ] Check whether GET `/records` returns all candidates or one page. If paginated, record page/page-size parameters and total-count or next-page response fields.
- [ ] GET `/records`: define the candidate list item type and the list response type, including any wrapper and pagination fields.
- [ ] Use these types in the list API function and component props without `any`; validate the returned response shape.
- [ ] Implement GET `/records` — list candidates — as a typed function in `lib/api.ts` using the shared fetch helper.
- [ ] Replace the landing page with the app header and real candidate list.
- [ ] Load candidates using the GET `/records` function implemented in this step.
- [ ] Choose how to load GET `/records`: fetch on mount in a client component with `useEffect`, or use server-component `fetch` with an explicit revalidation/refresh strategy. Follow the installed Next.js documentation and ensure successful mutations refresh the displayed data without a full document reload.
- [ ] Show Name, Position, Status, and Stage in a desktop table and mobile cards.
- [ ] Display status/stage using the UI labels in [README.md](README.md#api-and-data), never raw API values.
- [ ] Show the correct candidate count and page controls if the API uses pagination, so every candidate can be reached.
- [ ] Show a loading spinner or skeleton while fetching candidates, an error message with Retry on failure, and an empty state when the API returns no candidates.
- [ ] Check: HTTP errors and malformed list responses are displayed in the list UI.
- [ ] Check: `/` lists real candidates from GET `/records`, with name, position, status, and stage visible immediately.
- [ ] Check: list state uses local React state/hooks without external global state libraries; components, types, and API access are separated, and types match the API structures.
- [ ] Check: the list header, field labels, and status/stage labels reflect the assigned HealthCore CONTEXT.
- [ ] Check: a successful fetch visibly renders the loaded list or empty result, completing the loading/success/error states for list fetching.
- [ ] Keep list state near the components that use it; avoid passing state through unrelated intermediate components solely to reach a child (prop drilling).

## 4. Filter and search without reloading

Goal: filter by status and stage, and search by name or email without reloading the page.

Files: candidate list page and its filter/search components.

- [ ] Confirm the allowed status values from the backend documentation and define their TypeScript type.
- [ ] Confirm the allowed stage values from the backend documentation and define their TypeScript type.
- [ ] Reuse GET `/records` from step 3; add documented query parameters if the API handles filtering or search.
- [ ] Add Status and Stage filters using the backend's allowed values.
- [ ] Use the [README.md mappings](README.md#api-and-data) for filter options: display UI labels, but use raw API values for filter logic, URL parameters, and API queries.
- [ ] Add a search box that matches name or email, ignoring letter case.
- [ ] Keep the search string in local `useState`. For client-side search, filter the loaded candidates using case-insensitive `includes` on name and email. If the official API documentation supports a search query parameter, refetch with that parameter instead where appropriate. Typing must update results without a full page reload.
- [ ] Make search and both filters work together without a full page reload.
- [ ] Store status and stage in the URL so refreshing keeps them; preserve unrelated URL parameters.
- [ ] Read status and stage using `useSearchParams`; follow the installed Next.js guidance for any required Suspense boundary.
- [ ] On a filter change, copy the current query into `URLSearchParams`, set the changed filter value, or delete its key when empty. Keep unrelated parameters.
- [ ] Navigate with `router.push` or `router.replace`, using `usePathname` for the current path. Append `?${params.toString()}` only when parameters remain, so an empty query does not leave a trailing `?`.
- [ ] Add Clear filters to reset search, status, and stage.
- [ ] Reset pagination when search or filters change and show accurate result counts.
- [ ] Search/filter all loaded candidates before client pagination. If the backend paginates, use its documented search/filter support to search beyond the current page; record a blocker if that support is missing.
- [ ] Show a “No matching candidates” empty state when search or status/stage filters leave the list empty.
- [ ] Check: status and stage filters are driven by URL query parameters. Refresh the page and open a copied URL to confirm both restore.
- [ ] Check: name and email searches update results without a full page reload.
- [ ] Keep filter/search state in the list view or a small hook, without prop drilling through unrelated components.

## 5. Open candidate details and edit the candidate

Goal: open a candidate's full details, update their status or stage, and correct their information from the details page.

Files: `app/candidates/[id]/page.tsx`, `components/candidate-form.tsx`, shared detail/drawer components, and `lib/api.ts`.

- [ ] Confirm the full detail response fields, including phone, LinkedIn URL, CV URL, years of experience, and application date. Note missing or nullable values and extend the candidate/response types.
- [ ] Confirm the PUT and PATCH request bodies and responses, reusing status/stage types from step 4.
- [ ] GET `/records/:id`: define the full candidate detail response type, including optional or nullable fields.
- [ ] PUT `/records/:id`: define the full-edit request payload and response type, including all fields required for replacement.
- [ ] PATCH `/records/:id`: define the partial-update request payload and response type for status/stage changes.
- [ ] Use these types in the detail/update API functions and component props without `any`; validate returned response shapes.
- [ ] Implement GET `/records/:id` — get full candidate details — using the shared fetch helper.
- [ ] Implement PATCH `/records/:id` — update status or stage — using the shared fetch helper.
- [ ] Implement PUT `/records/:id` — save edited candidate information — using the shared fetch helper.
- [ ] Make each list candidate open their own details using GET `/records/:id`.
- [ ] Use the route's candidate ID for GET `/records/:id`. Once notes are implemented in step 6, the record and notes requests can run in parallel with `Promise.all`.
- [ ] Show name, email, phone, position, LinkedIn URL, CV URL, years of experience, status, stage, and application date.
- [ ] Keep exact API property names in the detail types and map them to display labels from the assigned HealthCore CONTEXT. Render LinkedIn and CV as usable links when valid URLs are present.
- [ ] Display readable placeholders for missing optional values and loading/error feedback.
- [ ] Add status and stage controls and save only the intended changes through PATCH `/records/:id`.
- [ ] Use the [README.md mappings](README.md#api-and-data) in detail controls and labels: send raw API values in PATCH bodies, but show only UI labels in the interface.
- [ ] Send the minimal PATCH body documented by the API. After success, update local candidate state or refetch the record so the changed status/stage appears without a full document reload.
- [ ] Add an Edit action on the candidate details page that opens a form populated with their existing information.
- [ ] Place the edit form on the detail page or a separate edit route reached from that page. Submit PUT `/records/:id` with the full resource or exact replacement shape required by the API.
- [ ] Build a reusable form with Full Name, Email, Phone, Position, LinkedIn URL, CV URL, and Years of Experience. CV is a URL field.
- [ ] Validate required fields and formats against the backend documentation.
- [ ] Save corrected information through PUT `/records/:id`, preserving required data outside the form.
- [ ] Add Cancel and retain entered values after a failed save. Keep form actions reachable on mobile.
- [ ] Prevent duplicate submissions and show saving, success, and failure feedback.
- [ ] Show inline or banner success feedback after a successful edit submission and error feedback after a failed attempt.
- [ ] Update the detail and list labels after successful changes.
- [ ] After a successful PUT edit, update local candidate state or refetch the record and synchronize the list so corrected information appears without a full document reload.
- [ ] Support a detail drawer with Close and Expand, and a full page at `/candidates/[id]`, sharing the same content.
- [ ] Preserve list filters, pagination, scroll position, and unsaved changes when switching views.
- [ ] Support mobile drawers, keyboard focus containment, Escape to close, and focus returning to the opener.
- [ ] Check: `/candidates/[id]` loads the correct record and shows every required field, including when opened directly.
- [ ] Check: navigation uses Next.js App Router `Link` and dynamic segments.
- [ ] Check: status and stage updates send PATCH requests from the detail view and persist after refresh.
- [ ] Check: the edit form validates required fields, sends PUT, and shows saving, success, and error feedback.
- [ ] Check: loading/error feedback is visible for detail requests, and terminology matches HealthCore CONTEXT.
- [ ] Check: HTTP errors and malformed responses from GET, PUT, and PATCH are displayed in the detail/edit UI.
- [ ] Check: successful detail fetching displays the correct loaded record, completing the loading/success/error states.
- [ ] Keep detail and edit state scoped to their shared view/components; avoid prop drilling through unrelated components.

## 6. Add and remove internal notes

Goal: add notes after calls or interviews and remove notes when they are no longer relevant.

Files: candidate detail Notes tab, shared note components, and `lib/api.ts`.

- [ ] Confirm note fields, the list response structure, the add-note payload, and the delete response.
- [ ] GET `/records/:id/notes`: define the note type and notes list response type, including any wrapper.
- [ ] POST `/records/:id/notes`: define the add-note request payload and response type.
- [ ] DELETE `/records/:id/notes/:note_id`: define the documented delete response type, using `void` if no content is returned.
- [ ] Use these types in the note API functions and component props without `any`; validate returned response shapes.
- [ ] Implement GET `/records/:id/notes` — list notes — using the shared fetch helper.
- [ ] Implement POST `/records/:id/notes` — add a note — using the shared fetch helper.
- [ ] Implement DELETE `/records/:id/notes/:note_id` — delete a note — using the shared fetch helper.
- [ ] Add Overview and Notes tabs and load notes through GET `/records/:id/notes`.
- [ ] Show notes only within the candidate detail view, in both drawer and expanded presentations.
- [ ] Use the same candidate ID for record and notes requests. Optionally load GET `/records/:id` and GET `/records/:id/notes` in parallel with `Promise.all`, while making request failures visible.
- [ ] Show notes, their actual count, and an empty state. Show dates/authors only when supplied by the API.
- [ ] Make Add Note open an inline text box with Cancel and Save Note.
- [ ] Reject blank notes and save through POST `/records/:id/notes` using the documented payload.
- [ ] Add inline Cancel and Delete Note confirmation before deletion.
- [ ] Delete through DELETE `/records/:id/notes/:note_id` and remove the note only after success.
- [ ] After a successful note POST, add the returned note to local state or refetch notes. After a successful DELETE using the selected note's ID, remove that note from state or refetch notes. Both operations must update the UI without a full document reload.
- [ ] Prevent duplicate requests and show saving/deleting, success, and failure feedback.
- [ ] Retain note text after a failed save and retain the existing note after a failed delete.
- [ ] Keep note counts synchronized and preserve the selected tab and unsaved note text between drawer and expanded views.
- [ ] Check: notes load with GET, save with POST, and delete with DELETE; the list and count update without a full page reload.
- [ ] Check: note requests show loading or pending feedback, successful mutations show success feedback, and failures show errors.
- [ ] Check: note labels match HealthCore CONTEXT and note types match the API structures.
- [ ] Check: HTTP errors and malformed responses from note requests are displayed in the Notes UI.
- [ ] Check: successful notes fetching displays the notes or empty result, completing the loading/success/error states.
- [ ] Keep note and composer state within the detail/notes components or a small shared hook; avoid prop drilling through unrelated components.

## 7. Create a new candidate

Goal: create a candidate who comes through a referral.

Files: `components/candidate-form.tsx`, candidate list/create views, and `lib/api.ts`.

- [ ] Confirm the required creation fields and POST response.
- [ ] POST `/records`: define the create-candidate request payload and response type, marking required and optional fields according to the backend documentation. Reuse existing candidate types where appropriate.
- [ ] Use these types in the creation API function and component props without `any`; validate the returned response shape.
- [ ] Implement POST `/records` — create a candidate — using the shared fetch helper.
- [ ] Add an Add Candidate action to the list.
- [ ] Open the new-candidate form on the list page, in a modal/drawer, or on a dedicated create route. Validate required fields before submitting POST `/records`.
- [ ] Reuse the candidate form from step 5 with empty fields for a new candidate.
- [ ] Include every field required by the API in the registration form.
- [ ] Validate required fields and formats against the backend documentation.
- [ ] Open an empty form for a referred candidate and save through POST `/records`. Add referral metadata only if supported by the documented API.
- [ ] Support drawer and expanded form views while preserving entered values.
- [ ] Add Cancel and saving/success/error feedback; prevent duplicate submissions and retain input after a failed save.
- [ ] Show inline or banner success feedback after a successful creation submission and error feedback after a failed attempt.
- [ ] Show the new candidate in the list after saving and keep form actions reachable on mobile.
- [ ] After a successful POST creation, update local list state or refetch candidates so the new candidate appears without a full document reload.
- [ ] Check: the creation form validates required fields, sends POST, and shows saving, success, and error feedback.
- [ ] Check: creation field labels match HealthCore CONTEXT, and request/response types match the API structures.
- [ ] Check: HTTP errors and malformed creation responses are displayed in the create form UI.
- [ ] Keep creation form state in the form or its owning view; avoid prop drilling through unrelated components.

## Final check

- [ ] Exercise the five workflows above in order using a disposable candidate.
- [ ] Check loading, empty, and failed request states, including failed saves.
- [ ] Compare all supplied screenshots with their desktop, tablet, and mobile views; also check a 375px-wide screen.
- [ ] Check HealthCore labels, keyboard navigation, visible focus, and drawer behavior.
- [ ] Run `npm run lint`, `npx tsc --noEmit`, and `npm run build`; fix failures.
- [ ] Update `README.md` with setup, API configuration, and remaining limitations.
- [ ] Verify `.env.local` is ignored by Git and is not included in the commit; include `.env.example` documenting the required environment variable.
- [ ] Commit and push the finished changes to your existing course monorepo fork on GitHub.
- [ ] Submit the repository link using your instructor's delivery instructions.
