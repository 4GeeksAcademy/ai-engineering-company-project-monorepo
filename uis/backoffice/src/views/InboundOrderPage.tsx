"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createInboundOrder } from "../lib/inventory";
import { ErrorBanner, Field, inputClass } from "../components/incidents/Field";
import AssetSelect from "../components/inventory/AssetSelect";
import SuccessNotice from "../components/inventory/SuccessNotice";
import StockPanel from "../components/inventory/StockPanel";
import { useAssets } from "../components/inventory/useAssets";
import { useAssetStock } from "../components/inventory/useAssetStock";
import { useClearUnknownAsset } from "../components/inventory/useClearUnknownAsset";
import {
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

  useClearUnknownAsset(assets, loading, form.assetId, () => setForm((prev) => ({ ...prev, assetId: "" })));

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
        <AssetSelect
          id="inbound-asset"
          assets={assets}
          loading={loading}
          value={form.assetId}
          onChange={(assetId) => set("assetId", assetId)}
          error={errors.assetId}
        />

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
        {success && <SuccessNotice message={success} />}

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
