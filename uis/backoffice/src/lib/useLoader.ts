"use client";

import { useCallback, useEffect, useState } from "react";
import { getUserMessage } from "@/lib/errors";

/**
 * Loads data when the component mounts, and again whenever `fetcher` changes, with its
 * loading and error state. `fetcher` must be stable (wrap it in useCallback, listing the
 * filters it reads). On failure `data` goes back to `initial`, so a list is never shown
 * under filters it doesn't match. `setData` is for optimistic or row-level updates.
 */
export function useLoader<T>(fetcher: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetcher());
    } catch (reason) {
      setData(initial);
      setError(getUserMessage(reason));
    } finally {
      setLoading(false);
    }
    // `initial` is a constant default; only a new fetcher should trigger a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher]);

  useEffect(() => {
    // Fetching on mount (and when the fetcher changes) is the point of this effect; load() flags "loading" first.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { data, setData, loading, error, reload: load };
}
