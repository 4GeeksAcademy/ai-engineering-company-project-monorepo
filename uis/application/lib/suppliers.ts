export const PRODUCT_CATEGORIES = [
  "proteins",
  "vegetables_and_fruit",
  "beverages_and_packaging",
  "imported_sauces_and_condiments",
] as const;

export const STATUSES = ["preferred", "active", "inactive"] as const;
export const COUNTRIES = ["Colombia", "United States"] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type SupplierStatus = (typeof STATUSES)[number];
export type Country = (typeof COUNTRIES)[number];

export type Supplier = {
  id: number;
  supplier_id: string;
  name: string;
  country: Country | string;
  product_categories: string[];
  emergency_surcharge_pct: number;
  status: SupplierStatus | string;
  updated_at: string;
};

export type SupplierInput = {
  name: string;
  country: string;
  product_categories: string[];
  emergency_surcharge_pct: number;
  status: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

function errorDetail(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (!item || typeof item !== "object") return JSON.stringify(item);
        const loc = Array.isArray((item as { loc?: unknown }).loc)
          ? ((item as { loc: unknown[] }).loc.filter((part) => part !== "body").join("."))
          : "";
        const msg = (item as { msg?: string }).msg || JSON.stringify(item);
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join("; ");
  }
  return fallback;
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(errorDetail(body, `Request failed (${response.status})`));
  }
  return body as T;
}
