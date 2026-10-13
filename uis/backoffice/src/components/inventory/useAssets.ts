import { useCallback, useEffect, useState } from "react";
import { listAssets } from "../../lib/inventory";
import { describeInventoryError } from "../../lib/inventoryRules";
import type { Asset } from "../../types/inventory";

/** The assets with their current stock, loaded on mount; `reload` reads them again (after registering an order). */
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

  useEffect(() => {
    void reload();
  }, [reload]);

  return { assets, loading, error, reload };
}
