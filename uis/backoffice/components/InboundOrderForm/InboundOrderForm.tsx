"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getForbiddenField } from "@/lib/api-error";
import { createInboundOrder, fetchProducts } from "@/lib/inventory-api";
import { PRICE_VARIANCE_THRESHOLD_PCT, validateQuantity, validateUnitCost } from "@/lib/inventory-form";
import type { Product } from "@/lib/inventory-types";
import { sanitizeErrorMessage, toCountryCode, toCurrency, toLocationId, track } from "@/lib/telemetry";
import FormField from "../FormField";
import { useToast } from "../ToastProvider";

export default function InboundOrderForm() {
  const router = useRouter();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [supplierId, setSupplierId] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const [quantityError, setQuantityError] = useState<string | undefined>();
  const [productError, setProductError] = useState<string | undefined>();
  const [unitCostError, setUnitCostError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchProducts()
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch((err) => {
        if (active) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "We couldn't load the product list. Please try again.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedProduct = products.find((p) => String(p.id) === productId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const qtyError = validateQuantity(quantity);
    const prodError = selectedProduct ? undefined : "Select a product";
    const costError = validateUnitCost(unitCost);
    setQuantityError(qtyError);
    setProductError(prodError);
    setUnitCostError(costError);
    if (qtyError || prodError || costError || !selectedProduct) return;

    setSubmitting(true);
    const normalizedQuantity = Number(quantity);
    const normalizedUnit = unit.trim() || "kg";
    const normalizedUnitCost = Number(unitCost);
    try {
      const order = await createInboundOrder({
        ingredient_id: selectedProduct.id,
        quantity: normalizedQuantity,
        unit: normalizedUnit,
        supplier_id: supplierId.trim() ? Number(supplierId) : null,
        unit_cost: normalizedUnitCost,
        country: selectedProduct.country,
        city: selectedProduct.city,
      });
      toast.success(`Delivery registered for ${selectedProduct.name}.`);
      // inbound_order_created (docs/event-schemas.json) — obligatorio.
      // unit_cost now required by the schema (docs/company-briefing.md
      // section 3, Costo de compra por local) — sourced from `order.unit_cost`,
      // the value the backend just persisted, not re-derived client-side.
      track("inbound_order_created", {
        location_id: toLocationId(selectedProduct.country, selectedProduct.city),
        country: toCountryCode(selectedProduct.country),
        product_id: String(selectedProduct.id),
        product_category: selectedProduct.category,
        quantity: normalizedQuantity,
        unit: normalizedUnit,
        currency: toCurrency(selectedProduct.country),
        order_id: String(order.id),
        supplier_id: order.supplier_id != null ? String(order.supplier_id) : null,
        unit_cost: order.unit_cost,
      });
      if (order.price_variance_detected && order.unit_cost_historical != null && order.variance_pct != null) {
        // ingredient_price_variance_detected (docs/event-schemas.json) —
        // obligatorio. Computed server-side (services/api/app/routers/inventory.py,
        // average of the last 5 same-product+supplier deliveries) — the
        // frontend only decides whether to emit the event, never recomputes it.
        track("ingredient_price_variance_detected", {
          location_id: toLocationId(selectedProduct.country, selectedProduct.city),
          country: toCountryCode(selectedProduct.country),
          product_id: String(selectedProduct.id),
          product_category: selectedProduct.category,
          quantity: normalizedQuantity,
          unit: normalizedUnit,
          currency: toCurrency(selectedProduct.country),
          order_id: String(order.id),
          supplier_id: order.supplier_id != null ? String(order.supplier_id) : null,
          unit_cost_actual: normalizedUnitCost,
          unit_cost_historical: order.unit_cost_historical,
          variance_pct: order.variance_pct,
          variance_threshold_pct: PRICE_VARIANCE_THRESHOLD_PCT,
        });
      }
      router.push("/inventory");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "We couldn't register this delivery. Please try again.",
      );

      const forbiddenField = getForbiddenField(err);
      if (forbiddenField) {
        // direct_stock_edit_rejected (docs/event-schemas.json) — obligatorio.
        // Never reachable through this form's own payload (it never sends
        // `current_stock`/any extra field); this only fires for a request
        // someone constructed outside the UI (e.g. devtools) that the
        // backend's extra="forbid" schema rejected — exactly the
        // "bypassing the trazabilidad control" signal the event exists for.
        track("direct_stock_edit_rejected", {
          location_id: toLocationId(selectedProduct.country, selectedProduct.city),
          country: toCountryCode(selectedProduct.country),
          product_id: String(selectedProduct.id),
          product_category: selectedProduct.category,
          quantity: null,
          unit: null,
          currency: null,
          endpoint: "/inventory/orders/inbound",
          rejected_field: forbiddenField,
          http_status: 422,
        });
      } else if (err instanceof ApiError && (err.status === 404 || err.status === 422)) {
        // inbound_order_rejected (docs/event-schemas.json). Status alone
        // disambiguates the reason: inventory.py only returns 404 for
        // "product not found" and 422 for the location-mismatch check on
        // this endpoint — no need to parse the message text.
        track("inbound_order_rejected", {
          product_id: String(selectedProduct.id),
          location_id: toLocationId(selectedProduct.country, selectedProduct.city),
          attempted_country: toCountryCode(selectedProduct.country),
          attempted_city: selectedProduct.city ?? "",
          rejection_reason: err.status === 404 ? "product_not_found" : "location_mismatch",
          http_status: err.status,
        });
      } else {
        // Anything else (network error, 500, ...) — generic fallback, not
        // double-counted against the specific events above.
        track("form_submission_failed", {
          form_name: "inbound_order",
          http_status: err instanceof ApiError ? err.status : null,
          error_message: sanitizeErrorMessage(err instanceof Error ? err.message : String(err)),
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {loadError}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
        Register delivery
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-700">
            Product<span className="text-rose-500"> *</span>
          </span>
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setProductError(undefined);
            }}
            disabled={loadingProducts}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">
              {loadingProducts ? "Loading products…" : "Select a product"}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.city ?? p.country} ({p.sku}) · {p.current_stock} in stock
              </option>
            ))}
          </select>
          {productError ? (
            <span className="text-xs text-rose-600" role="alert">
              {productError}
            </span>
          ) : null}
        </label>

        <FormField
          label="Quantity"
          required
          type="number"
          min="0"
          step="any"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            setQuantityError(undefined);
          }}
          placeholder="25"
          error={quantityError}
        />

        <FormField
          label="Unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="kg"
        />

        <FormField
          label={`Unit cost (${selectedProduct ? toCurrency(selectedProduct.country) : "COP/USD"})`}
          required
          type="number"
          min="0"
          step="any"
          value={unitCost}
          onChange={(e) => {
            setUnitCost(e.target.value);
            setUnitCostError(undefined);
          }}
          placeholder="e.g. 45000"
          error={unitCostError}
        />

        <FormField
          label="Supplier ID"
          type="number"
          min="1"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          placeholder="Optional"
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting || loadingProducts}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Registering…" : "Register delivery"}
          </button>
        </div>
      </form>
    </div>
  );
}
