# Brasaland Milestone Submission

## Project
- Company: Brasaland
- Milestone: Coding Fundamentals with TypeScript (Milestone 1)
- Repository: 4GeeksAcademy/ai-engineering-company-project-monorepo
- Branch: milestone-2-programming-fundamentals

## Live Demo Link
- Landing page: https://automatic-space-umbrella-qv7qr45jq5qrh6r9-3000.app.github.dev/index.html
- Manual tester: https://automatic-space-umbrella-qv7qr45jq5qrh6r9-3000.app.github.dev/testing.html
- Application form: https://automatic-space-umbrella-qv7qr45jq5qrh6r9-3000.app.github.dev/application.html

## Local Run Commands
- Install dependencies (required on fresh clone):

```bash
npm --prefix packages/shared install
```

- Run TypeScript validation:

```bash
npm --prefix packages/shared run validate
```

- Run TypeScript demo:

```bash
npm --prefix packages/shared run dev
```

- Serve frontend manually:

```bash
cd uis/website
npx http-server . -p 3000 -a 0.0.0.0
```

## Technical Deliverables Completed

### 1) TypeScript Interfaces aligned to CONTEXT.md
- Main entities with exact field names:
  - Branch
  - MenuItem
  - Order
  - Customer
  - Reservation
- Business rule entities:
  - BranchMenuAvailability
  - PrepTimeByCategory
  - Promotion
  - RegionalCompliance

Implementation:
- packages/shared/types/entities.ts

### 2) Filtering Functions
- Filter by category, price range, availability, currency
- Order filters by status, channel, branch_id, customer_id, total_amount range

Implementation:
- packages/shared/types/filters.ts

### 3) Sorting Functions
- Ascending and descending sort by selected field
- Multi-field sorting

Implementation:
- packages/shared/types/sorting.ts

### 4) Search Algorithms
- Linear search for unsorted arrays
- Binary search for sorted arrays returning index or -1

Implementation:
- packages/shared/types/search.ts

### 5) Aggregation and Reports
- Count by category
- Totals, averages, maximums, minimums
- Brasaland KPI report:
  - daily_sales
  - average_order_value
  - sales_by_branch
  - sales_by_channel
  - cancellation_rate

Implementation:
- packages/shared/types/aggregations.ts

### 6) Business Validations
- Entity-level validation for Branch, MenuItem, Order, Customer, Reservation
- Validation for business-rule objects and references
- Promotion date-range validation and relation checks

Implementation:
- packages/shared/types/validations.ts
- packages/shared/types/business-rules.ts

### 7) Frontend Manual Testing Page
- Tailwind page with operation controls and visible results
- Controls for:
  - filter
  - sort
  - linear search
  - binary search
  - reports
  - validations

Implementation:
- uis/website/testing.html
- uis/website/testing.js

## Rubric Alignment Evidence (Strict)

- Canonical graded implementation lives in `packages/shared/types/*.ts`.
- Rubric-compatible `src/` structure is present and maps directly to canonical modules:
  - `packages/shared/src/types/models.ts`
  - `packages/shared/src/utils/collections.ts`
  - `packages/shared/src/utils/search.ts`
  - `packages/shared/src/utils/transformations.ts`
  - `packages/shared/src/utils/validations.ts`
- Required TypeScript validation commands:

```bash
npm --prefix packages/shared install
npm --prefix packages/shared run validate
```

- Result: no TypeScript compile errors.
- Manual testing UI is included as an interaction layer to execute the same operation categories required by the rubric (filter, sort, linear search, binary search, aggregation, validation). The grading source remains the TypeScript modules under `packages/shared/types`.

## Code Quality Compliance
- Explicit types in TypeScript parameters and returns
- Single Responsibility Principle by module/function design
- Pure functions for utility logic
- Empty and not-found edge cases handled
- No TypeScript compile errors

## File Map
- packages/shared/types/entities.ts
- packages/shared/types/filters.ts
- packages/shared/types/sorting.ts
- packages/shared/types/search.ts
- packages/shared/types/aggregations.ts
- packages/shared/types/validations.ts
- packages/shared/types/business-rules.ts
- packages/shared/types/index.ts
- packages/shared/src/index.ts
- packages/shared/src/types/models.ts
- packages/shared/src/utils/collections.ts
- packages/shared/src/utils/search.ts
- packages/shared/src/utils/transformations.ts
- packages/shared/src/utils/validations.ts
- packages/shared/package.json
- packages/shared/tsconfig.json
- uis/website/index.html
- uis/website/application.html
- uis/website/testing.html
- uis/website/testing.js
- uis/website/validation.js

## Notes for Evaluator
- CONTEXT.md was used as the source of truth for entity names, field names, and rule scope.
- Binary search behavior follows the rubric requirement: index result or -1 if not found.
