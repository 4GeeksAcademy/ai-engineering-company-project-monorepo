"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AssetSelect } from "@/components/AssetSelect";
import { LoadError } from "@/components/LoadError";
import { ApiError, getUserMessage } from "@/lib/errors";
import { createInboundOrder } from "@/lib/inventory";
import { useAssets } from "@/lib/useAssets";

type FieldErrors = Partial<Record<"asset" | "quantity" | "supplier", string>>;

function InboundForm() {
  const { assets, loading, error: loadError, reload } = useAssets();
  const [assetId, setAssetId] = useState(useSearchParams().get("productId") ?? "");
  const [quantity, setQuantity] = useState("");
  const [supplier, setSupplier] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const asset = assets.find((item) => String(item.id) === assetId);

  // Quick client-side check; the API remains the source of truth (400/404/422).
  function validate(): FieldErrors {
    const problems: FieldErrors = {};
    if (!asset) problems.asset = "Selecciona un activo.";
    if (!/^\d+$/.test(quantity.trim()) || Number(quantity) <= 0) problems.quantity = "La cantidad debe ser un número entero mayor que 0.";
    if (!supplier.trim()) problems.supplier = "El proveedor es obligatorio.";
    return problems;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    setFormError("");
    const problems = validate();
    setErrors(problems);
    if (Object.keys(problems).length > 0 || !asset) return;
    setSaving(true);
    try {
      const order = await createInboundOrder({ asset_id: asset.id, quantity: Number(quantity), supplier: supplier.trim(), office: asset.office });
      setNotice(`Entrada registrada: ${order.quantity} × ${order.asset_name} (${order.asset_sku}) de ${order.supplier}.`);
      setAssetId("");
      setQuantity("");
      setSupplier("");
      reload();
    } catch (reason) {
      if (reason instanceof ApiError && reason.fieldErrors.quantity) setErrors({ quantity: reason.fieldErrors.quantity });
      if (reason instanceof ApiError && reason.fieldErrors.supplier) setErrors((current) => ({ ...current, supplier: reason.fieldErrors.supplier }));
      setFormError(getUserMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      {loadError && <LoadError message={loadError} onRetry={reload} busy={loading} />}
      {loading && <p className="muted small"><span className="spinner" aria-hidden="true" />Cargando activos…</p>}
      <div className="form-grid">
        <AssetSelect assets={assets} value={assetId} onChange={setAssetId} error={errors.asset} disabled={loading || saving} />
        <label>
          Oficina receptora
          <input value={asset?.office ?? ""} readOnly aria-describedby="office-hint" />
          <small id="office-hint" className="muted">Es la oficina del activo.</small>
        </label>
        <label>
          Cantidad recibida *
          <input
            type="number" min="1" step="1" inputMode="numeric" required value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-invalid={errors.quantity ? true : undefined}
            aria-describedby={errors.quantity ? "quantity-error" : undefined}
          />
          {errors.quantity && <small id="quantity-error" className="field-error">{errors.quantity}</small>}
        </label>
        <label>
          Proveedor *
          <input
            value={supplier} required onChange={(event) => setSupplier(event.target.value)}
            aria-invalid={errors.supplier ? true : undefined}
            aria-describedby={errors.supplier ? "supplier-error" : undefined}
          />
          {errors.supplier && <small id="supplier-error" className="field-error">{errors.supplier}</small>}
        </label>
      </div>
      <div aria-live="polite">
        {notice && <p className="success">{notice}</p>}
        {formError && <p className="error" role="alert">{formError}</p>}
      </div>
      <div className="actions">
        <button type="submit" disabled={saving || loading}>
          {saving ? <><span className="spinner" aria-hidden="true" />Registrando…</> : "Registrar entrada"}
        </button>
      </div>
    </form>
  );
}

export default function InboundOrderPage() {
  return (
    <main>
      <h1>Entrada de activos</h1>
      <p className="muted">Registra una compra o entrega recibida. Suma unidades al stock del activo.</p>
      <Suspense fallback={<p className="muted" role="status">Cargando…</p>}>
        <InboundForm />
      </Suspense>
    </main>
  );
}
