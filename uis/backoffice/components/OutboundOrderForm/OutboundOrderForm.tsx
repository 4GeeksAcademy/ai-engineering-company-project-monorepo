"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getForbiddenField } from "@/lib/api-error";
import { createOutboundOrder, EXIT_REASON_OPTIONS, fetchProducts } from "@/lib/inventory-api";
import { validateQuantity, validateUnitCost } from "@/lib/inventory-form";
import type { ExitReason, Product } from "@/lib/inventory-types";
import { sanitizeErrorMessage, toCountryCode, toCurrency, toLocationId, track } from "@/lib/telemetry";
import FormField from "../FormField";
import Select from "../Select";
import { useToast } from "../ToastProvider";

/** `ExitReason` (services/api/app/models/schemas.py, lib/inventory-types.ts)
 * now has exactly the 6 values the two approved events need between them —
 * the generic "waste" bucket was replaced by its 3 specific causes (see the
 * commit that closed the Phase 3 gap report for stock_waste_registered).
 * `kitchen_use`/`transfer`/`other` -> outbound_order_created; the 3 merma
 * causes -> stock_waste_registered. The two events are mutually exclusive
 * over the same StockExit row (docs/event-envelope.md section 6: a waste
 * exit is never also counted as ordinary consumption). */
const WASTE_REASONS = new Set<ExitReason>(["expired", "kitchen_error", "theft_suspected"]);

function isWasteReason(reason: ExitReason): reason is "expired" | "kitchen_error" | "theft_suspected" {
  return WASTE_REASONS.has(reason);
}

export default function OutboundOrderForm() {
  const router = useRouter();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [reason, setReason] = useState<ExitReason>("kitchen_use");
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
    const insufficientStock =
      !qtyError && selectedProduct && Number(quantity) > selectedProduct.current_stock
        ? `Only ${selectedProduct.current_stock} ${unit || "units"} available at ${selectedProduct.city ?? selectedProduct.country}.`
        : undefined;
    // unit_cost is required for the 3 waste reasons (docs/company-briefing.md
    // section 3's merma-cost decision: captured here, at registration time)
    // and must stay empty for ordinary consumption — see
    // services/api/app/models/schemas.py::StockExitCreate's matching validator.
    const costError = isWasteReason(reason) ? validateUnitCost(unitCost) : undefined;

    setQuantityError(qtyError ?? insufficientStock);
    setProductError(prodError);
    setUnitCostError(costError);
    if (qtyError || insufficientStock || prodError || costError || !selectedProduct) return;

    setSubmitting(true);
    const normalizedQuantity = Number(quantity);
    const normalizedUnit = unit.trim() || "kg";
    const normalizedUnitCost = isWasteReason(reason) ? Number(unitCost) : null;
    try {
      const order = await createOutboundOrder({
        ingredient_id: selectedProduct.id,
        quantity: normalizedQuantity,
        unit: normalizedUnit,
        reason,
        unit_cost: normalizedUnitCost,
        country: selectedProduct.country,
        city: selectedProduct.city,
      });
      toast.success(`Withdrawal logged for ${selectedProduct.name}.`);

      const commonProperties = {
        location_id: toLocationId(selectedProduct.country, selectedProduct.city),
        country: toCountryCode(selectedProduct.country),
        product_id: String(selectedProduct.id),
        product_category: selectedProduct.category,
        quantity: normalizedQuantity,
        unit: normalizedUnit,
        currency: toCurrency(selectedProduct.country),
        order_id: String(order.id),
      };
      if (isWasteReason(reason)) {
        // stock_waste_registered (docs/event-schemas.json) — obligatorio.
        // unit_cost now required by the schema (company-briefing.md section
        // 3) — sourced from `order.unit_cost`, the value the backend just
        // persisted, not re-derived client-side.
        track("stock_waste_registered", { ...commonProperties, reason, unit_cost: order.unit_cost as number });
      } else {
        // outbound_order_created (docs/event-schemas.json) — obligatorio.
        track("outbound_order_created", { ...commonProperties, reason });
      }

      if (order.threshold_crossed) {
        // stock_threshold_triggered (docs/event-schemas.json) — obligatorio.
        // threshold_crossed is computed server-side (services/api/app/routers/inventory.py):
        // true only on the transition from >= minimum_stock to < minimum_stock,
        // never re-fired on repeated withdrawals while already below it.
        track("stock_threshold_triggered", {
          location_id: commonProperties.location_id,
          country: commonProperties.country,
          product_id: commonProperties.product_id,
          product_category: commonProperties.product_category,
          quantity: order.current_stock_after,
          unit: normalizedUnit,
          currency: null,
          minimum_stock: order.minimum_stock,
        });
      }

      router.push("/inventory");
      router.refresh();
    } catch (err) {
      // Covers the 400 "would go negative" response from the API (and any
      // other failure) with a readable message — never a raw JSON body.
      toast.error(
        err instanceof Error
          ? err.message
          : "We couldn't log this withdrawal. Please try again.",
      );

      const forbiddenField = getForbiddenField(err);
      if (forbiddenField) {
        // direct_stock_edit_rejected — see the identical comment in
        // InboundOrderForm.tsx; same reasoning applies here.
        track("direct_stock_edit_rejected", {
          location_id: toLocationId(selectedProduct.country, selectedProduct.city),
          country: toCountryCode(selectedProduct.country),
          product_id: String(selectedProduct.id),
          product_category: selectedProduct.category,
          quantity: null,
          unit: null,
          currency: null,
          endpoint: "/inventory/orders/outbound",
          rejected_field: forbiddenField,
          http_status: 422,
        });
      } else if (err instanceof ApiError && (err.status === 404 || err.status === 422 || err.status === 400)) {
        // outbound_order_rejected. inventory.py's create_outbound_order
        // returns 404 for "product not found", 422 for location mismatch,
        // and 400 for insufficient stock — status alone disambiguates.
        // available_quantity stays null: the 400 message embeds the real
        // available amount only as free text (buildApiError collapses the
        // backend detail to a string), and the client's own
        // `selectedProduct.current_stock` is a stale, pre-submit snapshot —
        // not the authoritative value the backend just computed. Parsing
        // it out of the message text was deliberately avoided (fragile,
        // and error messages are a flagged place for data to leak) —
        // documented gap, see the Phase 3 completion report.
        track("outbound_order_rejected", {
          product_id: String(selectedProduct.id),
          location_id: toLocationId(selectedProduct.country, selectedProduct.city),
          attempted_country: toCountryCode(selectedProduct.country),
          attempted_city: selectedProduct.city ?? "",
          requested_quantity: normalizedQuantity,
          available_quantity: null,
          unit: normalizedUnit,
          rejection_reason:
            err.status === 404
              ? "product_not_found"
              : err.status === 422
                ? "location_mismatch"
                : "insufficient_stock",
          http_status: err.status,
        });
      } else {
        track("form_submission_failed", {
          form_name: "outbound_order",
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
        Log consumption / exit
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
              setQuantityError(undefined);
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
          placeholder="5"
          error={quantityError}
        />

        <FormField
          label="Unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="kg"
        />

        <div className="sm:col-span-2">
          <Select
            label="Reason"
            value={reason}
            onChange={(val) => {
              setReason(val);
              // unit_cost only applies to waste reasons — clear any stale
              // value/error left over from a previous selection so a
              // non-waste submission never carries one.
              if (!isWasteReason(val)) {
                setUnitCost("");
                setUnitCostError(undefined);
              }
            }}
            options={EXIT_REASON_OPTIONS}
          />
        </div>

        {isWasteReason(reason) ? (
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
            className="sm:col-span-2"
          />
        ) : null}

        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting || loadingProducts}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Logging…" : "Log exit"}
          </button>
        </div>
      </form>
    </div>
  );
}
