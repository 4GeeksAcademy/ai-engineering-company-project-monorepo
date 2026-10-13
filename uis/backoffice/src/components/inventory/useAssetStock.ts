import { useCallback, useEffect, useRef, useState } from "react";
import { getAsset } from "../../lib/inventory";
import type { Asset } from "../../types/inventory";

/**
 * The stock of the selected asset, as fresh as possible and reactive to the selection. The list's figure is used
 * at once; the API is asked again for that one asset whenever the selection changes, because the list may be minutes
 * old. `refresh` asks again (after registering an order, or after the API rejected one) and resolves with the asset.
 *
 * Only the latest request may update the screen: if the user changes the selection while an earlier answer is on its
 * way, that answer is dropped, so neither the figure nor the spinner can belong to the previous asset.
 */
export function useAssetStock(assets: Asset[], assetId: string) {
  const selected = assets.find((a) => String(a.id) === assetId);
  const [fresh, setFresh] = useState<Asset | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);

  const refresh = useCallback(async (): Promise<Asset | null> => {
    if (!assetId) return null;
    const request = ++latest.current;
    setRefreshing(true);
    try {
      const asset = await getAsset(Number(assetId));
      if (request === latest.current) setFresh(asset);
      return asset; // the caller asked for this asset: it gets its own figure even if the screen moved on
    } catch {
      return null; // keep the figure we have; the API checks the stock again when the order is sent
    } finally {
      if (request === latest.current) setRefreshing(false);
    }
  }, [assetId]);

  useEffect(() => {
    latest.current += 1; // whatever was in flight belongs to the previous selection
    setFresh(null);
    setRefreshing(false);
    if (assetId) void refresh();
  }, [assetId, refresh]);

  const known = fresh && String(fresh.id) === assetId ? fresh : selected;
  return { asset: known, stock: known ? known.current_stock : null, refreshing, refresh };
}
