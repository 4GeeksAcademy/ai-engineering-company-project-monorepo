import type { Asset, AssetEntry, AssetExit } from "@/lib/inventory";
import {
  normalizeSupplier,
  telemetryCategory,
  trackDirectStockEditRejected,
  trackInboundOrder,
  trackOutboundOrder,
} from "@/lib/inventoryTelemetry";
import { track } from "@/lib/telemetry";

jest.mock("@/lib/telemetry", () => ({ track: jest.fn() }));
const trackMock = track as jest.Mock;

const asset: Asset = { id: 12, name: "Kit Ventas B2B", sku: "KIT-VB2B-01", category: "training_materials", office: "Valencia", current_stock: 7 };
const exit: AssetExit = {
  order_type: "outbound", id: 981, asset_id: 12, asset_name: asset.name, asset_sku: asset.sku, quantity: 3,
  exit_type: "allocation", assigned_to: "Ana Pérez", office: "Valencia", created_at: "2026-11-24T10:00:00Z", user_uuid: "u1",
};
const entry: AssetEntry = {
  order_type: "inbound", id: 5, asset_id: 12, asset_name: asset.name, asset_sku: asset.sku, quantity: 40,
  supplier: "  Imprenta ACME S.L.  ", office: "Valencia", created_at: "2026-11-24T10:00:00Z", user_uuid: "u1",
};

const events = () => trackMock.mock.calls.map(([type, properties]) => ({ type, properties }));

beforeEach(() => trackMock.mockClear());

describe("trackOutboundOrder", () => {
  it("emits outbound_order_created with allowlisted keys only, and no recipient name", () => {
    trackOutboundOrder(exit, asset, 20);
    expect(events()).toEqual([
      {
        type: "outbound_order_created",
        properties: {
          order_id: 981, product_id: 12, product_category: "training_kit", office: "valencia", currency: "EUR",
          product_sku: "KIT-VB2B-01", quantity: 3, exit_type: "allocation", stock_after: 17, has_assignee: true,
        },
      },
    ]);
    expect(JSON.stringify(events())).not.toContain("Ana");
  });

  it("also emits stock_threshold_triggered when the order crosses the minimum", () => {
    trackOutboundOrder(exit, asset, 7); // 7 -> 4, minimum 6
    expect(events().map((e) => e.type)).toEqual(["outbound_order_created", "stock_threshold_triggered"]);
    expect(events()[1].properties).toMatchObject({
      triggering_order_id: 981, level: "low", stock_before: 7, stock_after: 4, min_stock: 6, quantity: 3, office: "valencia",
    });
  });

  it("emits level out when stock reaches 0 from an already low level, and nothing when it stays low", () => {
    trackOutboundOrder({ ...exit, quantity: 3 }, asset, 3);
    expect(events()[1].properties).toMatchObject({ level: "out", stock_after: 0 });
    trackMock.mockClear();
    trackOutboundOrder({ ...exit, quantity: 1 }, asset, 4); // 4 -> 3: already below, not out
    trackOutboundOrder({ ...exit, quantity: 1 }, asset, 30); // far above
    expect(events().map((e) => e.type)).toEqual(["outbound_order_created", "outbound_order_created"]);
  });

  it("does not guess the stock when it never loaded", () => {
    trackOutboundOrder(exit, asset, null);
    expect(events()).toHaveLength(1);
    expect(events()[0].properties.stock_after).toBeUndefined();
  });

  it("uses USD for Miami and flags a consumption without assignee", () => {
    trackOutboundOrder({ ...exit, exit_type: "consumption", assigned_to: null }, { ...asset, office: "Miami" }, 50);
    expect(events()[0].properties).toMatchObject({ office: "miami", currency: "USD", has_assignee: false });
  });
});

describe("trackInboundOrder", () => {
  it("emits inbound_order_created with a normalized supplier", () => {
    trackInboundOrder(entry, asset);
    expect(events()).toEqual([
      {
        type: "inbound_order_created",
        properties: {
          order_id: 5, product_id: 12, product_category: "training_kit", office: "valencia", currency: "EUR",
          product_sku: "KIT-VB2B-01", quantity: 40, supplier_normalized: "imprenta acme s.l.",
        },
      },
    ]);
  });
});

describe("mappings", () => {
  it("maps categories as the plan proposes and leaves office_supplies out", () => {
    expect(telemetryCategory("hardware")).toBe("onboarding_equipment");
    expect(telemetryCategory("peripherals")).toBe("onboarding_equipment");
    expect(telemetryCategory("training_materials")).toBe("training_kit");
    expect(telemetryCategory("office_supplies")).toBeUndefined();
  });

  it.each([["ana@acme.com"], ["+34 600 123 456"], ["   "]])("drops a supplier shaped like personal data: %p", (value) => {
    expect(normalizeSupplier(value)).toBeUndefined();
  });

  it("caps the supplier at 80 characters", () => {
    expect(normalizeSupplier("x".repeat(200))).toHaveLength(80);
  });
});

describe("trackDirectStockEditRejected", () => {
  it("reports a 422 extra_forbidden stock field on product creation", () => {
    trackDirectStockEditRejected("POST", "/products", 422, { current_stock: "Campo no permitido" });
    expect(events()).toEqual([
      {
        type: "direct_stock_edit_rejected",
        properties: expect.objectContaining({
          attempt_kind: "extra_field_on_create", http_method: "POST", route_template: "/inventory/products",
          http_status: 422, offending_field: "current_stock", product_id: null, suppressed_count: 0,
        }),
      },
    ]);
  });

  it.each(["PUT", "PATCH", "DELETE"])("reports a 405 on %s /products/{id}", (method) => {
    trackDirectStockEditRejected(method, "/products/12", 405, {});
    expect(events()[0].properties).toMatchObject({
      attempt_kind: "method_not_allowed_on_product", product_id: 12, route_template: "/inventory/products/{asset_id}", http_status: 405,
    });
  });

  it("ignores ordinary validation failures", () => {
    trackDirectStockEditRejected("POST", "/products", 422, { sku: "Campo obligatorio" });
    trackDirectStockEditRejected("POST", "/orders/outbound", 422, { quantity: "Campo no permitido" });
    trackDirectStockEditRejected("GET", "/products/12", 405, {});
    expect(events()).toHaveLength(0);
  });
});
