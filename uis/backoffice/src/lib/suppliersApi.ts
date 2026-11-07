import { ApiError, apiJson, type ApiOptions } from "@/lib/apiClient";

export { ApiError } from "@/lib/apiClient";

export const COUNTRIES = ["Spain", "USA"] as const;
export type Country = (typeof COUNTRIES)[number];
export type Currency = "EUR" | "USD";
export const CURRENCY_BY_COUNTRY: Record<Country, Currency> = { Spain: "EUR", USA: "USD" };

export const STATUSES = ["active", "suspended"] as const;
export type SupplierStatus = (typeof STATUSES)[number];

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
  ats_software: "Software ATS",
  assessment_tools: "Herramientas de evaluación",
  training_platforms: "Plataformas de formación",
  payroll_and_hr_software: "Nóminas y software de RR. HH.",
  video_interview: "Videoentrevistas",
  background_check: "Verificación de antecedentes",
  office_and_facilities: "Oficinas e instalaciones",
  it_and_software_licenses: "IT y licencias de software",
};

export const COUNTRY_LABELS: Record<Country, string> = { Spain: "España", USA: "EE. UU." };
export const STATUS_LABELS: Record<SupplierStatus, string> = { active: "Activo", suspended: "Suspendido" };

export type SupplierInput = {
  name: string;
  country: Country;
  categories: Category[];
  monthly_rate: number;
  currency: Currency;
  status: SupplierStatus;
  contract_renewal_date?: string | null;
  contact_email?: string | null;
  notes?: string | null;
};

/** `contact_email` only comes with the detail responses (create, rate and status updates), not with the list. */
export type Supplier = Omit<Required<SupplierInput>, "contact_email"> & {
  contact_email?: string | null;
  id: number;
  updated_at: string;
};

export type SupplierFilters = { country?: Country | ""; category?: Category | "" };

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  country: "País",
  categories: "Categorías",
  monthly_rate: "Tarifa mensual",
  currency: "Moneda",
  status: "Estado",
  contract_renewal_date: "Fecha de renovación",
  contact_email: "Email de contacto",
  notes: "Notas",
};

function request<T>(path: string, options?: ApiOptions): Promise<T> {
  return apiJson<T>(`/suppliers${path}`, { ...options, labels: FIELD_LABELS });
}

export function listSuppliers(filters: SupplierFilters = {}): Promise<Supplier[]> {
  const params = new URLSearchParams();
  if (filters.country) params.set("country", filters.country);
  if (filters.category) params.set("category", filters.category);
  const query = params.toString();
  return request<Supplier[]>(query ? `?${query}` : "", { fallback: "No se pudieron cargar los proveedores" });
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  try {
    return await request<Supplier>("", { method: "POST", json: input, fallback: "No se pudo registrar el proveedor" });
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 409) {
      const message = "Ya existe un proveedor con ese nombre.";
      throw new ApiError(409, [message], { name: message });
    }
    throw reason;
  }
}

export function updateSupplierRate(id: number, monthlyRate: number): Promise<Supplier> {
  return request<Supplier>(`/${id}/rate`, { method: "PATCH", json: { monthly_rate: monthlyRate }, fallback: "No se pudo actualizar la tarifa" });
}

export function updateSupplierStatus(id: number, status: SupplierStatus): Promise<Supplier> {
  return request<Supplier>(`/${id}/status`, { method: "PATCH", json: { status }, fallback: "No se pudo cambiar el estado" });
}

export function deleteSupplier(id: number): Promise<void> {
  return request<void>(`/${id}`, { method: "DELETE", fallback: "No se pudo eliminar el proveedor" });
}

export function formatMoney(amount: number, currency: Currency): string {
  const locale = currency === "EUR" ? "es-ES" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export type RenewalState = "overdue" | "soon" | null;
export const RENEWAL_WINDOW_DAYS = 60;

/** "overdue" if the renewal date already passed, "soon" if it falls within the next 60 days. */
export function renewalState(isoDate: string | null, today = new Date()): RenewalState {
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  const renewal = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((renewal - todayUtc) / 86_400_000);
  if (days < 0) return "overdue";
  return days <= RENEWAL_WINDOW_DAYS ? "soon" : null;
}
