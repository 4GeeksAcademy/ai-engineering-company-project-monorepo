"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createInboundOrder } from "../lib/inventory";
import { ErrorBanner, Field, inputClass } from "../components/incidents/Field";
import StockPanel from "../components/inventory/StockPanel";
import { useAssets } from "../components/inventory/useAssets";
import { useAssetStock } from "../components/inventory/useAssetStock";
import {
  assetOptionLabel,
  describeInventoryError,
  unitsLabel,
  validateInbound,
  type FormErrors,
  type InboundForm,
} from "../lib/inventoryRules";

const EMPTY: InboundForm = { assetId: "", quantity: "", supplier: "" };

/**
 * `/inventory/orders/inbound`: registers an entrada de activos (AssetEntry) — POST /inventory/orders/inbound.
 * `initialAssetId` comes from the "Entrada" link of a row of the stock page.
 */
export default function InboundOrderPage({ initialAssetId = "" }: { initialAssetId?: string }) {
  const { assets, loading, error: loadError, reload } = useAssets();
  const [form, setForm] = useState<InboundForm>({ ...EMPTY, assetId: initialAssetId });
  const [errors, setErrors] = useState<FormErrors<keyof InboundForm>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { asset, stock, refreshing, refresh } = useAssetStock(assets, form.assetId);

  // A link may name an asset that does not exist (any more): start with nothing selected rather than a blank select.
  useEffect(() => {
    if (!loading && form.assetId && !assets.some((a) => String(a.id) === form.assetId)) {
      setForm((prev) => ({ ...prev, assetId: "" }));
    }
  }, [loading, assets, form.assetId]);

  const set = (field: keyof InboundForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError(null);
    setSuccess(null);
    const found = validateInbound(form);
    if (!found.assetId && !asset) found.assetId = "Selecciona el activo recibido.";
    setErrors(found);
    if (Object.keys(found).length > 0 || !asset) return;

    setSaving(true);
    try {
      const order = await createInboundOrder({
        asset_id: asset.id,
        quantity: Number(form.quantity.trim()),
        supplier: form.supplier.trim(),
        office: asset.office, // an order is always for the office the asset belongs to
      });
      const updated = await refresh();
      void reload();
      setSuccess(
        `Entrada registrada: ${unitsLabel(order.quantity)} de «${order.asset.name}» (${order.office}).` +
          (updated ? ` Stock actual: ${updated.current_stock}.` : ""),
      );
      setForm(EMPTY);
    } catch (err) {
      setServerError(describeInventoryError(err, "No se pudo registrar la entrada."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold text-white">Entrada de activos</h1>
      <p className="mt-2 text-slate-400">
        Registra una compra o entrega recibida por la empresa. Suma unidades al stock del activo.
      </p>

      {loadError && (
        <div className="mt-6">
          <ErrorBanner message={loadError} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <Field id="inbound-asset" label="Activo" error={errors.assetId}>
          <select
            id="inbound-asset"
            value={form.assetId}
            onChange={(e) => set("assetId", e.target.value)}
            disabled={loading}
            aria-invalid={Boolean(errors.assetId)}
            aria-describedby={errors.assetId ? "inbound-asset-error" : undefined}
            className={inputClass}
          >
            <option value="">{loading ? "Cargando activos…" : "Selecciona un activo"}</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {assetOptionLabel(a)}
              </option>
            ))}
          </select>
        </Field>

        <StockPanel asset={asset} stock={stock} refreshing={refreshing} />

        <Field id="inbound-quantity" label="Cantidad" error={errors.quantity} hint="Unidades recibidas.">
          <input
            id="inbound-quantity"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            aria-invalid={Boolean(errors.quantity)}
            aria-describedby={errors.quantity ? "inbound-quantity-error" : undefined}
            className={inputClass}
          />
        </Field>

        <Field id="inbound-supplier" label="Proveedor" error={errors.supplier} hint="Ej.: TechDistrib Valencia S.L.">
          <input
            id="inbound-supplier"
            value={form.supplier}
            maxLength={200}
            onChange={(e) => set("supplier", e.target.value)}
            aria-invalid={Boolean(errors.supplier)}
            aria-describedby={errors.supplier ? "inbound-supplier-error" : undefined}
            className={inputClass}
          />
        </Field>

        {asset && (
          <p className="text-sm text-slate-400">
            Oficina receptora: <span className="font-medium text-white">{asset.office}</span> (la del activo)
          </p>
        )}

        {serverError && <ErrorBanner message={serverError} />}
        {success && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            {success}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            Registrar entrada
          </button>
          <Link href="/inventory/products" className="text-sm text-slate-300 hover:text-white">
            Volver al inventario
          </Link>
        </div>
      </form>
    </div>
  );
}
