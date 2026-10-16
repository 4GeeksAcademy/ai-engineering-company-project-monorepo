# Technical Context

## Current repository baseline

This repository now combines three active implementation layers:

- repo-level agent governance and memory-bank rules
- Milestone 2 logistics utilities and test interface in `src/`
- Next.js UI surfaces in `uis/website` and `uis/backoffice`

## Existing implementation surfaces

### 1. Milestone 2 TypeScript utility layer in src

The `src/` folder now includes a substantial Milestone 2 implementation, not only static prototype files.

Core modules:

- `src/types/models.ts`: domain types for products, shipments, carriers, inventory movements, and sample datasets.
- `src/utils/collections.ts`: filtering and sorting utilities for product and carrier operations.
- `src/utils/search.ts`: linear search and binary search utilities.
- `src/utils/transformations.ts`: shipping-cost calculation, carrier scoring/selection, and aggregation utilities.
- `src/utils/validations.ts`: validation helpers for product, shipment, and carrier entities.
- `src/index.ts`: central export barrel.
- `src/demo.ts`: demo runner that exercises all major utility functions.

Milestone UI/test surface:

- `src/index.html`: browser testing console for Milestone 2 operations.
- `src/testing-interface.js`: event handlers and in-browser operation orchestration for filters, search, sorting, carrier scoring, reports, and validations.
- `src/milestone2-output.js`: shared Milestone 2 output helper that powers dummy-order output generation for both browser testing and Node scripts.
- `scripts/generate_milestone2_output.cjs` now reads `products`, `carriers`, `shipments`, and optional `milestone2OrderContext` directly from `src/testing-interface.js`, making the sync artifacts source-aligned with the UI test dataset.
- `scripts/generate_milestone2_output.cjs` supports `--shipment=<shipmentId>` to force output generation for a specific testing-interface shipment.
- `scripts/generate_milestone2_output.cjs` also supports `TRACKFLOW_SHIPMENT_ID=<shipmentId>` as an environment override when no `--shipment` argument is passed.
- `src/milestone2-output.js` now supports `selectedShipmentId`, enabling generation from the shipment currently selected in `src/testing-interface.js`.
- `src/testing-interface.js` now maintains an `activeShipmentId` context updated by user operations and passes it to milestone output generation.
- `src/TrackFlow.html` includes anchor-based top navigation links targeting `#header`, `#site-nav-target`, `#contact`, and `#footer`, with `Apply` linking to `application.html`.

Implication:

- Milestone 2 logic currently has a concrete home in `src/` and can be manually exercised from the test interface.
- This logic is not yet packaged for direct reuse from `packages/shared`.

### 2. Public website app

`uis/website` is now a TypeScript Next.js app with Milestone 1 section parity restored.

Observed characteristics:

- App Router files use TypeScript (`layout.tsx`, `page.tsx`).
- `package.json` includes `typecheck` and TypeScript dev dependencies.
- `tsconfig.json` and `next-env.d.ts` are present.
- The page includes header/nav, hero, benefits/services, contact section, and footer.

### 3. Backoffice app

`uis/backoffice` is now a TypeScript Next.js app and no longer computes carrier mapping inline in the page component.

Observed characteristics:

- App Router files use TypeScript (`layout.tsx`, `page.tsx`).
- `package.json` includes `typecheck` and TypeScript dev dependencies.
- `tsconfig.json` and `next-env.d.ts` are present.
- Route `/` is now an Operations Home launcher with a dropdown for available internal pages.
- `uis/backoffice/lib/milestone2.ts` parses `.trackflow-dummy-order.txt` and returns structured values.
- `uis/backoffice/lib/milestone2.ts` reads `.trackflow-milestone2-output.json` as the single source for rendered Milestone 2 output.
- `uis/backoffice/app/milestone-2-output/page.tsx` renders imported Milestone 2 output on screen.
- `uis/backoffice/package.json` now runs `milestone2:sync` automatically before `dev` and `build`.

Implication:

- Backoffice depends on a file-based integration path to generated output, which is good for milestone visibility but can become stale without regeneration.

### 4. Legacy/internal reference app

`uis/talent-pipeline-tracker` remains a functional TypeScript Next.js app but is domain-misaligned (recruitment rather than logistics). It should be treated as reference or migration candidate, not as the business source-of-truth UI.

### 5. Shared package

`packages/shared` still provides minimal placeholder shared types (`Id`, `BaseEntity`) and has not yet absorbed Milestone 2 domain models.

## Feedback-related status

- Website section parity issue: resolved in `uis/website`.
- JavaScript vs TypeScript issue for website/backoffice: resolved.
- Backoffice inline logic issue: resolved by importing generated output based on `src/testing-interface.js` data.
- Milestone output consistency is now driven by `scripts/generate_milestone2_output.cjs`, which writes both `.trackflow-dummy-order.txt` and `.trackflow-milestone2-output.json` from the shared helper using `src/testing-interface.js` data as input.

## Technical constraints and assumptions

- Work must preserve monorepo structure and remain Windows-friendly.
- Milestone 2 logic in `src/` is currently authoritative for local utility behavior and demo coverage.
- A future decision is needed on consolidation: keep `src/` as milestone playground vs move reusable logic to `packages/shared`.

## Validation and working practices

- Website and backoffice have local validation commands: `npm run typecheck` and `npm run build`.
- Memory updates remain mandatory when architecture, milestone output, or workflow interpretation changes.
- Git hygiene from earlier GH001 issue remains relevant: generated artifacts (`node_modules`, `.next`, `out`) must stay untracked.
