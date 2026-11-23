# Rule: HealthCore Conventions

**Scope**: `always-on` — applies to every session and every file modification.

---

## 1. Status and Stage Labels

Raw API values must never appear in the UI. Always use the human-readable label mapping:

### Status mapping

```typescript
const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  in_progress: "In progress",
  selected: "Selected",
  discarded: "Discarded",
};
```

### Stage mapping

```typescript
const STAGE_LABELS: Record<string, string> = {
  pending: "Pending review",
  review: "Under review",
  personal_interview: "Personal interview",
  technical_interview: "Technical interview",
  offer_presented: "Offer presented",
};
```

## 2. Import Paths

- All API calls must go through `uis/<app-name>/lib/api.ts` — components must not call `fetch` directly.
- Shared types are imported from `@shared-types` (configured via `tsconfig.json` paths) or via relative paths to `packages/shared-types/index.ts`.
- Hooks go in `uis/<app-name>/hooks/`, components in `uis/<app-name>/components/`.

## 3. New Code Placement

| Type | Location |
| ---- | -------- |
| New frontend app | `uis/<app-name>/` |
| New backend service | `services/<service-name>/` |
| Shared TypeScript type | `packages/shared-types/index.ts` |
| Data pipeline / ETL script | `pipelines/data/` |

## 4. Validation

Before opening a PR, run:
- `tsc --noEmit` in the app directory to verify types.
- `npm run lint` or `next lint` if a linter config exists in the app.

## 5. Notes Visibility

Notes are visible **only** within the candidate detail view, never in the list or summary views.
