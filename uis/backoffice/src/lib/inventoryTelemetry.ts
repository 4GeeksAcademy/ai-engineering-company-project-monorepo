// Builds the properties of the inventory events, key by key from the allowlists in
// docs/telemetry/event-schemas.json (never by spreading an order or an asset: a new field on the
// model must not reach telemetry by accident), and sends them through track().
//
// Gaps in today's data model (telemetry-plan.md, section 0.1) mean some required keys cannot be
// filled yet and are left out, not invented: `programme_id` (no programme on Asset), `unit_cost`
// and `total_cost` (orders carry no cost). They arrive with those backend changes.

import {
  MIN_STOCK,
  type Asset,
  type AssetCategory,
  type AssetEntry,
  type AssetExit,
  type Office,
} from "@/lib/inventory";
import { track } from "@/lib/telemetry";

export function telemetryOffice(office: Office): "valencia" | "miami" {
  return office === "Miami" ? "miami" : "valencia";
}

/** The BRIEFING's currency by office: EUR for Valencia, USD for Miami, no conversion. */
export function telemetryCurrency(office: Office): "EUR" | "USD" {
  return office === "Miami" ? "USD" : "EUR";
}

/** Plan mapping to the BRIEFING's categories. `office_supplies` has no equivalent yet, so it is left out. */
export function telemetryCategory(category: AssetCategory): "training_kit" | "onboarding_equipment" | undefined {
  if (category === "training_materials") return "training_kit";
  if (category === "hardware" || category === "peripherals") return "onboarding_equipment";
  return undefined;
}

/** Trim, lowercase, at most 80 characters; nothing at all if it looks like an email or a phone number. */
export function normalizeSupplier(supplier: string): string | undefined {
  const value = supplier.trim().toLowerCase().slice(0, 80);
  if (!value || /@/.test(value) || /^[+\d][\d\s().-]{6,}$/.test(value)) return undefined;
  return value;
}

function assetProperties(asset: Asset) {
  return {
    product_id: asset.id,
    product_category: telemetryCategory(asset.category),
    office: telemetryOffice(asset.office),
    currency: telemetryCurrency(asset.office),
    product_sku: asset.sku,
  };
}

/**
 * An outbound order was saved (201). `stockBefore` is the stock the user was shown, if it had loaded.
 * Also emits `stock_threshold_triggered` when this order made the stock cross the minimum.
 */
export function trackOutboundOrder(order: AssetExit, asset: Asset, stockBefore: number | null): void {
  const stockAfter = stockBefore === null ? undefined : stockBefore - order.quantity;
  track("outbound_order_created", {
    order_id: order.id,
    ...assetProperties(asset),
    quantity: order.quantity,
    exit_type: order.exit_type,
    stock_after: stockAfter,
    has_assignee: Boolean(order.assigned_to),
  });

  if (stockBefore === null || stockAfter === undefined) return;
  const crossed = stockBefore >= MIN_STOCK && stockAfter < MIN_STOCK;
  const reachedZero = stockBefore > 0 && stockBefore < MIN_STOCK && stockAfter <= 0;
  if (!crossed && !reachedZero) return;
  track("stock_threshold_triggered", {
    triggering_order_id: order.id,
    ...assetProperties(asset),
    quantity: order.quantity,
    level: stockAfter <= 0 ? "out" : "low",
    stock_before: stockBefore,
    stock_after: stockAfter,
    min_stock: MIN_STOCK,
  });
}

/** An inbound order was saved (201). */
export function trackInboundOrder(order: AssetEntry, asset: Asset): void {
  track("inbound_order_created", {
    order_id: order.id,
    ...assetProperties(asset),
    quantity: order.quantity,
    supplier_normalized: normalizeSupplier(order.supplier),
  });
}

const STOCK_KEYS = ["current_stock", "stock", "quantity"] as const;

/**
 * The API refused an attempt to set stock directly: a 422 `extra_forbidden` carrying a stock field
 * on POST /inventory/products, or a 405 on PUT/PATCH/DELETE /inventory/products/{id}. No screen
 * sends either today; this is where one would be seen. `office`/`currency` are left out: nothing
 * in the failed request tells the client which office it was for.
 */
export function trackDirectStockEditRejected(
  method: string,
  path: string,
  status: number,
  fieldErrors: Record<string, string>,
): void {
  const upper = method.toUpperCase();
  const idRoute = /^\/products\/(\d+)$/.exec(path);
  if (status === 405 && idRoute && ["PUT", "PATCH", "DELETE"].includes(upper)) {
    track("direct_stock_edit_rejected", {
      product_id: Number(idRoute[1]),
      product_category: null,
      programme_id: null,
      quantity: null,
      attempt_kind: "method_not_allowed_on_product",
      http_method: upper,
      route_template: "/inventory/products/{asset_id}",
      http_status: 405,
      suppressed_count: 0,
    });
    return;
  }
  const offending = STOCK_KEYS.find((key) => fieldErrors[key] === "Campo no permitido");
  if (status === 422 && upper === "POST" && path === "/products" && offending) {
    track("direct_stock_edit_rejected", {
      product_id: null,
      product_category: null,
      programme_id: null,
      quantity: null,
      attempt_kind: "extra_field_on_create",
      http_method: "POST",
      route_template: "/inventory/products",
      http_status: 422,
      offending_field: offending,
      suppressed_count: 0,
    });
  }
}
