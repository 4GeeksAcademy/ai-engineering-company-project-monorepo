export type Id = string;

export type Department =
  | "sales"
  | "recruiting"
  | "training"
  | "support"
  | "hr"
  | "marketing";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface BaseEntity {
  id: Id;
  createdAt: string;
  updatedAt: string;
}

export interface AdministratorUser extends BaseEntity {
  fullName: string;
  email: string;
  role: "ceo" | "director" | "manager";
  darkModeEnabled: boolean;
  activeSkills: string[];
}

export interface KpiSnapshot extends BaseEntity {
  department: Department;
  snapshotDate: string;
  revenueUSD: number;
  openRoles: number;
  avgTimeToHireDays: number;
  slaCompliancePct: number;
  leadsGenerated: number;
}

export interface ExecutiveAlert extends BaseEntity {
  department: Department;
  severity: AlertSeverity;
  message: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface WeeklyExecutiveReport extends BaseEntity {
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  totalRevenueUSD: number;
  departmentSnapshots: KpiSnapshot[];
  highPriorityAlerts: ExecutiveAlert[];
}

export const adminUserExample: AdministratorUser = {
  id: "admin-001",
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-08-10T10:00:00Z",
  fullName: "Laura Mendoza",
  email: "laura.mendoza@nexova.com",
  role: "ceo",
  darkModeEnabled: true,
  activeSkills: ["executive-summary", "kpi-anomaly-detection", "weekly-briefing"],
};

export const kpiSnapshotExample: KpiSnapshot = {
  id: "kpi-2026-08-10-sales",
  createdAt: "2026-08-10T23:59:59Z",
  updatedAt: "2026-08-10T23:59:59Z",
  department: "sales",
  snapshotDate: "2026-08-10",
  revenueUSD: 24500,
  openRoles: 5,
  avgTimeToHireDays: 19,
  slaCompliancePct: 97.5,
  leadsGenerated: 42,
};

export const executiveAlertExample: ExecutiveAlert = {
  id: "alert-2026-08-11-support-sla",
  createdAt: "2026-08-11T08:00:00Z",
  updatedAt: "2026-08-11T08:00:00Z",
  department: "support",
  severity: "high",
  message: "SLA de soporte bajo el umbral minimo de 95%.",
  detectedAt: "2026-08-11T07:45:00Z",
};

export const weeklyExecutiveReportExample: WeeklyExecutiveReport = {
  id: "report-2026-08-04-2026-08-10",
  createdAt: "2026-08-11T09:00:00Z",
  updatedAt: "2026-08-11T09:00:00Z",
  periodStart: "2026-08-04",
  periodEnd: "2026-08-10",
  generatedAt: "2026-08-11T09:00:00Z",
  totalRevenueUSD: 124200,
  departmentSnapshots: [kpiSnapshotExample],
  highPriorityAlerts: [executiveAlertExample],
};

export function isResolvedAlert(alert: ExecutiveAlert): boolean {
  return alert.resolvedAt !== undefined;
}

export function isDateRangeCoherent(startDate: string, endDate: string): boolean {
  return new Date(startDate).getTime() <= new Date(endDate).getTime();
}

export function buildWeeklyReportId(periodStart: string, periodEnd: string): Id {
  return `report-${periodStart}-${periodEnd}`;
}

export function calculateKpiEfficiencyScore(snapshot: KpiSnapshot): number {
  const hireComponent = Math.max(0, 100 - snapshot.avgTimeToHireDays * 2);
  const slaComponent = snapshot.slaCompliancePct;
  const leadComponent = Math.min(100, snapshot.leadsGenerated * 2);

  return Number(((hireComponent + slaComponent + leadComponent) / 3).toFixed(2));
}