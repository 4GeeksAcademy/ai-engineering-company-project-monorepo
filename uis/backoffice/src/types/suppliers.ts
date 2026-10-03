export type Country = "Spain" | "USA";
export type Currency = "EUR" | "USD";
export type SupplierStatus = "active" | "suspended";

export const CATEGORIES = [
  "job_boards",
  "ats_software",
  "assessment_tools",
  "training_platforms",
  "payroll_and_hr_software",
  "video_interview",
  "background_check",
  "office_and_facilities",
  "it_and_software_licenses",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  job_boards: "Portales de empleo",
  ats_software: "ATS",
  assessment_tools: "Evaluación",
  training_platforms: "Formación",
  payroll_and_hr_software: "Nóminas y RR. HH.",
  video_interview: "Videoentrevista",
  background_check: "Verificación de antecedentes",
  office_and_facilities: "Oficinas",
  it_and_software_licenses: "Licencias de software",
};

export const COUNTRY_CURRENCY: Record<Country, Currency> = { Spain: "EUR", USA: "USD" };

export interface Supplier {
  id: number;
  name: string;
  country: Country;
  categories: Category[];
  monthly_rate: number;
  currency: Currency;
  status: SupplierStatus;
  contract_renewal_date: string | null;
  contact_email: string | null;
  notes: string | null;
  updated_at: string;
}

export interface SupplierCreate {
  name: string;
  country: Country;
  categories: Category[];
  monthly_rate: number;
  currency: Currency;
  status: SupplierStatus;
  contract_renewal_date?: string | null;
  contact_email?: string | null;
  notes?: string | null;
}
