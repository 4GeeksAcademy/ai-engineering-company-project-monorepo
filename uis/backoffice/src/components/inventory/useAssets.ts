import { useCallback, useEffect, useState } from "react";
import { listAssets } from "../../lib/inventory";
import { describeInventoryError } from "../../lib/inventoryRules";
import type { Asset } from "../../types/inventory";

/**
 * The assets with their current stock, loaded on mount. `reload` reads them again without touching the screen (after
 * registering an order); `retry` is for the "Reintentar" button after a failure: it goes back to the loading state, so
 * the page does not show an empty list ("no hay activos") while the second attempt is in flight.
 */
export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setAssets(await listAssets());
    } catch (err) {
      setError(describeInventoryError(err, "No se pudo cargar el inventario."));
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(async () => {
    setLoading(true);
    await reload();
  }, [reload]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { assets, loading, error, reload, retry };
}
