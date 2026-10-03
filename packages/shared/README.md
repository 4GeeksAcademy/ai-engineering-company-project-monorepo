# `packages/shared`

Code shared by the backoffice, the API and the scripts. The rule of the monorepo: **a rule of the incident domain is written
here once**; `scripts/`, `services/` and `uis/` consume it, never copy it.

| Path | What | Used by |
| --- | --- | --- |
| `incidents/contract.json` | **Single source of truth** for the incident rules: categories, lifecycle statuses and transitions, origins, default branch, the CSV status/category maps, id patterns, limits. | everything below |
| `incidents_analyzer/` | Python package (standard library only; install editable): the CSV validation and metrics of the first project, and the pure rules of the incident manager. | `scripts/`, `services/api` |
| &nbsp;&nbsp;`contract.py` | Loads the JSON as Python constants. | |
| &nbsp;&nbsp;`core.py` | CSV validation and report: `validate_record`, `analyze`, `format_report`, `to_export_rows`… | `scripts/analyze.py`, API CSV analysis, seed |
| &nbsp;&nbsp;`rules.py` | `allowed_transitions`, `is_editable`, `branch_value` (an office by its value or display name). | API lifecycle and model |
| &nbsp;&nbsp;`transform.py` | CSV row → incident: status/category maps, description → title (first 120 characters), date → created_at, location → branch, origin; the `ticket_id` only becomes a `source_key` to avoid duplicates; `import_problems` (= `validate_record` + known status + real date); `to_incident_fields`. | `scripts/seed_incidents.py` via `services/api` |
| `types/` | TypeScript source (no build step), published as `@repo/shared-types`: incident types, labels, lifecycle helpers and form validations, built on the same JSON. | `uis/backoffice` |
| `test/`, `incidents_analyzer/tests/` | The TypeScript side (`npm run test:shared`) and the Python side (`pytest packages/shared/incidents_analyzer`, with the API's virtualenv). | |

Where each consumer sits:

```
scripts/analyze.py        -> incidents_analyzer.core            (validate, analyze, report)
scripts/seed_incidents.py -> incidents_analyzer.transform       (validate + translate the CSV row)
                             services/api/incidents/seeding.py  (IncidentRecord model + store: needs the API)
services/api/incidents    -> incidents_analyzer.{core,rules,contract,transform}
uis/backoffice            -> @repo/shared-types  -> incidents/contract.json
```

Change a rule in `contract.json` (or in `rules.py` / `transform.py`) and every side follows. Three things keep it honest:
`incidents_analyzer/tests` (the rules and that the package stays standard-library only, so a script can use it without the API's
dependencies), `services/api/tests/test_shared_logic.py` (the API and the scripts import the shared package, no rule is copied
outside it, the layout of the monorepo is kept) and `npm run test:shared` (the TypeScript reads the same contract).
