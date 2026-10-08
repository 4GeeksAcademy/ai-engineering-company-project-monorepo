import { ExecutiveAlert, KpiSnapshot, WeeklyExecutiveReport } from "./entities";

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export function validateRequiredFields<T extends object>(
  entity: T,
  requiredFields: Array<keyof T>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of requiredFields) {
    const value = entity[field];
    const isMissing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim().length === 0);

    if (isMissing) {
      issues.push({
        field: String(field),
        message: "Campo obligatorio ausente.",
      });
    }
  }

  return issues;
}

export function validateNumberRange(
  field: string,
  value: number,
  min: number,
  max: number
): ValidationIssue[] {
  if (value < min || value > max) {
    return [
      {
        field,
        message: `Valor fuera de rango permitido [${min}, ${max}].`,
      },
    ];
  }

  return [];
}

export function validateDateOrder(
  startField: string,
  startDate: string,
  endField: string,
  endDate: string
): ValidationIssue[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return [
      {
        field: `${startField}, ${endField}`,
        message: "Fecha invalida.",
      },
    ];
  }

  if (start > end) {
    return [
      {
        field: `${startField}, ${endField}`,
        message: "Rango de fechas incoherente: inicio mayor que fin.",
      },
    ];
  }

  return [];
}

export function validateKpiSnapshot(snapshot: KpiSnapshot): ValidationResult {
  const issues: ValidationIssue[] = [];

  issues.push(
    ...validateRequiredFields(snapshot, [
      "id",
      "department",
      "snapshotDate",
      "revenueUSD",
      "openRoles",
      "avgTimeToHireDays",
      "slaCompliancePct",
      "leadsGenerated",
      "createdAt",
      "updatedAt",
    ])
  );

  issues.push(...validateNumberRange("revenueUSD", snapshot.revenueUSD, 0, 10_000_000));
  issues.push(...validateNumberRange("openRoles", snapshot.openRoles, 0, 10_000));
  issues.push(...validateNumberRange("avgTimeToHireDays", snapshot.avgTimeToHireDays, 0, 365));
  issues.push(...validateNumberRange("slaCompliancePct", snapshot.slaCompliancePct, 0, 100));
  issues.push(...validateNumberRange("leadsGenerated", snapshot.leadsGenerated, 0, 1_000_000));

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function validateExecutiveAlert(alert: ExecutiveAlert): ValidationResult {
  const issues: ValidationIssue[] = [];

  issues.push(
    ...validateRequiredFields(alert, [
      "id",
      "department",
      "severity",
      "message",
      "detectedAt",
      "createdAt",
      "updatedAt",
    ])
  );

  if (alert.resolvedAt) {
    issues.push(...validateDateOrder("detectedAt", alert.detectedAt, "resolvedAt", alert.resolvedAt));
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function validateWeeklyExecutiveReport(report: WeeklyExecutiveReport): ValidationResult {
  const issues: ValidationIssue[] = [];

  issues.push(
    ...validateRequiredFields(report, [
      "id",
      "periodStart",
      "periodEnd",
      "generatedAt",
      "totalRevenueUSD",
      "departmentSnapshots",
      "highPriorityAlerts",
      "createdAt",
      "updatedAt",
    ])
  );

  issues.push(...validateDateOrder("periodStart", report.periodStart, "periodEnd", report.periodEnd));
  issues.push(...validateDateOrder("periodEnd", report.periodEnd, "generatedAt", report.generatedAt));
  issues.push(...validateNumberRange("totalRevenueUSD", report.totalRevenueUSD, 0, 100_000_000));

  for (const snapshot of report.departmentSnapshots) {
    issues.push(...validateKpiSnapshot(snapshot).issues);
  }

  for (const alert of report.highPriorityAlerts) {
    issues.push(...validateExecutiveAlert(alert).issues);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function ensureValidBeforeProcessing(result: ValidationResult): void {
  if (!result.isValid) {
    const details = result.issues.map((issue) => `${issue.field}: ${issue.message}`).join(" | ");
    throw new Error(`Validacion de negocio fallida. ${details}`);
  }
}

export function ensureValidBeforeStorage(result: ValidationResult): void {
  ensureValidBeforeProcessing(result);
}