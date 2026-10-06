import { useState, type FormEvent } from "react";
import { ApiError, apiRequest, toUserFacingMessage, type InventoryProduct } from "../lib/api";
import { track } from "../services/telemetry";
import { validationFields } from "../telemetry/events";

type Props = {
  products: InventoryProduct[];
  disabled: boolean;
  onChanged: () => void;
};

const THRESHOLD = 10;

/** Staff corrections against the live inventory API. Values come from the form, not fixtures. */
export function KitchenStockForms({ products, disabled, onChanged }: Props) {
  const [productId, setProductId] = useState("");
  const [delta, setDelta] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"adjust" | "create" | null>(null);

  const selected = products.find((product) => String(product.product_id) === productId);

  async function adjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!selected) {
      setError("Choose an ingredient from the kitchen list.");
      return;
    }
    const parsed = Number(delta);
    if (!Number.isInteger(parsed)) {
      setError("The correction has to be a whole number.");
      return;
    }
    if (parsed === 0) {
      setMessage("A zero correction does not change on-hand stock.");
      return;
    }
    const before = Number(selected.quantity);
    setBusy("adjust");
    try {
      const updated = await apiRequest<InventoryProduct>(
        `/inventory/${selected.product_id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ delta: parsed }),
        },
      );
      const after = Number(updated.quantity);
      track("stock_count_adjusted", {
        location_scope: "chain",
        product_id: selected.product_id,
        product_name: selected.name,
        unit: selected.unit,
        reason: "count_correction",
        delta: parsed,
        quantity_before: before,
        quantity_after: after,
      });
      if (before >= THRESHOLD && after < THRESHOLD) {
        track("stock_threshold_crossed", {
          location_scope: "chain",
          product_id: selected.product_id,
          product_name: selected.name,
          unit: selected.unit,
          quantity_before: before,
          quantity_after: after,
          threshold: THRESHOLD,
        });
      }
      if (before < THRESHOLD && after >= THRESHOLD) {
        track("stock_threshold_cleared", {
          location_scope: "chain",
          product_id: selected.product_id,
          product_name: selected.name,
          unit: selected.unit,
          quantity_before: before,
          quantity_after: after,
          threshold: THRESHOLD,
        });
      }
      setDelta("");
      setMessage("On-hand count updated.");
      onChanged();
    } catch (requestError) {
      setError(toUserFacingMessage(requestError, "The count could not be updated."));
      if (requestError instanceof ApiError && requestError.status === 400) {
        track("direct_stock_edit_rejected", {
          location_scope: "chain",
          reason: "below_zero",
          http_status: 400,
          product_id: selected.product_id,
          product_name: selected.name,
          delta: parsed,
          quantity_before: before,
        });
      } else if (requestError instanceof ApiError && requestError.status === 404) {
        track("direct_stock_edit_rejected", {
          location_scope: "chain",
          reason: "product_not_found",
          http_status: 404,
          product_id: selected.product_id,
          delta: parsed,
        });
      } else if (requestError instanceof ApiError && requestError.status === 422) {
        const fields = validationFields(requestError.details);
        if (fields.length > 0) {
          track("inventory_validation_failed", {
            location_scope: "none",
            method: "PATCH",
            route_template: "/inventory/{product_id}",
            http_status: 422,
            fields,
          });
        }
      }
    } finally {
      setBusy(null);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const trimmedName = name.trim();
    const trimmedUnit = unit.trim();
    const parsedQuantity = Number(quantity);
    if (!trimmedName || !trimmedUnit || !Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      setError("Name, a whole quantity, and a unit are required.");
      return;
    }
    setBusy("create");
    try {
      const created = await apiRequest<InventoryProduct>("/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          quantity: parsedQuantity,
          unit: trimmedUnit,
        }),
      });
      track("product_created", {
        location_scope: "chain",
        product_id: created.product_id,
        product_name: created.name,
        quantity: created.quantity,
        unit: created.unit,
      });
      setName("");
      setQuantity("");
      setUnit("");
      setMessage("Ingredient added to the chain list.");
      onChanged();
    } catch (requestError) {
      setError(toUserFacingMessage(requestError, "The ingredient could not be added."));
      if (requestError instanceof ApiError && requestError.status === 422) {
        const fields = validationFields(requestError.details);
        if (fields.length > 0) {
          track("inventory_validation_failed", {
            location_scope: "none",
            method: "POST",
            route_template: "/inventory",
            http_status: 422,
            fields,
          });
        }
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="accessible__stock">
      <h4>Correct on-hand count</h4>
      <p className="accessible__status">
        Chain stock in the kitchen list. A correction is sent to the inventory API.
      </p>
      <form className="accessible__stock-form" onSubmit={adjust}>
        <label>
          Ingredient
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            disabled={disabled || busy !== null}
          >
            <option value="">Select</option>
            {products.map((product) => (
              <option key={product.product_id} value={product.product_id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Delta
          <input
            inputMode="numeric"
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
            disabled={disabled || busy !== null}
            placeholder="e.g. -1"
          />
        </label>
        <button type="submit" disabled={disabled || busy !== null}>
          {busy === "adjust" ? "Saving…" : "Apply correction"}
        </button>
      </form>

      <h4>Add an ingredient</h4>
      <form className="accessible__stock-form" onSubmit={create}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={disabled || busy !== null}
          />
        </label>
        <label>
          Quantity
          <input
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={disabled || busy !== null}
          />
        </label>
        <label>
          Unit
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            disabled={disabled || busy !== null}
          />
        </label>
        <button type="submit" disabled={disabled || busy !== null}>
          {busy === "create" ? "Saving…" : "Add ingredient"}
        </button>
      </form>
      {error ? (
        <p className="accessible__error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="accessible__status">{message}</p> : null}
    </div>
  );
}
