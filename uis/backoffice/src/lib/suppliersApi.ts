import { API_URL } from "@/lib/incidentsApi";

// Through the Next.js proxy the API lives under /api/suppliers (see next.config.ts),
// so it never collides with the /suppliers page. Called directly, it is /suppliers.
const SUPPLIERS_URL = API_URL ? `${API_URL}/suppliers` : "/api/suppliers";

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

export type Supplier = Required<SupplierInput> & { id: number; updated_at: string };

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

/** Error raised for non-2xx responses; `messages` holds one readable line per problem. */
export class ApiError extends Error {
  constructor(public status: number, public messages: string[]) {
    super(messages.join(" "));
  }
}

type ValidationIssue = { loc?: (string | number)[]; msg?: string };

function describeIssue(issue: ValidationIssue): string {
  const message = (issue.msg ?? "Valor no válido").replace(/^Value error, /, "");
  const field = (issue.loc ?? []).find((part) => typeof part === "string" && part !== "body");
  return field ? `${FIELD_LABELS[field] ?? field}: ${message}` : message;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${SUPPLIERS_URL}${path}`, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new ApiError(0, ["No se pudo conectar con la API de proveedores. ¿Está arrancada?"]);
  }
  if (response.ok) return (response.status === 204 ? undefined : await response.json()) as T;

  // 502/503/504 come from the Next.js proxy when the FastAPI service is down.
  let messages = [
    response.status >= 502 && response.status <= 504
      ? "No se pudo conectar con la API de proveedores. ¿Está arrancada en el puerto 8000?"
      : `La API respondió con un error (HTTP ${response.status})`,
  ];
  try {
    const { detail } = await response.json();
    if (typeof detail === "string") messages = [detail];
    else if (Array.isArray(detail)) messages = detail.map(describeIssue);
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(response.status, messages);
}

export function listSuppliers(filters: SupplierFilters = {}): Promise<Supplier[]> {
  const params = new URLSearchParams();
  if (filters.country) params.set("country", filters.country);
  if (filters.category) params.set("category", filters.category);
  const query = params.toString();
  return request<Supplier[]>(query ? `?${query}` : "");
}

export function createSupplier(input: SupplierInput): Promise<Supplier> {
  return request<Supplier>("", { method: "POST", body: JSON.stringify(input) });
}

export function updateSupplierRate(id: number, monthlyRate: number): Promise<Supplier> {
  return request<Supplier>(`/${id}/rate`, { method: "PATCH", body: JSON.stringify({ monthly_rate: monthlyRate }) });
}

export function updateSupplierStatus(id: number, status: SupplierStatus): Promise<Supplier> {
  return request<Supplier>(`/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function deleteSupplier(id: number): Promise<void> {
  return request<void>(`/${id}`, { method: "DELETE" });
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
