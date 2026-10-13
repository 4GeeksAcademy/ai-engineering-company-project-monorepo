import { Field, inputClass } from "../incidents/Field";
import { assetOptionLabel } from "../../lib/inventoryRules";
import type { Asset } from "../../types/inventory";

/** The asset picker of both order forms: assets by name (never a raw id), the same name told apart by SKU and office. */
export default function AssetSelect({
  id,
  assets,
  loading,
  value,
  onChange,
  error,
}: {
  id: string;
  assets: Asset[];
  loading: boolean;
  value: string;
  onChange: (assetId: string) => void;
  error?: string;
}) {
  return (
    <Field id={id} label="Activo" error={error}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
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
  );
}
