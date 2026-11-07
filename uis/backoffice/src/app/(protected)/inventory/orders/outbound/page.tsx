"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AssetSelect } from "@/components/AssetSelect";
import { LoadError } from "@/components/LoadError";
import { ApiError, getUserMessage } from "@/lib/errors";
import { createOutboundOrder, EXIT_TYPES, EXIT_TYPE_LABELS, getProduct, type ExitType } from "@/lib/inventory";
import { useAssets } from "@/lib/useAssets";

type FieldErrors = Partial<Record<"asset" | "quantity" | "assigned_to", string>>;

function OutboundForm() {
  const { assets, loading, error: loadError, reload } = useAssets();
  const [assetId, setAssetId] = useState(useSearchParams().get("productId") ?? "");
  const [exitType, setExitType] = useState<ExitType>("allocation");
  const [assignedTo, setAssignedTo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  // Stock shown for the selected asset, with its own loading and error state.
  const [stock, setStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");
  const [stockVersion, setStockVersion] = useState(0);

  const asset = assets.find((item) => String(item.id) === assetId);

  useEffect(() => {
    // Refetch whenever the selection changes (or after a successful order); ignore stale answers.
    if (!assetId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStock(null);
      setStockError("");
      return;
    }
    let current = true;
    setStock(null);
    setStockError("");
    setStockLoading(true);
    getProduct(Number(assetId))
      .then((result) => current && setStock(result.current_stock))
      .catch((reason) => current && setStockError(getUserMessage(reason)))
      .finally(() => current && setStockLoading(false));
    return () => {
      current = false;
    };
  }, [assetId, stockVersion]);

  const requested = /^\d+$/.test(quantity.trim()) ? Number(quantity) : 0;
  const exceeds = stock !== null && requested > stock;

  // Quick client-side check; the API remains the source of truth (400/404/422).
  function validate(): FieldErrors {
    const problems: FieldErrors = {};
    if (!asset) problems.asset = "Selecciona un activo.";
    if (!/^\d+$/.test(quantity.trim()) || Number(quantity) <= 0) problems.quantity = "La cantidad debe ser un número entero mayor que 0.";
    if (exitType === "allocation" && !assignedTo.trim()) problems.assigned_to = "Indica a quién se asigna.";
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
      const order = await createOutboundOrder({
        asset_id: asset.id,
        quantity: Number(quantity),
        exit_type: exitType,
        assigned_to: exitType === "allocation" ? assignedTo.trim() : null,
        office: asset.office,
      });
      setNotice(`Salida registrada (${EXIT_TYPE_LABELS[order.exit_type]}): ${order.quantity} × ${order.asset_name} (${order.asset_sku}).`);
      setQuantity("");
      setAssignedTo("");
      setStockVersion((version) => version + 1); // refresh the stock shown
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 400) {
        setErrors({ quantity: reason.message }); // insufficient stock, next to the quantity
        setStockVersion((version) => version + 1); // someone else may have changed it
      } else if (reason instanceof ApiError && Object.keys(reason.fieldErrors).length > 0) {
        setErrors({ quantity: reason.fieldErrors.quantity, assigned_to: reason.fieldErrors.assigned_to });
        setFormError(getUserMessage(reason));
      } else {
        setFormError(getUserMessage(reason));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      {loadError && <LoadError message={loadError} onRetry={reload} busy={loading} />}
      {loading && <p className="muted small"><span className="spinner" aria-hidden="true" />Cargando activos…</p>}
      <div className="form-grid">
        <AssetSelect assets={assets} value={assetId} onChange={(id) => { setAssetId(id); setErrors({}); setNotice(""); }} error={errors.asset} disabled={loading || saving} />
        <label>
          Oficina
          <input value={asset?.office ?? ""} readOnly aria-describedby="office-hint" />
          <small id="office-hint" className="muted">Es la oficina del activo.</small>
        </label>
        <div role="status" aria-live="polite" className="stat">
          <span>Stock disponible</span>
          {!assetId && <strong className="muted">—</strong>}
          {stockLoading && <strong><span className="spinner" aria-hidden="true" />Cargando…</strong>}
          {stock !== null && !stockLoading && <strong>{stock}</strong>}
          {stockError && (
            <>
              <small className="field-error">{stockError}</small>
              <button type="button" onClick={() => setStockVersion((version) => version + 1)}>Reintentar</button>
            </>
          )}
        </div>
        <label>
          Tipo de salida *
          <select value={exitType} onChange={(event) => { setExitType(event.target.value as ExitType); setErrors((current) => ({ ...current, assigned_to: undefined })); }}>
            {EXIT_TYPES.map((value) => <option key={value} value={value}>{EXIT_TYPE_LABELS[value]}</option>)}
          </select>
        </label>
        {exitType === "allocation" && (
          <label>
            Asignado a *
            <input
              value={assignedTo} required onChange={(event) => setAssignedTo(event.target.value)}
              aria-invalid={errors.assigned_to ? true : undefined}
              aria-describedby={errors.assigned_to ? "assigned-error" : undefined}
            />
            {errors.assigned_to && <small id="assigned-error" className="field-error">{errors.assigned_to}</small>}
          </label>
        )}
        <label>
          Cantidad *
          <input
            type="number" min="1" step="1" inputMode="numeric" required value={quantity}
            onChange={(event) => { setQuantity(event.target.value); setErrors((current) => ({ ...current, quantity: undefined })); }}
            aria-invalid={errors.quantity ? true : undefined}
            aria-describedby={[exceeds ? "quantity-warning" : "", errors.quantity ? "quantity-error" : ""].filter(Boolean).join(" ") || undefined}
          />
          {exceeds && <small id="quantity-warning" className="field-warn">▲ Supera el stock disponible ({stock}).</small>}
          {errors.quantity && <small id="quantity-error" className="field-error" role="alert">{errors.quantity}</small>}
        </label>
      </div>
      <div aria-live="polite">
        {notice && <p className="success">{notice}</p>}
        {formError && <p className="error" role="alert">{formError}</p>}
      </div>
      <div className="actions">
        <button type="submit" disabled={saving || loading}>
          {saving ? <><span className="spinner" aria-hidden="true" />Registrando…</> : "Registrar salida"}
        </button>
      </div>
    </form>
  );
}

export default function OutboundOrderPage() {
  return (
    <main>
      <h1>Salida de activos</h1>
      <p className="muted">Registra una asignación a un empleado o un consumo. Resta unidades al stock del activo.</p>
      <Suspense fallback={<p className="muted" role="status">Cargando…</p>}>
        <OutboundForm />
      </Suspense>
    </main>
  );
}
