# HealthCore TypeScript utilities

The domain types and pure utilities in this folder implement the clinic directory and patient-enquiry rules in the root [CONTEXT.md](../CONTEXT.md). The enquiry fields retain the exact form `name` attributes.

## Commands

- `npm run typecheck` checks the TypeScript without emitting files.
- `npm test` compiles the modules for Node's built-in test runner and runs the focused utility and validation tests.
- `npm run build:typescript` emits browser-compatible ES modules to `dist/types/`.
- `npm run build` builds the existing static site and the TypeScript modules.

After building the site, browser code can import the modules with standard ES module imports, for example:

```html
<script type="module">
  import { CLINICS, filterItems } from "./types/index.js";
  const texasClinics = filterItems(CLINICS, (clinic) => clinic.state === "TX");
  console.log(texasClinics);
</script>
```

Binary search expects items sorted in ascending order using the same comparator passed to the search function. Collection and transformation helpers do not mutate their input arrays.

## Input and output contracts

- `linearSearch` returns the first matching index. Both searches return `-1` for empty input or a missing match. Binary search can return any matching index when values are duplicated.
- `filterItems` and `sortItems` return new arrays; `groupBy` returns a `Map` of new arrays. Records inside these arrays retain their original references.
- `countBy` returns a `Map` containing only encountered categories. `sumBy` returns `0` for an empty collection; `averageBy`, `minimumBy`, and `maximumBy` return `undefined`. Minimum and maximum return the original record, retaining the first record on a tie. Numeric selectors should return finite numbers.
- `createEnquiryReport` expects typed, previously validated enquiries. It does not validate or drop records. Its `byClinic` and `byService` maps contain counts; `enquiriesByClinic` contains grouped records. Empty input yields `totalEnquiries: 0` and three empty maps. Maps require explicit conversion (for example `Object.fromEntries(report.byClinic)`) before JSON serialization.
- `validatePatientEnquiry` accepts unknown input and returns `{ isValid, errors, warnings }`. Errors use the exact form field names and the selected English or Spanish messages. Warnings are non-blocking. Validation neither stores nor transmits input and does not normalize or replace the original record.
- Patient IDs are optional for returning patients: missing, `undefined`, or blank strings are accepted; supplied non-string values and nonblank strings without the `HC-` plus six alphanumeric characters format are rejected. Patient IDs are ignored for new patients. Insurance fields are required only when `has_insurance` is `"yes"`.
- Date strings must be real `YYYY-MM-DD` dates. The reference clock defaults to the current time; pass a `Date` as the third argument for deterministic tests. "Today" uses that clock's local calendar date, with UTC calendar arithmetic afterward to avoid daylight-saving shifts. On a server, this means the server's local timezone.
- Appointment dates must fall between the next Monday-Friday business day and 60 calendar days ahead, inclusive. This is an enquiry window, not a check of appointment availability or clinic opening days. Public holidays are not modeled. Evening warnings use the clinic's published weekday closing time, matching the existing public form.
- Invalid language settings and invalid reference dates throw `RangeError`; missing or malformed enquiry fields produce field-specific errors instead.

## Scope and verification

These modules use the available website [CONTEXT.md](../CONTEXT.md). A separate programming-milestone briefing has not been supplied, so any additional required entity names or report shapes must be checked against that briefing before submission. The existing public form remains independent of these modules.

Tests cover malformed input, optional patient IDs, insurance limits, the 60-day window, age 120/121, eighteenth birthdays, character limits, search endpoints, empty reports, and non-mutation. To exercise local-date behavior in another timezone:

```bash
TZ=America/Los_Angeles npm test
```
