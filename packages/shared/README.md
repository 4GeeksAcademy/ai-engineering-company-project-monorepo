# Shared Types Package (Brasaland)

This package contains the TypeScript implementation for Brasaland entities, utilities, and business validations defined in CONTEXT.md.

## Local Commands

- First-time setup (fresh clone):

```bash
npm --prefix packages/shared install
```

- Validate TypeScript:

```bash
npm --prefix packages/shared run validate
```

- Typecheck directly:

```bash
npm --prefix packages/shared run typecheck
```

- Run demo execution:

```bash
npm --prefix packages/shared run dev
```

## File Structure

- types/entities.ts: main entities and context-based rule entities
- types/filters.ts: filtering helpers
- types/sorting.ts: sorting helpers
- types/search.ts: linear and binary search helpers
- types/aggregations.ts: totals, averages, extrema, and KPI reports
- types/validations.ts: business/object validations
- types/business-rules.ts: context-specific operational rule helpers
- types/index.ts: exports
