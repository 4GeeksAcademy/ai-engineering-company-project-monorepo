export type Id = string;

export const INCIDENT_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "discarded",
] as const;

export const INCIDENT_ORIGINS = ["customer", "branch", "internal"] as const;

export const INCIDENT_CATEGORIES = [
  "service",
  "product_quality",
  "payment",
  "technology",
  "inventory",
  "operations",
  "other",
] as const;

export const BRANCHES = [
  "central",
  "medellin_poblado",
  "medellin_laureles",
  "medellin_envigado",
  "medellin_sabaneta",
  "medellin_belen",
  "medellin_las_americas",
  "medellin_mayorca",
  "florida_miami",
  "florida_orlando",
  "florida_tampa",
  "florida_fort_lauderdale",
  "florida_boca_raton",
  "florida_weston",
  "florida_doral",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export type IncidentOrigin = (typeof INCIDENT_ORIGINS)[number];
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];
export type Branch = (typeof BRANCHES)[number];

export interface Incident {
  id: Id;
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: Branch;
  created_at: string;
  updated_at: string;
}
