import { useCallback, useEffect, useState } from "react";
import { getAsset } from "../../lib/inventory";
import type { Asset } from "../../types/inventory";

/**
 * The stock of the selected asset, as fresh as possible and reactive to the selection. The list's figure is used
 * at once; the API is asked again for that one asset whenever the selection changes, because the list may be minutes
 * old. `refresh` asks again (after registering an order, or after the API rejected one) and resolves with the asset.
 */
export function useAssetStock(assets: Asset[], assetId: string) {
  const selected = assets.find((a) => String(a.id) === assetId);
  const [fresh, setFresh] = useState<Asset | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (): Promise<Asset | null> => {
    if (!assetId) return null;
    setRefreshing(true);
    try {
      const asset = await getAsset(Number(assetId));
      setFresh(asset);
      return asset;
    } catch {
      return null; // keep the figure we have; the API checks the stock again when the order is sent
    } finally {
      setRefreshing(false);
    }
  }, [assetId]);

  useEffect(() => {
    setFresh(null);
    if (assetId) void refresh();
  }, [assetId, refresh]);

  const known = fresh && String(fresh.id) === assetId ? fresh : selected;
  return { asset: known, stock: known ? known.current_stock : null, refreshing, refresh };
}
