
export const CATEGORIES = {
  equipment_failure: "Fallo de equipamiento",
  supply_issue: "Problema de suministros",
  customer_complaint: "Queja de cliente",
  staff_issue: "Problema de personal",
  facility_issue: "Problema de instalaciones",
  pos_system: "Error de caja o TPV",
  delivery_issue: "Problema de delivery",
  other: "Otros",
} as const;

export const STATUSES = {
  open: "Abierta",
  in_progress: "En progreso",
  resolved: "Resuelta",
  discarded: "Descartada",
} as const;

export const ORIGINS = {
  customer: "Cliente",
  branch: "Sede",
  internal: "Interna",
} as const;

export const BRANCHES = {
  central: "Central (Medellín / Miami)",
  medellin_centro: "Medellín Centro",
  medellin_laureles: "Medellín Laureles",
  medellin_envigado: "Medellín Envigado",
  medellin_bello: "Medellín Bello",
  medellin_itagui: "Medellín Itagüí",
  bogota_chapinero: "Bogotá Chapinero",
  bogota_usaquen: "Bogotá Usaquén",
  cali_granada: "Cali Granada",
  barranquilla_norte: "Barranquilla Norte",
  miami_doral: "Miami Doral",
  miami_hialeah: "Miami Hialeah",
  miami_kendall: "Miami Kendall",
  orlando_international: "Orlando International Drive",
  fort_lauderdale: "Fort Lauderdale",
} as const;

export type IncidentCategory = keyof typeof CATEGORIES;
export type IncidentStatus = keyof typeof STATUSES;
export type IncidentOrigin = keyof typeof ORIGINS;
export type IncidentBranch = keyof typeof BRANCHES;

export interface IncidentInput {
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: IncidentBranch;
}

export interface Incident extends IncidentInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface IncidentSummary {
  total: number;
  by_status: Partial<Record<IncidentStatus, number>>;
  by_category: Partial<Record<IncidentCategory, number>>;
  by_origin: Partial<Record<IncidentOrigin, number>>;
  by_branch: Partial<Record<IncidentBranch, number>>;
}
