export const COUNTRIES = ["Colombia", "USA"] as const;
export const CATEGORIES = [
  "carne",
  "verduras_y_hortalizas",
  "salsas_y_condimentos",
  "bebidas",
  "packaging",
  "productos_limpieza",
  "lacteos",
  "carbon_y_combustible",
] as const;
export const STATUSES = ["active", "suspended"] as const;

export type Country = (typeof COUNTRIES)[number];
export type Category = (typeof CATEGORIES)[number];
export type SupplierStatus = (typeof STATUSES)[number];
export type Currency = "COP" | "USD";

export const CURRENCY_BY_COUNTRY: Record<Country, Currency> = {
  Colombia: "COP",
  USA: "USD",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  carne: "Carne",
  verduras_y_hortalizas: "Verduras y hortalizas",
  salsas_y_condimentos: "Salsas y condimentos",
  bebidas: "Bebidas",
  packaging: "Packaging",
  productos_limpieza: "Productos de limpieza",
  lacteos: "Lácteos",
  carbon_y_combustible: "Carbón y combustible",
};

export const STATUS_LABELS: Record<SupplierStatus, string> = {
  active: "Activo",
  suspended: "Suspendido",
};

export interface SupplierInput {
  name: string;
  country: Country;
  categories: Category[];
  rate_per_unit: number;
  currency: Currency;
  status: SupplierStatus;
  contact_email?: string | null;
  notes?: string | null;
}

export interface Supplier extends SupplierInput {
  id: number;
  updated_at: string;
}
