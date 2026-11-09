// ── Inventory types matching the API schemas (services/api/app/models/schemas.py) ──

export type Country = "Colombia" | "United States";
export type City = "Medellín" | "Bogotá" | "Cali" | "Miami" | "Orlando";

export type ProductCategory =
  | "Meat"
  | "Produce"
  | "Beverages"
  | "Dairy"
  | "Seafood"
  | "Spices"
  | "Other";

// "waste" was replaced by its 3 specific causes — matches
// services/api/app/models/schemas.py's ExitReason and the approved
// stock_waste_registered schema (docs/event-schemas.json).
export type ExitReason =
  | "kitchen_use"
  | "transfer"
  | "other"
  | "expired"
  | "kitchen_error"
  | "theft_suspected";

export type OrderType = "inbound" | "outbound";

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: ProductCategory;
  country: Country;
  city: City | null;
  price_cop: number;
  price_usd: number;
  dietary_preferences: string[];
  is_available: boolean;
  /** Threshold below which stock_threshold_triggered fires on an outbound
   * order. Editable via PATCH /inventory/products/{id} (the product edit
   * page) — see lib/inventory-api.ts::updateProductMinimumStock. */
  minimum_stock: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface InboundOrderCreate {
  ingredient_id: number;
  quantity: number;
  unit: string;
  supplier_id?: number | null;
  /** Cost paid per unit, in the order's local currency (COP for Colombia,
   * USD for United States) — required, feeds ingredient_price_variance_detected. */
  unit_cost: number;
  country: Country;
  city: City | null;
}

export interface OutboundOrderCreate {
  ingredient_id: number;
  quantity: number;
  unit: string;
  reason: ExitReason;
  /** Cost paid per unit, in the order's local currency — required when
   * `reason` is a waste cause (expired/kitchen_error/theft_suspected),
   * must be omitted otherwise. Captured at registration time, never
   * derived from a prior inbound delivery (docs/company-briefing.md
   * section 3's merma-cost decision). */
  unit_cost?: number | null;
  country: Country;
  city: City | null;
}

export interface InboundOrderResponse extends InboundOrderCreate {
  id: number;
  user_uuid: string;
  created_at: string;
  /** Average unit_cost of the last 5 prior deliveries for the same
   * product+supplier. Null when there's no supplier_id on this order, or
   * no prior delivery exists yet to compare against. */
  unit_cost_historical: number | null;
  variance_pct: number | null;
  /** True when abs(variance_pct) >= 10 — the approved variance_threshold_pct. */
  price_variance_detected: boolean;
}

export interface OutboundOrderResponse extends OutboundOrderCreate {
  id: number;
  /** Echoes OutboundOrderCreate.unit_cost — null for non-waste exits. */
  unit_cost: number | null;
  user_uuid: string;
  created_at: string;
  minimum_stock: number;
  current_stock_after: number;
  /** True only on the transition: stock was >= minimum_stock before this
   * withdrawal and is < minimum_stock after it. */
  threshold_crossed: boolean;
}

export interface Order {
  id: number;
  order_type: OrderType;
  ingredient_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit: string;
  user_uuid: string;
  country: Country;
  city: City | null;
  created_at: string;
  supplier_id?: number | null;
  reason?: ExitReason | null;
}
