"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { createOutboundOrder } from "../lib/inventory";
import { ErrorBanner, Field, inputClass } from "../components/ui/Field";
import AssetSelect from "../components/inventory/AssetSelect";
import SuccessNotice from "../components/inventory/SuccessNotice";
import StockPanel from "../components/inventory/StockPanel";
import { useAssets } from "../components/inventory/useAssets";
import { useAssetStock } from "../components/inventory/useAssetStock";
import { useClearUnknownAsset } from "../components/inventory/useClearUnknownAsset";
import {
  describeInventoryError,
  isBadRequest,
  outboundPayload,
  stockWarning,
  unitsLabel,
  validateOutbound,
  type FormErrors,
  type OutboundForm,
} from "../lib/inventoryRules";
import { EXIT_TYPES, EXIT_TYPE_LABELS, type ExitType } from "../types/inventory";

const EMPTY: OutboundForm = { assetId: "", quantity: "", exitType: "allocation", assignedTo: "" };

/**
 * `/inventory/orders/outbound`: registers a salida de activos (AssetExit), an allocation to an employee or a
 * consumption — POST /inventory/orders/outbound. `current_stock` of the selected asset is shown (and follows the
 * selection) before a quantity is typed; a quantity above it is warned about while typing; the API's 400 (not
 * enough stock) is shown inline next to the quantity field. `initialAssetId` comes from the "Salida" link of a row.
 */
export default function OutboundOrderPage({ initialAssetId = "" }: { initialAssetId?: string }) {
  const { assets, loading, error: loadError, reload } = useAssets();
  const [form, setForm] = useState<OutboundForm>({ ...EMPTY, assetId: initialAssetId });
  const [errors, setErrors] = useState<FormErrors<keyof OutboundForm>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { asset, stock, refreshing, refresh } = useAssetStock(assets, form.assetId);
  const warning = stockWarning(form.quantity, stock);

  useClearUnknownAsset(assets, loading, form.assetId, () => setForm((prev) => ({ ...prev, assetId: "" })));

  const set = <K extends keyof OutboundForm>(field: K, value: OutboundForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError(null);
    setSuccess(null);
    const found = validateOutbound(form);
    if (!found.assetId && !asset) found.assetId = "Selecciona el activo.";
    setErrors(found);
    if (Object.keys(found).length > 0 || !asset) return;

    setSaving(true);
    try {
      // Sent even above the stock shown: the figure may be stale, and the API applies the real rule.
      const order = await createOutboundOrder(outboundPayload(form, asset.office));
      const updated = await refresh();
      void reload();
      setSuccess(
        `Salida registrada: ${unitsLabel(order.quantity)} de «${order.asset.name}» (${order.office}).` +
          (updated ? ` Stock restante: ${updated.current_stock}.` : ""),
      );
      setForm(EMPTY);
    } catch (err) {
      const message = describeInventoryError(err, "No se pudo registrar la salida.");
      // 400 = not enough stock: it is about the quantity, so it goes next to that field.
      if (isBadRequest(err)) setErrors({ quantity: message });
      else setServerError(message);
      void refresh(); // the stock may have changed under us: show the figure that is true now
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold text-white">Salida de activos</h1>
      <p className="mt-2 text-slate-400">
        Registra una asignación a un empleado o un consumo. Resta unidades del stock del activo.
      </p>

      {loadError && (
        <div className="mt-6">
          <ErrorBanner message={loadError} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <AssetSelect
          id="outbound-asset"
          assets={assets}
          loading={loading}
          value={form.assetId}
          onChange={(assetId) => set("assetId", assetId)}
          error={errors.assetId}
        />

        <StockPanel asset={asset} stock={stock} refreshing={refreshing} />

        <Field id="outbound-type" label="Tipo de salida">
          <select
            id="outbound-type"
            value={form.exitType}
            onChange={(e) => {
              set("exitType", e.target.value as ExitType);
              set("assignedTo", ""); // a consumption is assigned to nobody
            }}
            className={inputClass}
          >
            {EXIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EXIT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        {form.exitType === "allocation" && (
          <Field
            id="outbound-assigned"
            label="Asignado a"
            error={errors.assignedTo}
            hint="Nombre o ID del empleado que recibe el activo."
          >
            <input
              id="outbound-assigned"
              value={form.assignedTo}
              maxLength={200}
              onChange={(e) => set("assignedTo", e.target.value)}
              aria-invalid={Boolean(errors.assignedTo)}
              aria-describedby={errors.assignedTo ? "outbound-assigned-error" : undefined}
              className={inputClass}
            />
          </Field>
        )}

        <div>
          <Field
            id="outbound-quantity"
            label="Cantidad"
            error={errors.quantity}
            hint={stock !== null ? `Stock disponible: ${stock}.` : undefined}
          >
            <input
              id="outbound-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              aria-invalid={Boolean(errors.quantity)}
              aria-describedby={[errors.quantity && "outbound-quantity-error", warning && "outbound-quantity-warning"]
                .filter(Boolean)
                .join(" ") || undefined}
              className={inputClass}
            />
          </Field>
          {warning && (
            <p
              id="outbound-quantity-warning"
              role="status"
              data-testid="quantity-warning"
              className="mt-2 flex items-start gap-2 text-sm text-amber-300"
            >
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {warning}
            </p>
          )}
        </div>

        {asset && (
          <p className="text-sm text-slate-400">
            Oficina: <span className="font-medium text-white">{asset.office}</span> (la del activo)
          </p>
        )}

        {serverError && <ErrorBanner message={serverError} />}
        {success && <SuccessNotice message={success} />}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            Registrar salida
          </button>
          <Link href="/inventory/products" className="text-sm text-slate-300 hover:text-white">
            Volver al inventario
          </Link>
        </div>
      </form>
    </div>
  );
}
