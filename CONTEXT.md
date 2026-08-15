# Nexova Context - AgentHub Executive Operations

## Company
Nexova is an HR consulting and talent acquisition company operating in Chile and Argentina.
This repository focuses on an executive operations product named AgentHub.

## Product scope
AgentHub centralizes operational indicators from key departments and provides:
- KPI snapshots per department
- executive alerts based on threshold/range checks
- weekly executive reports for leadership

## Primary administrator user
- Name: Laura Mendoza
- Role: CEO
- Main objective: monitor business health and react early to risks

## Core departments
- sales
- recruiting
- training
- support
- hr
- marketing

## Canonical entities

### AdministratorUser
- `id: string`
- `createdAt: string` (ISO date-time)
- `updatedAt: string` (ISO date-time)
- `fullName: string`
- `email: string`
- `role: "ceo" | "director" | "manager"`
- `darkModeEnabled: boolean`
- `activeSkills: string[]`

### KpiSnapshot
- `id: string`
- `createdAt: string` (ISO date-time)
- `updatedAt: string` (ISO date-time)
- `department: "sales" | "recruiting" | "training" | "support" | "hr" | "marketing"`
- `snapshotDate: string` (ISO date)
- `revenueUSD: number`
- `openRoles: number`
- `avgTimeToHireDays: number`
- `slaCompliancePct: number`
- `leadsGenerated: number`

### ExecutiveAlert
- `id: string`
- `createdAt: string` (ISO date-time)
- `updatedAt: string` (ISO date-time)
- `department: Department`
- `severity: "low" | "medium" | "high" | "critical"`
- `message: string`
- `detectedAt: string` (ISO date-time)
- `resolvedAt?: string` (ISO date-time)

### WeeklyExecutiveReport
- `id: string`
- `createdAt: string` (ISO date-time)
- `updatedAt: string` (ISO date-time)
- `periodStart: string` (ISO date)
- `periodEnd: string` (ISO date)
- `generatedAt: string` (ISO date-time)
- `totalRevenueUSD: number`
- `departmentSnapshots: KpiSnapshot[]`
- `highPriorityAlerts: ExecutiveAlert[]`

## Business validation constraints
- Required fields must be present before processing or storage.
- Numeric ranges:
	- `revenueUSD`: 0 to 10,000,000 (single snapshot)
	- `openRoles`: 0 to 10,000
	- `avgTimeToHireDays`: 0 to 365
	- `slaCompliancePct`: 0 to 100
	- `leadsGenerated`: 0 to 1,000,000
	- `totalRevenueUSD`: 0 to 100,000,000 (weekly report)
- Date coherence:
	- `periodStart <= periodEnd <= generatedAt`
	- `detectedAt <= resolvedAt` when an alert is resolved

## Collection operations required across modules
- Filtering collections by predicates.
- Sorting collections asc/desc.
- Grouping by category/department.
- Linear search for unsorted arrays.
- Binary search for sorted arrays.
- Empty-array and not-found handling as first-class behavior.

## Reporting and aggregation requirements
- Count by category/department.
- Sum numeric values.
- Compute minimum and maximum values.
- Compute averages.
- Build typed executive overview outputs.

## Technical constraints for this milestone
- Modular TypeScript code.
- Explicit typing in interfaces and function signatures.
- Small single-responsibility functions with descriptive names.
