"use client";

import { getProducts, type Asset } from "@/lib/inventory";
import { useLoader } from "@/lib/useLoader";

const NO_ASSETS: Asset[] = [];

/** The asset list for the order forms, with its own loading and error state. */
export function useAssets() {
  const { data: assets, loading, error, reload } = useLoader(getProducts, NO_ASSETS);
  return { assets, loading, error, reload };
}
