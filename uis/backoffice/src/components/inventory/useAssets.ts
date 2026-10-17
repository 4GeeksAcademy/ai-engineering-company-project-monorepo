import { listAssets } from "../../lib/inventory";
import { describeInventoryError } from "../../lib/inventoryRules";
import { useAsyncResource } from "../../lib/useAsyncResource";
import type { Asset } from "../../types/inventory";

const NO_ASSETS: Asset[] = [];
const describeLoadError = (err: unknown) => describeInventoryError(err, "No se pudo cargar el inventario.");

/**
 * The assets with their current stock, loaded on mount. `reload` reads them again without touching the screen (after
 * registering an order); `retry` is for the "Reintentar" button after a failure (see `useAsyncResource`).
 */
export function useAssets() {
  const { data, loading, error, reload, retry } = useAsyncResource(listAssets, NO_ASSETS, describeLoadError);
  return { assets: data, loading, error, reload, retry };
}
