import { Loader2 } from "lucide-react";
import { unitsLabel } from "../../lib/inventoryRules";
import type { Asset } from "../../types/inventory";
import StockBadge from "./StockBadge";

/**
 * `current_stock` of the selected asset, shown before the user types a quantity. `stock` is the freshest figure
 * known (the API is asked again when the asset is picked, since someone else may have registered an order).
 */
export default function StockPanel({
  asset,
  stock,
  refreshing,
}: {
  asset: Asset | undefined;
  stock: number | null;
  refreshing: boolean;
}) {
  return (
    <div
      aria-live="polite"
      data-testid="stock-panel"
      className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
    >
      {!asset || stock === null ? (
        <p className="text-slate-400">Selecciona un activo para ver su stock disponible.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-slate-300">
            Stock actual de <span className="font-medium text-white">{asset.name}</span> ({asset.office}):{" "}
            <strong data-testid="available-stock" className="text-lg text-white">
              {unitsLabel(stock)}
            </strong>
          </p>
          <StockBadge stock={stock} />
          {refreshing && <Loader2 className="animate-spin text-slate-400" size={14} aria-label="Actualizando stock" />}
        </div>
      )}
    </div>
  );
}
