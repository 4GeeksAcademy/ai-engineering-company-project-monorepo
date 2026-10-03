# `packages/shared`

Code shared by the backoffice, the API and the scripts.

| Path | What | Used by |
| --- | --- | --- |
| `incidents/contract.json` | **Single source of truth** for the incident rules: categories, lifecycle statuses and transitions, origins, default branch, the CSV status mapping, id patterns, limits. | everything below |
| `incidents_analyzer/` | Python package (install editable): the CSV validation/metrics engine of the first project (`analyze`, `validate_record`, …) plus `contract.py`, which loads the JSON. | `scripts/analyze.py`, `services/api` (CSV analysis, incident manager, seed) |
| `types/` | TypeScript source (no build step), published as `@repo/shared-types`: incident types, labels, lifecycle helpers and form validations, built on the JSON. | `uis/backoffice` |
| `test/` | `npm test` — Node's runner checks the TS side against the contract. | |

Change a rule in `contract.json` and all three sides follow; the API tests (`services/api/tests/test_incident_manager.py`) and `npm test` fail if a side drifts.
