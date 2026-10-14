# HealthCore Talent Pipeline Tracker — Implementation Plan

Build a typed Next.js App Router frontend for HealthCore's recruitment pipeline. Candidates, filters, updates, and notes must work without full document reloads.

## Progress dashboard

| Metric | Starting value | Completion target |
| --- | --- | --- |
| Implementation tasks completed | 0 / 38 | 38 / 38 (28 feature tasks + 10 UI tasks) |
| Progress | 0% | Completed tasks / 38 × 100 |
| REST actions verified | 0 / 8 | 8 / 8 |
| Acceptance checks passed | 0 / 16 | 16 / 16 |
| Mockup comparisons passed | 0 / 33 | 33 / 33 (11 view/state groups × 3 sizes) |
| Final lint, type, and build checks passed | 0 / 3 | 3 / 3 |
| Open blockers | Not assessed | 0 |

Update this dashboard after each work session. All tasks start unchecked because implementation has not been verified.

## How to use this plan

- Work in 15–30 minute intervals; estimates below are timeboxes, not guarantees. Total estimated implementation effort: 14–18 hours including the mockup requirements, excluding API access delays.
- Pick the next unblocked task. If it exceeds 30 minutes, split its remaining work into smaller subtasks under the same ID.
- Check a task only after its completion check passes.
- If blocked, record the missing information and continue with independent tasks. Do not invent API fields or enum values.
- Use local `useState`, `useReducer`, or small hooks. Do not add Redux, Zustand, Jotai, or similar libraries.

## Intended structure

```text
app/
  page.tsx                       # Candidate list at /
  candidates/[id]/page.tsx        # Candidate detail
  layout.tsx                     # Fonts, metadata, shared layout
  globals.css
components/                      # Rows, filters, forms, notes, feedback
lib/api.ts                       # Fetch helper and typed endpoint wrappers
types/                           # Records, notes, payloads, API envelopes
hooks/useRecordsFilters.ts       # Optional URL/filter hook
.env.example                     # Public API URL only
```

Default to client view components for loading and local mutation state. Keep App Router navigation with `Link`. Follow the installed Next.js documentation for client boundaries, dynamic route parameters, and `useSearchParams`; add the required Suspense boundary where applicable. Use the mockups in `public/ui-ux/` as presentation references, with the specific requirements below. Confirm labels against the assigned HealthCore CONTEXT.

## Mockup requirements and scope

The repository's reference folder is `public/ui-ux/`. It contains 33 images: candidate list (3), detail overview (6), detail notes in list/composer/delete-confirmation states (18), and create candidate (6). Each group covers desktop, tablet, and mobile. Folder names such as `add-notes` and `save-notes` describe screenshots of interaction states, not additional API operations.

| Area | Reference folders | Implementation requirement |
| --- | --- | --- |
| Candidate list | `candidate-list/` | Branded header, search, two filters, Clear filters, blue add button, status/stage pills, desktop/tablet table, mobile cards and candidate count |
| Detail overview | `candidate-detail/{drawer,expanded}/overview/` | Initials avatar, name/position, status/stage pills, Overview/Notes tabs with note count, Recruitment Progress and General Information sections, Edit action |
| Detail notes | `candidate-detail/{drawer,expanded}/notes/{add-notes,save-notes,delete-notes}/` | Internal Notes list, Add Note action, inline textarea composer with Cancel/Save Note, timestamps, delete icons, inline confirmation with Cancel/Delete Note |
| Candidate creation | `create-candidate/{Drawer,expanded}/` | Drawer and expanded form, close/view-switch controls, labeled fields, required markers, Cancel/Create Candidate actions, single-column narrow layout and two-column wide layout |

Presentation rules:

- Use a pale gray page background, white surfaces, subtle borders/shadows, rounded controls/cards, dark headings, muted secondary text, and blue primary actions. Keep status text visible alongside colors: Received blue, In progress amber, Selected green, Discarded red, subject to confirmed API enums. Stage pills use neutral styling.
- Treat desktop/tablet detail drawers as right-side panels over a dimmed list; mobile drawers fill the available viewport. Expanded detail is the canonical `/candidates/[id]` page. Share detail/form components across presentations rather than duplicating business logic.
- Opening a candidate from the list should support the drawer and an expand action; direct links and refresh must render the canonical detail page. Closing or switching back must preserve list filters, search, pagination, and relevant scroll position. Select the routing approach after task 02; do not require advanced routing if a small local drawer meets these checks.
- Overview and Notes are tabs for the same candidate. Preserve the selected tab and any unsaved form/note input when changing drawer/expanded presentation. Note counts, header pills, and the underlying candidate list must reflect successful mutations.
- Mockup counts, people, dates, and note authors are sample data. Show Last Updated and note author metadata only if returned by the API; never fabricate them. Use actual API totals for server pagination. If all records are returned, filter/search before client pagination; do not display a global-search claim when only one server page is loaded.
- Creation includes Full Name, Email Address, Phone Number, Position, LinkedIn URL, CV URL, and Years of Experience. Name/email/position have required markers in the mockups; reconcile them with the API. CV is a URL field, not a file-upload requirement. Keep form actions reachable while scrolling, even where a screenshot crops them out.
- Edit has no dedicated mockup. Reuse the candidate form and visual style while retaining the required PUT behavior. Loading/error/success states remain required even though the reference images mostly show successful data.
- Use the mockups for layout intent, not device-frame decorations, clipped text, awkward button wrapping, or sample values. Determine responsive breakpoints from usable content; verify the three reference sizes plus a narrow 375px viewport.

## UI tasks — schedule alongside feature tasks

These ten tasks are part of the 38-task total. Complete UI01–UI02 before task 09; schedule the others beside the specified feature tasks. Final task 28 depends on all UI tasks.

- [ ] **UI01 — Define shared visual styles (20–30 min).** Establish colors, spacing, type hierarchy, borders, radii, buttons, and status/stage pills from the references. **Done:** shared styles render consistently on list, detail, and forms; status meaning is readable without color.
- [ ] **UI02 — Build the application header (15–25 min).** Add the product mark/title and responsive content container in the shared layout. **Done:** desktop, tablet, and mobile match the header's hierarchy and alignment without overflow.
- [ ] **UI03 — Build responsive list presentation (20–30 min; alongside 09).** Render a semantic table on wide layouts and candidate cards with a navigation affordance on mobile. **Done:** all four required list fields remain visible in both layouts; visible candidate count comes from real data.
- [ ] **UI04 — Add Clear filters and pagination (20–30 min; after 11–12).** Clear status, stage, and local search together while retaining unrelated URL parameters. Add accurate range/total labels and working page controls where multiple pages exist. **Done:** clearing resets to page one; changing filters/search resets or clamps pagination; first/last controls disable correctly; counts and search scope match the contract.
- [ ] **UI05 — Build drawer behavior (20–30 min; alongside 13–14).** Create a shared responsive panel with overlay, close/expand controls, scroll containment, accessible dialog labeling, focus containment, Escape handling, and focus restoration. **Done:** panel works at all three sizes; keyboard cannot enter the obscured list; closing returns focus to the opener.
- [ ] **UI06 — Connect expanded views and detail tabs (20–30 min; alongside 15 and 18).** Share detail content, render initials/header pills, and connect Overview/Notes tabs plus drawer/expanded navigation. **Done:** deep links work; tab selection, list context, and unsaved input survive view changes; note badge reflects the actual notes count.
- [ ] **UI07 — Match the note composer (15–25 min; alongside 19).** Add an inline textarea with Cancel and Save Note. **Done:** Add Note opens/focuses the composer; Cancel makes no POST; failed save retains text; successful save updates list and count once.
- [ ] **UI08 — Add inline note deletion confirmation (15–25 min; before completing 20).** Show the selected note's destructive confirmation with red Delete Note and Cancel controls. **Done:** opening/canceling confirmation sends no DELETE; confirming targets only that note; failure retains the note and shows an error; success updates counts in both views.
- [ ] **UI09 — Match create/edit form presentations (20–30 min; alongside 21–23).** Share the form across drawer/expanded views, add close/view-switch controls, and keep footer actions reachable. **Done:** narrow/wide layouts match the reference field hierarchy; view switching preserves input; Cancel sends no mutation; Edit is discoverable from detail.
- [ ] **UI10 — Record responsive comparison evidence (20–30 min; after UI03–UI09).** Complete the 33-cell matrix below using screenshots and interaction observations. **Done:** every cell passes or has a documented fix; all fixes are verified before task 28. Split comparison work by view group if it exceeds the timebox.

## Phase 1 — Confirm the contract and prepare the app

- [ ] **01 — Record the real API contract (20–30 min).** Find project CONTEXT and official API documentation. Record exact fields, required fields, status/stage enums, date formats, list envelope/pagination, note payload, response shapes, authentication requirements, and error shapes. **Done:** all eight REST actions below have documented request/response expectations; unknowns are recorded as blockers.
- [ ] **02 — Review version-specific routing guidance (15–20 min).** Read relevant guides from the resolved `node_modules/next/dist/docs/` location before writing code, as required by `AGENTS.md`. Confirm dynamic params and search-param/Suspense conventions. **Done:** the routing approach follows the installed documentation.
- [ ] **03 — Configure the API URL (15–20 min).** Document `NEXT_PUBLIC_API_URL` in `.env.example`, normalize trailing slashes centrally, and show a useful missing-configuration error. Keep secrets out of source control; public variables are browser-visible. **Done:** configured URLs with/without trailing slashes produce the same endpoint; missing URL produces an actionable error.
- [ ] **04 — Define domain and payload types (20–30 min).** Add candidate, note, create, full-update, partial-update, and actual response-envelope types. Use exact API names. **Done:** required display fields and all request bodies are typed without `any`.

## Phase 2 — Build the API layer

Depends on 01–04. The existing `lib/api.ts` is empty and can hold these helpers.

- [ ] **05 — Add the shared fetch helper (20–30 min).** Use async/await, normalize the base once, merge headers safely, check `response.ok`, and handle HTTP errors. **Done:** successful JSON and non-2xx responses produce the expected typed result or useful error.
- [ ] **06 — Handle response edge cases (20–30 min).** Handle 204/empty responses where allowed; reject unexpected empty data, invalid JSON, and malformed payload shapes. TypeScript assertions alone do not validate responses. **Done:** valid JSON, permitted no-content, invalid JSON, and wrong-shape fixtures each have a documented outcome.
- [ ] **07 — Add candidate endpoint wrappers (20–30 min).** Implement list, get, create, replace, and partial update. **Done:** all five methods/paths and typed bodies match the contract table; pagination/envelope behavior follows confirmed docs.
- [ ] **08 — Add note endpoint wrappers (15–25 min).** Implement list, add, and delete using record/note IDs. **Done:** all three wrappers use correct methods, paths, and response handling, including no-content deletion.

## Phase 3 — Candidate list

Depends on 07 and UI01–UI02. Complete 09 before the remaining list tasks; pair list features with UI03–UI04.

- [ ] **09 — Load and render candidates (20–30 min).** Fetch records and extract the documented list shape. **Done:** `/` displays API candidates with name, position, status, and stage.
- [ ] **10 — Add list loading/error/empty states (20–25 min).** Show loading feedback, an error with retry, and separate empty-list/no-match messages. **Done:** delayed, failed, empty, and filtered-empty requests each render the expected state.
- [ ] **11 — Synchronize status/stage with the URL (20–30 min).** Read query values, preserve unrelated parameters, remove empty filter keys, and navigate with App Router. Avoid a trailing `?` when no parameters remain. **Done:** each filter and their combination restore after refresh, link sharing, and back/forward navigation.
- [ ] **12 — Add name/email search (15–25 min).** Use case-insensitive client search across the loaded records unless documented server search is required. Combine search with both filters. **Done:** mixed-case name and email searches return expected matches without document reloads; pagination/search scope follows the API contract.
- [ ] **13 — Add candidate navigation (15–20 min).** Link each row to `/candidates/[id]`. **Done:** two different candidates open their corresponding details, and navigation back returns to the list.

## Phase 4 — Candidate detail and partial updates

Depends on 07–08 and 13. Pair detail work with UI05–UI06 so drawer and expanded views share data and mutations.

- [ ] **14 — Load record and notes (20–30 min).** Fetch both, preferably in parallel; expose loading and request failures clearly. **Done:** the selected ID is used in both requests; an invalid ID produces a readable error and a route back.
- [ ] **15 — Render the complete overview (20–30 min).** Display name, email, phone, position, LinkedIn, CV link, years of experience, status, stage, and application date using actual API fields. **Done:** all 11 fields have HealthCore labels; optional missing values are readable and valid links work.
- [ ] **16 — Update status with PATCH (20–30 min).** Submit the minimal documented body, disable duplicate submits, and update local data or refetch after success. **Done:** network request contains only the intended fields; the new status appears immediately and persists after refresh; failures show feedback.
- [ ] **17 — Update stage with PATCH (20–30 min).** Use documented stage values and the same mutation feedback pattern. **Done:** stage persists after refresh without a document reload during submission; a failed request does not display a false success.

## Phase 5 — Notes

Depends on 14 and 08. Pair note features with UI07–UI08; deletion requires the mockup's inline confirmation.

- [ ] **18 — Render notes and their states (15–25 min).** Display documented note fields and an empty state. **Done:** populated and empty notes lists render correctly, and note failures remain visible.
- [ ] **19 — Add a note (20–30 min).** Validate required content and POST the documented payload. **Done:** blank content is blocked; a valid note appears once without reload and persists after refresh; success/error feedback is visible.
- [ ] **20 — Delete a note (20–30 min).** DELETE with the correct note ID, then remove locally or refetch only after success. **Done:** deleted note disappears and remains absent after refresh; failures retain the note and show an error; repeated clicks do not duplicate requests.

## Phase 6 — Create and full edit

Depends on 04, 07, and the list/detail views. Pair with UI09: creation must support drawer and expanded presentations, and editing reuses the same form. A dedicated create route is optional.

- [ ] **21 — Build a reusable candidate form (20–30 min).** Use typed fields, labels, required-field validation, and API-documented format constraints. **Done:** blank required values and invalid documented formats are blocked with field-level messages; edit defaults preserve existing data.
- [ ] **22 — Connect candidate creation (20–30 min).** POST the validated body and refresh local list data or navigate to the created record. **Done:** one valid submit creates one candidate visible in the UI and after refresh; success/error and pending states are visible.
- [ ] **23 — Connect full candidate editing (20–30 min).** PUT the full resource or exact documented replacement shape, preserving fields the form does not expose. **Done:** edited values persist after refresh, required existing data is preserved, and failure feedback leaves entered values available to retry.

## Phase 7 — Review and finish

Depends on the relevant feature tasks; final checks depend on all implementation tasks.

- [ ] **24 — Verify mutation feedback (20–25 min).** Exercise status, stage, add note, delete note, create, and edit with success and failure responses. **Done:** all six flows show pending/success/error feedback and prevent duplicate submissions; malformed responses surface visibly.
- [ ] **25 — Review layout, terminology, and accessibility (20–30 min).** Compare with HealthCore CONTEXT and existing UI references at mobile/tablet/desktop widths. Check labels, keyboard operation, visible focus, and readable feedback. **Done:** all three sizes are usable with no horizontal overflow; controls work with keyboard; labels follow CONTEXT.
- [ ] **26 — Verify the eight REST actions (20–30 min).** Use a disposable candidate and note against the documented API; record method, path, status, and resulting UI state without storing secrets or personal data. **Done:** 8/8 actions below pass, including persistence after refresh and local mutation updates.
- [ ] **27 — Run final quality checks (15–30 min).** Run `npm run lint`, `npx tsc --noEmit`, and `npm run build`; fix relevant failures and rerun failed checks. **Done:** all three exit successfully, including route/search-param build requirements.
- [ ] **28 — Complete handoff and acceptance review (20–30 min).** Update README with setup, API variable, drawer/expanded behavior, verification steps, and any limitations. Complete the acceptance checklist and progress dashboard after UI01–UI10. **Done:** 16/16 acceptance checks and 33/33 mockup comparisons pass, no unresolved issues prevent completion.

## REST verification matrix

Paths are relative to the normalized `NEXT_PUBLIC_API_URL`, which may already include `/api/v1`.

| Verified | Action | Method | Path | Observable result |
| --- | --- | --- | --- | --- |
| [ ] | List candidates | GET | `/records` | API candidates appear on `/` |
| [ ] | Get candidate | GET | `/records/:id` | Correct record and full overview appear |
| [ ] | Create candidate | POST | `/records` | New candidate persists |
| [ ] | Replace candidate | PUT | `/records/:id` | Full edited record persists |
| [ ] | Partial update | PATCH | `/records/:id` | Both status and stage changes persist |
| [ ] | List notes | GET | `/records/:id/notes` | Correct candidate's notes appear |
| [ ] | Add note | POST | `/records/:id/notes` | New note appears once and persists |
| [ ] | Delete note | DELETE | `/records/:id/notes/:note_id` | Correct note is removed persistently |

## Final acceptance checklist

- [ ] **A01:** `/` lists candidates from GET `/records` with name, position, status, and stage.
- [ ] **A02:** Status/stage filters use URL query parameters and restore on refresh/share.
- [ ] **A03:** Name/email search works without full document reload.
- [ ] **A04:** `/candidates/[id]` loads the correct record and shows all required fields.
- [ ] **A05:** Detail status and stage controls both work through PATCH.
- [ ] **A06:** Notes list, POST add, and DELETE work with immediate UI updates.
- [ ] **A07:** POST create and PUT edit validate required fields and show success/error feedback.
- [ ] **A08:** Async operations show loading, success where relevant, and HTTP/malformed-response errors.
- [ ] **A09:** State remains local; navigation uses App Router links and dynamic segments.
- [ ] **A10:** Components, types, and API access are separated; types match actual payloads without `any`.
- [ ] **A11:** Terminology and labels follow HealthCore's assigned CONTEXT.
- [ ] **A12:** List uses wide-screen tables/mobile cards, accurate counts, Clear filters, and functional pagination where applicable.
- [ ] **A13:** Detail drawer/expanded views and Overview/Notes tabs work; direct detail links render correctly; switching preserves list context and unsaved input.
- [ ] **A14:** Note composer supports Cancel/Save; deletion requires inline confirmation; note counts and candidate pills stay synchronized after mutations.
- [ ] **A15:** Create supports drawer/expanded layouts with preserved input, required markers, reachable actions, and a discoverable Edit flow.
- [ ] **A16:** All 33 visual comparisons pass; drawers, tabs, icon buttons, and forms support keyboard access, focus visibility, and narrow screens.

## Mockup comparison matrix

Each cell represents one supplied reference image. Check it after comparing an implementation screenshot and verifying the relevant interaction. Image filenames contain spelling differences, so use the actual files under the listed folders.

| View / state | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Candidate list | [ ] | [ ] | [ ] |
| Drawer overview | [ ] | [ ] | [ ] |
| Expanded overview | [ ] | [ ] | [ ] |
| Drawer notes list (`add-notes`) | [ ] | [ ] | [ ] |
| Expanded notes list (`add-notes`) | [ ] | [ ] | [ ] |
| Drawer note composer (`save-notes`) | [ ] | [ ] | [ ] |
| Expanded note composer (`save-notes`) | [ ] | [ ] | [ ] |
| Drawer note delete confirmation | [ ] | [ ] | [ ] |
| Expanded note delete confirmation | [ ] | [ ] | [ ] |
| Create candidate drawer | [ ] | [ ] | [ ] |
| Create candidate expanded | [ ] | [ ] | [ ] |
