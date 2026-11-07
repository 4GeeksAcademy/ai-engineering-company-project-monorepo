import { apiJson, type ApiOptions } from "@/lib/apiClient";

export { ApiError } from "@/lib/apiClient";

// Direct URL of the inventory API (needs the backoffice origin in the API's CORS_ORIGINS).
// Unset: calls go through the same-origin /api/inventory proxy (see next.config.ts).
const INVENTORY_API_URL = (process.env.NEXT_PUBLIC_INVENTORY_API_URL ?? "").replace(/\/$/, "");

export const OFFICES = ["Valencia", "Miami"] as const;
export type Office = (typeof OFFICES)[number];

export const CATEGORIES = ["hardware", "peripherals", "office_supplies", "training_materials"] as const;
export type AssetCategory = (typeof CATEGORIES)[number];
export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  hardware: "Hardware",
  peripherals: "Periféricos",
  office_supplies: "Material de oficina",
  training_materials: "Material de formación",
};

export const EXIT_TYPES = ["allocation", "consumption"] as const;
export type ExitType = (typeof EXIT_TYPES)[number];
export const EXIT_TYPE_LABELS: Record<ExitType, string> = { allocation: "Asignación", consumption: "Consumo" };

/** AssetResponse: `current_stock` is computed by the API (entries − exits), never sent. */
export type Asset = {
  id: number;
  name: string;
  sku: string;
  category: AssetCategory;
  office: Office;
  current_stock: number;
};

export type AssetEntry = {
  order_type: "inbound";
  id: number;
  asset_id: number;
  asset_name: string;
  asset_sku: string;
  quantity: number;
  supplier: string;
  office: Office;
  created_at: string;
  user_uuid: string;
};

export type AssetExit = {
  order_type: "outbound";
  id: number;
  asset_id: number;
  asset_name: string;
  asset_sku: string;
  quantity: number;
  exit_type: ExitType;
  assigned_to: string | null;
  office: Office;
  created_at: string;
  user_uuid: string;
};

export type Order = AssetEntry | AssetExit;

export type AssetEntryInput = { asset_id: number; quantity: number; supplier: string; office: Office };
export type AssetExitInput = {
  asset_id: number;
  quantity: number;
  exit_type: ExitType;
  /** Required for "allocation", null for "consumption". */
  assigned_to: string | null;
  office: Office;
};

const FIELD_LABELS: Record<string, string> = {
  asset_id: "Activo",
  quantity: "Cantidad",
  supplier: "Proveedor",
  exit_type: "Tipo de salida",
  assigned_to: "Asignado a",
  office: "Oficina",
};

// 400 (insufficient stock) and 404 carry a readable string `detail` from the API.
const SHOW_DETAIL = [400, 404];

function request<T>(path: string, options: ApiOptions): Promise<T> {
  return apiJson<T>(`/inventory${path}`, {
    ...options,
    baseUrl: INVENTORY_API_URL || undefined,
    labels: FIELD_LABELS,
    exposeDetailFor: SHOW_DETAIL,
  });
}

export function getProducts(): Promise<Asset[]> {
  return request<Asset[]>("/products", { fallback: "No se pudieron cargar los activos" });
}

export function getProduct(id: number): Promise<Asset> {
  return request<Asset>(`/products/${id}`, { fallback: "No se pudo cargar el stock del activo" });
}

export function createInboundOrder(data: AssetEntryInput): Promise<AssetEntry> {
  return request<AssetEntry>("/orders/inbound", { method: "POST", json: data, fallback: "No se pudo registrar la entrada de activos" });
}

export function createOutboundOrder(data: AssetExitInput): Promise<AssetExit> {
  return request<AssetExit>("/orders/outbound", { method: "POST", json: data, fallback: "No se pudo registrar la salida de activos" });
}

export function getOrders(): Promise<Order[]> {
  return request<Order[]>("/orders", { fallback: "No se pudo cargar el historial de órdenes" });
}

export type StockLevel = "out" | "low" | "healthy";

/**
 * Stock at or below this many units is "low". Nexova's briefing defines no threshold, so this is
 * a working value: the smallest seeded stock is 6 (NXV-IT-002), and 5 units or fewer is roughly
 * one allocation round for a team before IT would need to reorder.
 */
export const LOW_STOCK_MAX = 5;

export const STOCK_LEVEL_LABELS: Record<StockLevel, { icon: string; text: string }> = {
  out: { icon: "✖", text: "Agotado" },
  low: { icon: "▲", text: "Stock bajo" },
  healthy: { icon: "✔", text: "Saludable" },
};

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  return stock <= LOW_STOCK_MAX ? "low" : "healthy";
}
