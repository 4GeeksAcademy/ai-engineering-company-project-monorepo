// Mirrors the inventory API (services/api/inventory/schemas.py and models.py) — keep in sync manually.
// Entity and field names follow the Hito 5 CONTEXT: Asset, AssetEntry (inbound) and AssetExit (outbound).

export const OFFICES = ["Valencia", "Miami"] as const;
export type Office = (typeof OFFICES)[number];

export const ASSET_CATEGORIES = ["hardware", "peripherals", "office_supplies", "training_materials"] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  hardware: "Hardware",
  peripherals: "Periféricos",
  office_supplies: "Material de oficina",
  training_materials: "Material de formación",
};

export const EXIT_TYPES = ["allocation", "consumption"] as const;
export type ExitType = (typeof EXIT_TYPES)[number];

export const EXIT_TYPE_LABELS: Record<ExitType, string> = {
  allocation: "Asignación a un empleado",
  consumption: "Consumo",
};

/** GET /inventory/products. `current_stock` is computed by the API (entries minus exits), never sent. */
export interface Asset {
  id: number;
  name: string;
  sku: string;
  category: AssetCategory;
  office: Office;
  current_stock: number;
}

/** POST /inventory/products. `current_stock` is never sent: it is computed from the orders. */
export type AssetCreate = Omit<Asset, "id" | "current_stock">;

/** The asset as embedded in an order (no stock). */
export type AssetBrief = Omit<Asset, "current_stock">;

export type OrderType = "inbound" | "outbound";

/** GET /inventory/orders: one entry (inbound) or exit (outbound). `supplier` is set only on inbound, `exit_type` and `assigned_to` only on outbound. */
export interface InventoryOrder {
  type: OrderType;
  id: number;
  asset: AssetBrief;
  quantity: number;
  office: Office;
  created_at: string;
  user_uuid: string;
  supplier: string | null;
  exit_type: ExitType | null;
  assigned_to: string | null;
}

/** POST /inventory/orders/inbound. The author and the timestamp are set by the server. */
export interface InboundOrderCreate {
  asset_id: number;
  quantity: number;
  supplier: string;
  office: Office;
}

/** POST /inventory/orders/outbound. `assigned_to` is required for an allocation and must be null for a consumption. */
export interface OutboundOrderCreate {
  asset_id: number;
  quantity: number;
  exit_type: ExitType;
  assigned_to: string | null;
  office: Office;
}

/** GET /users/directory: who is who, for turning an order's `user_uuid` into a name. */
export interface DirectoryEntry {
  user_id: string;
  name: string;
}
