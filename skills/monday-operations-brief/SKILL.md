# Monday Operations Brief

## Objective

Produce a structured operational summary for **James Osei's Monday review** using Milestone 2 utility functions — billing denial rates, no-show impact by location, and CME compliance risk for clinicians.

## When to use

- Validating M2 reporting output before a demo or release
- Preparing sample markdown for the backoffice dashboard copy review
- Verifying utilities against `tests/utils/fixtures.ts` after changes to `src/utils/`

## Inputs

| Input | Type | Required | Description |
| --- | --- | --- | --- |
| `claims` | `Claim[]` | Yes | Billing claims dataset |
| `appointments` | `Appointment[]` | Yes | Appointment records |
| `clinicians` | `Clinician[]` | Yes | Clinician roster with CME hours |
| `locations` | `ClinicLocation[]` | No | For no-show cost context |
| `asOfDate` | `string` | Yes | ISO date for CME calculations (e.g. `"2025-06-30"`) |
| `weekEndingDate` | `string` | No | ISO date for weekly no-show cost window |

## Steps

1. Import utilities from **`src/utils`** (never copy source):

```typescript
import {
  calculateDenialRate,
  denialRateByPayer,
  flagHighDenialPayers,
  noShowRateByLocation,
  flagHighNoShowLocations,
  generateCMEReport,
  getCliniciansAtRisk,
} from "../../src/utils";
```

2. Run calculations on the input data.
3. Format output as markdown with **exactly these headings**:

```markdown
## Revenue Cycle & Billing
## Clinical Operations
## People & Workforce (CME)
```

4. Under **Billing**, include:
   - Overall denial rate (`calculateDenialRate`)
   - Per-payer rates (`denialRateByPayer`)
   - Flagged payers above **8%** (`flagHighDenialPayers`)

5. Under **Clinical Operations**, include:
   - Per-location no-show rates (`noShowRateByLocation`)
   - Flagged locations above **20%** (`flagHighNoShowLocations`)

6. Under **People & Workforce**, include:
   - Clinicians at risk (`getCliniciansAtRisk`) with `complianceStatus` of `at_risk` or `overdue`
   - Summary table from `generateCMEReport`: name, hours remaining, compliance status

## Acceptance criteria

- [ ] Output contains all three department sections with the headings listed above
- [ ] Denial threshold defaults to **8%**; no-show threshold defaults to **20%**
- [ ] CME section lists only clinicians with `at_risk` or `overdue` status (via `getCliniciansAtRisk`)
- [ ] No utility throws on valid data from `tests/utils/fixtures.ts`
- [ ] Functions imported from `src/utils`, not duplicated
- [ ] Percentages shown with `%` suffix; hours labeled explicitly

## Example invocation

Use fixture data from `tests/utils/fixtures.ts` with `asOfDate: "2025-06-30"` and pipe formatted markdown to stdout or a report file.
