import { useEffect } from "react";
import type { Asset } from "../../types/inventory";

/**
 * A link may name an asset that does not exist (any more): once the assets are loaded, if the selected id is not
 * among them, `clear` is called so the form starts with nothing selected instead of a select that shows no choice.
 */
export function useClearUnknownAsset(assets: Asset[], loading: boolean, assetId: string, clear: () => void) {
  useEffect(() => {
    if (!loading && assetId && !assets.some((a) => String(a.id) === assetId)) clear();
    // `clear` is a fresh closure on every render; the three values are what decides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, assets, assetId]);
}
