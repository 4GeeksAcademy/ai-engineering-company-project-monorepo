import type {
  Supplier,
  SupplierCreate,
  ApiResponse,
} from "./suppliers-types";
import { authenticatedFetch } from "./authenticated-fetch";

// ── Metadata constants (mirrors candidate-meta.ts pattern) ─────

export const PRODUCT_CATEGORIES = [
  "Meat",
  "Produce",
  "Beverages",
  "Dairy",
  "Seafood",
  "Spices",
  "Other",
] as const;

export const CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));

export const SUPPLIER_STATUSES = ["active", "suspended"] as const;

export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  suspended: "Suspended",
};

export const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-rose-100 text-rose-700",
};

export const CATEGORY_STYLES: Record<string, string> = {
  Meat: "bg-red-100 text-red-700",
  Produce: "bg-green-100 text-green-700",
  Beverages: "bg-sky-100 text-sky-700",
  Dairy: "bg-amber-100 text-amber-700",
  Seafood: "bg-cyan-100 text-cyan-700",
  Spices: "bg-orange-100 text-orange-700",
  Other: "bg-zinc-100 text-zinc-600",
};

// ── API helpers ─────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

export async function fetchSuppliers(params?: {
  product_category?: string;
  status?: string;
}): Promise<Supplier[]> {
  const query = new URLSearchParams();
  if (params?.product_category) query.set("product_category", params.product_category);
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const url = `${API_URL}/suppliers${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch suppliers (${res.status})`);

  const json: ApiResponse<Supplier[]> = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to fetch suppliers");
  return json.data;
}

export async function fetchSupplier(id: number): Promise<Supplier> {
  const res = await fetch(`${API_URL}/suppliers/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supplier not found (${res.status})`);

  const json: ApiResponse<Supplier> = await res.json();
  if (!json.success) throw new Error(json.message || "Supplier not found");
  return json.data;
}

export async function createSupplier(
  payload: SupplierCreate,
): Promise<Supplier> {
  const res = await authenticatedFetch("/api/proxy/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Failed to create supplier (${res.status})`);
  }

  const json: ApiResponse<Supplier> = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to create supplier");
  return json.data;
}

export async function updateSupplierRate(
  id: number,
  rate: number,
): Promise<Supplier> {
  const res = await authenticatedFetch(`/api/proxy/suppliers/${id}/rate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rate }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Failed to update rate (${res.status})`);
  }

  const json: ApiResponse<Supplier> = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to update rate");
  return json.data;
}

export async function updateSupplierStatus(
  id: number,
  status: "active" | "suspended",
): Promise<Supplier> {
  const res = await authenticatedFetch(`/api/proxy/suppliers/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Failed to update status (${res.status})`);
  }

  const json: ApiResponse<Supplier> = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to update status");
  return json.data;
}

export async function deleteSupplier(id: number): Promise<void> {
  const res = await authenticatedFetch(`/api/proxy/suppliers/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete supplier (${res.status})`);
}
