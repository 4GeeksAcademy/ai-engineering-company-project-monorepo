# Tech Context

## Audited scope

1. `uis/landing_page`
2. `scripts`
3. `uis/talent-pipeline-tracker`

## Stack by area

### 1) `uis/landing_page`

1. Static HTML pages: `index.html` and `application.html`.
2. Styling via Tailwind CSS CDN and custom CSS keyframe animations.
3. Vanilla JavaScript form validation in `validation.js`.
4. Schema.org Organization JSON-LD embedded in landing page.
5. Asset-based media under `assets/`.

Architecture notes:
1. Multi-page static architecture with direct link flow from hero CTA to application form.
2. Client-side validation enforces required business rules and expected error messages.
3. Success state is implemented via modal after simulated submission.

### 2) `scripts`

1. TypeScript domain models in `src/models/models.ts`.
2. Utility modules by concern:
   - `src/utils/collections.ts`
   - `src/utils/search.ts`
   - `src/utils/transformations.ts`
   - `src/utils/validations.ts`
3. Demonstration runner in `src/sample-usage.ts`.

Architecture notes:
1. Functional utility design with pure array/data transformations.
2. Strong domain typing for Candidate, Vacancy, and SelectionProcess entities.
3. Business scoring logic decomposed into small helper functions.

### 3) `uis/talent-pipeline-tracker`

1. Next.js App Router application (Next 16, React 19, TypeScript).
2. Tailwind CSS v4 and ESLint-based linting.
3. Client-side routed pages:
   - `/`
   - `/candidates/new`
   - `/candidates/[id]`
   - `/candidates/[id]/edit`
4. API layer under `lib/api/` with async requests to `PROJECT_API_URL`.
5. Componentized UI under `components/candidates/`.
6. Typed API contracts in `types/`.

Architecture notes:
1. Query-parameter-driven filtering and paging on list route.
2. Candidate detail route combines profile read, status/stage patch, and notes CRUD.
3. Form component reused for create and edit flows.
4. Company-specific labels map API enums into Nexova-oriented interface wording.

## Cross-cutting technical constraints

1. Context alignment is mandatory: terminology and framing must match Nexova scenario documents.
2. Async UX requirement: loading, success, and error states must be visible.
3. Environment dependency: tracker requires `PROJECT_API_URL` in `.env`.
4. Milestone constraints emphasize Next.js + React + TypeScript with no external state manager.

## Technical risks observed in audit

1. Root `CONTEXT.md` is still a placeholder; active context is split across subfolders (`scripts/context.md`, `uis/landing_page/project-context.md`, `uis/talent-pipeline-tracker/context.md`).
2. Tracker folder currently includes build/runtime artifacts (`.next/`) and dependency vendor tree (`node_modules/`) in workspace, which increases repo noise and review overhead.
3. No automated tests were found in the audited folders.
4. `scripts` has implementation code but no explicit package-level test or build harness in that folder.
