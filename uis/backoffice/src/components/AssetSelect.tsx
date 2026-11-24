import type { Asset } from "@/lib/inventory";

type Props = { assets: Asset[]; value: string; onChange: (id: string) => void; error?: string; disabled?: boolean };

/** Picks an asset by name and SKU; the form never asks for a typed id. */
export function AssetSelect({ assets, value, onChange, error, disabled }: Props) {
  return (
    <label>
      Activo *
      <select
        name="asset"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "asset-error" : undefined}
      >
        <option value="">Selecciona un activo…</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.name} ({asset.sku}) · {asset.office}</option>
        ))}
      </select>
      {error && <small id="asset-error" className="field-error">{error}</small>}
    </label>
  );
}
