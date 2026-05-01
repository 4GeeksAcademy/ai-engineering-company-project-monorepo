# CONTEXT — HealthCore

**Milestone 2: Programming Fundamentals**  
**Company:** HealthCore — Outpatient Healthcare Network  
**Your Role:** Junior AI Engineer, HealthCore Digital Team  
**Project Owner:** James Osei, CTO

---

## About HealthCore

HealthCore is an outpatient healthcare services company operating 12 clinics across the United States (Texas, Florida, Georgia) and the United Kingdom (London, Manchester). You're part of HealthCore Digital, the internal technology unit built to modernise clinical and operational workflows. The company processes around 600 patient visits per week, manages insurance billing across US and UK systems, and employs over 200 clinical and administrative staff.

---

## Your Assignment

James Osei, the CTO, needs you to build the core data processing logic for three of HealthCore's most pressing operational problems: billing denial tracking, no-show cost estimation, and CME (continuing medical education) compliance monitoring.

Right now, Tom Callahan's billing team calculates denial rates manually from CSV exports. Marcus Reid's clinical team has no way to estimate how much revenue is lost to no-shows each week. And Diane Foster's people team tracks CME hours in a spreadsheet with no alerts when clinicians fall behind — which creates real regulatory risk.

This milestone focuses on building the TypeScript functions that will power an internal operations dashboard. This is pure programming — no AI, no prompting. James needs to see that you can write solid, well-typed code that handles real business logic correctly.

> "The goal of this milestone is not complexity — it's reliability. These numbers go to Tom, Marcus, and Diane every Monday morning. If they're wrong, I hear about it. Write code you can trust."  
> — James Osei, CTO

---

## What You're Building

You will implement a set of TypeScript utilities to:

1. **Model claims, appointments, and clinician data** using interfaces
2. **Filter and search operational records** by location, status, and date
3. **Calculate billing denial rates** by payer and location
4. **Estimate no-show revenue impact** per clinic per week
5. **Track CME compliance** and flag clinicians at risk
6. **Validate data** before processing

---

## Business Entities

### Claim

A claim represents a billing request submitted to an insurance payer after a patient visit.

**Interface: `Claim`**

```typescript
interface Claim {
  claimId: string; // Format: "CLM-XXXXXX" (e.g., "CLM-000042")
  patientId: string; // Format: "HC-XXXXXX" (e.g., "HC-A3F291")
  locationId: string; // Clinic ID (e.g., "us-tx-001")
  serviceType: ServiceType; // Type of care delivered
  payerName: string; // Insurance provider name (e.g., "BlueCross")
  payerId: string; // Alphanumeric payer code
  submissionDate: string; // ISO 8601 date string
  claimAmount: number; // Amount billed in USD (must be > 0)
  status: ClaimStatus; // Current claim status
  denialReason?: DenialReason; // Only present when status === "denied"
  resubmitted: boolean; // Whether the claim was resubmitted after denial
}

type ClaimStatus = "submitted" | "approved" | "denied" | "pending" | "appealed";

type DenialReason =
  | "missing_authorisation"
  | "coding_error"
  | "duplicate_claim"
  | "patient_not_covered"
  | "service_not_covered"
  | "incomplete_documentation";

type ServiceType =
  | "primary_care"
  | "chronic_disease"
  | "preventive"
  | "specialist"
  | "womens_health"
  | "paediatric"
  | "mental_health";
```

**Validation Rules:**

- `claimAmount` must be > 0
- `submissionDate` must not be a future date
- `locationId` must match one of the known clinic IDs
- If `status === "denied"`, `denialReason` must be present
- `patientId` must match the format `HC-` followed by 6 alphanumeric characters

---

### Appointment

An appointment represents a scheduled patient visit at one of HealthCore's clinics.

**Interface: `Appointment`**

```typescript
interface Appointment {
  appointmentId: string; // Format: "APT-XXXXXX"
  patientId: string; // Format: "HC-XXXXXX"
  locationId: string; // Clinic ID
  serviceType: ServiceType; // Type of care scheduled
  scheduledDate: string; // ISO 8601 date string
  scheduledTime: string; // "HH:MM" in 24-hour format
  status: AppointmentStatus; // Current appointment status
  noShowReason?: string; // Free text, only present when status === "no_show"
  confirmedAt?: string; // ISO 8601 datetime, absent if not yet confirmed
}

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";
```

**Validation Rules:**

- `scheduledTime` must be a valid 24-hour time string in the format "HH:MM"
- `locationId` must match one of the known clinic IDs
- If `status === "no_show"`, `noShowReason` should be present (warn if missing, do not reject)

---

### Clinician

A clinician is a licensed clinical staff member who must maintain continuing medical education hours.

**Interface: `Clinician`**

```typescript
interface Clinician {
  clinicianId: string; // Format: "CLN-XXXXXX"
  firstName: string;
  lastName: string;
  role: ClinicianRole; // Determines CME requirements
  locationId: string; // Assigned clinic
  licenceState: string; // US state code (e.g., "TX") or "UK"
  licenceExpiryDate: string; // ISO 8601 date string
  cmeHoursRequired: number; // Annual CME hours required for this role
  cmeHoursLogged: number; // Hours logged so far in the current cycle
  cmeYearStartDate: string; // ISO 8601 date — start of current CME cycle
}

type ClinicianRole =
  | "physician"
  | "nurse_practitioner"
  | "nurse"
  | "medical_assistant";
```

**Validation Rules:**

- `cmeHoursRequired` must be >= 0
- `cmeHoursLogged` must be >= 0
- `licenceExpiryDate` must be a valid future or present date (past dates are flagged as expired)
- `role` must be one of the four defined values

---

### Location

A location represents one of HealthCore's clinics, including the average fees used for no-show cost calculations.

**Interface: `Location`**

```typescript
interface Location {
  locationId: string;
  name: string;
  city: string;
  stateOrCountry: string;
  country: "US" | "UK";
  phone: string;
  averageConsultationFee: Record<ServiceType, number>; // Average fee in USD per service type
}
```

---

## Required Functions

Implement these functions in the appropriate files according to the structure in the README.

### 1. Collection Operations (`src/utils/collections.ts`)

**`filterClaims(claims: Claim[], filters: Partial<Pick<Claim, "locationId" | "status" | "payerName" | "serviceType">>): Claim[]`**

- Returns claims that match ALL provided filter criteria
- Ignores filter keys that are not provided

**`filterAppointmentsByStatus(appointments: Appointment[], status: AppointmentStatus[]): Appointment[]`**

- Returns appointments whose status matches any of the provided statuses

**`sortClaimsById(claims: Claim[], direction: "asc" | "desc"): Claim[]`**

- Returns claims sorted alphanumerically by `claimId`
- Must not mutate the original array

**`sortAppointmentsByDate(appointments: Appointment[], direction: "asc" | "desc"): Appointment[]`**

- Returns appointments sorted by `scheduledDate`
- Must not mutate the original array

**`groupClaimsBy(claims: Claim[], key: "locationId" | "payerName" | "status" | "serviceType"): Record<string, Claim[]>`**

- Groups claims by the specified key
- Returns an object where each key maps to an array of matching claims

---

### 2. Search Operations (`src/utils/search.ts`)

**`findClaimById(claims: Claim[], claimId: string): Claim | null`**

- Performs linear search to find a claim by its ID
- Returns the claim if found, null otherwise

**`findClinicianById(clinicians: Clinician[], clinicianId: string): Clinician | null`**

- Performs linear search to find a clinician by their ID
- Returns the clinician if found, null otherwise

**`binarySearchClaimById(sortedClaims: Claim[], targetId: string): number`**

- Assumes the array is already sorted by `claimId` ascending (use `sortClaimsById` first)
- Performs binary search to find the index of the claim with the target ID
- Returns the index if found, -1 otherwise

---

### 3. Billing Denial Rate Calculator (`src/utils/transformations.ts`)

**`calculateDenialRate(claims: Claim[]): number`**

- Returns the denial rate as a percentage (0–100), rounded to 2 decimal places
- Only counts claims with status `"denied"` as denied
- Throws an error if the claims array is empty

**`denialRateByPayer(claims: Claim[]): Record<string, number>`**

- Groups claims by `payerName` and calculates the denial rate for each payer
- Returns an object where keys are payer names and values are denial rate percentages (rounded to 2 decimal places)
- Only includes payers that appear in the claims array

**`denialRateByLocation(claims: Claim[]): Record<string, number>`**

- Groups claims by `locationId` and calculates the denial rate for each location
- Returns an object where keys are location IDs and values are denial rate percentages (rounded to 2 decimal places)

**`flagHighDenialPayers(claims: Claim[], threshold: number): string[]`**

- Returns the names of payers whose denial rate exceeds the given threshold
- Use 8 as the default threshold (HealthCore's industry benchmark is 5–8%)
- Returns an empty array if no payers exceed the threshold

---

### 4. No-Show Cost Estimator (`src/utils/transformations.ts`)

**`calculateNoShowCost(appointments: Appointment[], location: Location, weekEndingDate: string): number`**

- Calculates the total estimated revenue lost to no-shows at a given location during the 7 calendar days ending on `weekEndingDate` (inclusive)
- Uses `location.averageConsultationFee[serviceType]` to estimate the cost of each missed appointment
- Returns 0 if there are no no-shows in that period
- Returns a number in USD, rounded to 2 decimal places

**`noShowRateByLocation(appointments: Appointment[]): Record<string, number>`**

- Calculates the no-show rate per location as a percentage
- Returns an object where keys are location IDs and values are percentages (rounded to 2 decimal places)

**`flagHighNoShowLocations(appointments: Appointment[], threshold: number): string[]`**

- Returns the IDs of locations whose no-show rate exceeds the given threshold
- Use 20 as the default threshold (HealthCore's internal alert level)

---

### 5. CME Compliance Tracker (`src/utils/transformations.ts`)

**`generateCMEReport(clinicians: Clinician[], asOfDate: string): CMEReport[]`**

Generates one report entry per clinician. Return type:

```typescript
interface CMEReport {
  clinicianId: string;
  fullName: string; // "${firstName} ${lastName}"
  role: ClinicianRole;
  locationId: string;
  hoursRequired: number;
  hoursLogged: number;
  hoursRemaining: number; // Math.max(0, required - logged)
  percentComplete: number; // (logged / required) * 100, rounded to 1 decimal
  daysRemainingInCycle: number; // Calendar days from asOfDate to end of CME cycle
  complianceStatus: CMEStatus;
  licenceExpiryDate: string;
  licenceDaysRemaining: number; // Calendar days from asOfDate to licence expiry
}

type CMEStatus = "on_track" | "at_risk" | "overdue" | "complete";
```

**Compliance status logic:**

- `"complete"` — `hoursLogged >= hoursRequired`
- `"overdue"` — the CME cycle has ended AND `hoursLogged < hoursRequired`
- `"at_risk"` — the cycle is active AND the clinician's `percentComplete` is more than 15 percentage points behind the share of the year that has elapsed
- `"on_track"` — the cycle is active and the clinician is not at risk

**`getCliniciansAtRisk(clinicians: Clinician[], asOfDate: string): Clinician[]`**

- Returns all clinicians whose `complianceStatus` is `"at_risk"` or `"overdue"`

**`getCliniciansWithExpiringLicences(clinicians: Clinician[], asOfDate: string, daysThreshold: number): Clinician[]`**

- Returns clinicians whose licence expires within `daysThreshold` calendar days from `asOfDate`
- Use 90 as the recommended threshold for first alerts, 30 for urgent alerts

---

### 6. Validations (`src/utils/validations.ts`)

**`validateClaim(claim: Claim, knownLocationIds: string[]): { valid: boolean, errors: string[] }`**

- Validates all business rules for a claim
- Returns `{ valid: true, errors: [] }` if all rules pass
- Returns `{ valid: false, errors: ["..."] }` with one message per failed rule

**`validateClinician(clinician: Clinician): { valid: boolean, errors: string[] }`**

- Validates all business rules for a clinician record
- Returns `{ valid: true, errors: [] }` if all rules pass

**`isDenialRateAboveThreshold(rate: number, threshold?: number): boolean`**

- Returns true if `rate` exceeds `threshold` (default: 8)

**`isNoShowRateAboveThreshold(rate: number, threshold?: number): boolean`**

- Returns true if `rate` exceeds `threshold` (default: 20)

---

## Sample Data

Use this data to test your functions. Field names and values must match the interfaces exactly.

### Sample Locations

```typescript
const sampleLocations: Location[] = [
  {
    locationId: "us-tx-001",
    name: "HealthCore Austin Central",
    city: "Austin",
    stateOrCountry: "TX",
    country: "US",
    phone: "(512) 340-8800",
    averageConsultationFee: {
      primary_care: 180,
      chronic_disease: 220,
      preventive: 150,
      specialist: 320,
      womens_health: 240,
      paediatric: 175,
      mental_health: 200,
    },
  },
  {
    locationId: "us-fl-001",
    name: "HealthCore Miami",
    city: "Miami",
    stateOrCountry: "FL",
    country: "US",
    phone: "(305) 510-7700",
    averageConsultationFee: {
      primary_care: 195,
      chronic_disease: 235,
      preventive: 160,
      specialist: 340,
      womens_health: 255,
      paediatric: 185,
      mental_health: 215,
    },
  },
  {
    locationId: "us-ga-001",
    name: "HealthCore Atlanta",
    city: "Atlanta",
    stateOrCountry: "GA",
    country: "US",
    phone: "(404) 330-9900",
    averageConsultationFee: {
      primary_care: 170,
      chronic_disease: 210,
      preventive: 145,
      specialist: 310,
      womens_health: 230,
      paediatric: 165,
      mental_health: 190,
    },
  },
];
```

### Sample Claims

```typescript
const sampleClaims: Claim[] = [
  {
    claimId: "CLM-000001",
    patientId: "HC-A3F291",
    locationId: "us-tx-001",
    serviceType: "primary_care",
    payerName: "BlueCross",
    payerId: "BC001",
    submissionDate: "2025-03-10",
    claimAmount: 180,
    status: "approved",
    resubmitted: false,
  },
  {
    claimId: "CLM-000002",
    patientId: "HC-B7K442",
    locationId: "us-fl-001",
    serviceType: "specialist",
    payerName: "Aetna",
    payerId: "AET002",
    submissionDate: "2025-03-11",
    claimAmount: 340,
    status: "denied",
    denialReason: "missing_authorisation",
    resubmitted: false,
  },
  {
    claimId: "CLM-000003",
    patientId: "HC-C2M881",
    locationId: "us-ga-001",
    serviceType: "chronic_disease",
    payerName: "Medicare",
    payerId: "MED003",
    submissionDate: "2025-03-12",
    claimAmount: 210,
    status: "approved",
    resubmitted: false,
  },
  {
    claimId: "CLM-000004",
    patientId: "HC-D9P553",
    locationId: "us-tx-001",
    serviceType: "preventive",
    payerName: "BlueCross",
    payerId: "BC001",
    submissionDate: "2025-03-13",
    claimAmount: 150,
    status: "denied",
    denialReason: "coding_error",
    resubmitted: true,
  },
  {
    claimId: "CLM-000005",
    patientId: "HC-E4Q117",
    locationId: "us-fl-001",
    serviceType: "mental_health",
    payerName: "Cigna",
    payerId: "CIG004",
    submissionDate: "2025-03-14",
    claimAmount: 215,
    status: "pending",
    resubmitted: false,
  },
];
```

### Sample Appointments

```typescript
const sampleAppointments: Appointment[] = [
  {
    appointmentId: "APT-000001",
    patientId: "HC-A3F291",
    locationId: "us-tx-001",
    serviceType: "primary_care",
    scheduledDate: "2025-03-10",
    scheduledTime: "09:00",
    status: "completed",
    confirmedAt: "2025-03-09T14:00:00Z",
  },
  {
    appointmentId: "APT-000002",
    patientId: "HC-F6R228",
    locationId: "us-fl-001",
    serviceType: "specialist",
    scheduledDate: "2025-03-11",
    scheduledTime: "11:30",
    status: "no_show",
    noShowReason: "Patient did not call to cancel",
  },
  {
    appointmentId: "APT-000003",
    patientId: "HC-G1S774",
    locationId: "us-tx-001",
    serviceType: "chronic_disease",
    scheduledDate: "2025-03-12",
    scheduledTime: "14:00",
    status: "no_show",
    noShowReason: "Unreachable before appointment",
  },
  {
    appointmentId: "APT-000004",
    patientId: "HC-H8T390",
    locationId: "us-ga-001",
    serviceType: "preventive",
    scheduledDate: "2025-03-13",
    scheduledTime: "10:00",
    status: "completed",
    confirmedAt: "2025-03-12T09:30:00Z",
  },
  {
    appointmentId: "APT-000005",
    patientId: "HC-I5U661",
    locationId: "us-fl-001",
    serviceType: "mental_health",
    scheduledDate: "2025-03-14",
    scheduledTime: "16:00",
    status: "no_show",
    noShowReason: "Transportation issue reported",
  },
];
```

### Sample Clinicians

```typescript
const sampleClinicians: Clinician[] = [
  {
    clinicianId: "CLN-000001",
    firstName: "Marcus",
    lastName: "Reid",
    role: "physician",
    locationId: "us-tx-001",
    licenceState: "TX",
    licenceExpiryDate: "2026-06-30",
    cmeHoursRequired: 40,
    cmeHoursLogged: 28,
    cmeYearStartDate: "2025-01-01",
  },
  {
    clinicianId: "CLN-000002",
    firstName: "Sandra",
    lastName: "Flores",
    role: "nurse_practitioner",
    locationId: "us-fl-001",
    licenceState: "FL",
    licenceExpiryDate: "2025-05-15",
    cmeHoursRequired: 30,
    cmeHoursLogged: 6,
    cmeYearStartDate: "2025-01-01",
  },
  {
    clinicianId: "CLN-000003",
    firstName: "David",
    lastName: "Okafor",
    role: "physician",
    locationId: "us-ga-001",
    licenceState: "GA",
    licenceExpiryDate: "2027-01-01",
    cmeHoursRequired: 40,
    cmeHoursLogged: 40,
    cmeYearStartDate: "2025-01-01",
  },
];
```

---

## Business Rules Reference

These thresholds come directly from Tom Callahan (Revenue Cycle) and Diane Foster (People). Encode them exactly — they will be displayed on the Monday morning operations report.

| Rule                                     | Value                                  | Source          |
| ---------------------------------------- | -------------------------------------- | --------------- |
| Billing denial rate — industry benchmark | 8%                                     | Tom Callahan    |
| No-show rate — internal alert threshold  | 20%                                    | Dr. Marcus Reid |
| CME hours required — Physician           | 40 hours/year                          | Diane Foster    |
| CME hours required — Nurse Practitioner  | 30 hours/year                          | Diane Foster    |
| "At risk" CME — trailing threshold       | 15 percentage points behind cycle pace | Diane Foster    |
| Licence alert — first warning            | 90 days before expiry                  | Diane Foster    |
| Licence alert — urgent warning           | 30 days before expiry                  | Diane Foster    |

---

## Acceptance Criteria

Your implementation will be evaluated on:

1. **Type safety:** All interfaces defined with correct field names and types — no `any`
2. **Function correctness:** Each function produces the expected output for the given inputs
3. **Edge case handling:** Functions handle empty arrays, division by zero, and missing optional fields gracefully
4. **Validation logic:** Business rules from the table above are enforced accurately
5. **Code organisation:** Functions are in the correct files according to responsibility
6. **No mutations:** Sorting and filtering functions do not modify the original arrays
7. **Pure functions:** Functions only work with what they receive as parameters — no global state

---

## Questions?

If you're unsure about any requirement, ask your mentor. In a real work environment, you'd message James on Slack or drop a comment on the Jira ticket.

---

_This is a real HealthCore Digital project. What you build here will be refactored into the live operations dashboard._