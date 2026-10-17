import { useCallback, useEffect, useState } from "react";

/**
 * Loads something from the API when the component mounts and keeps its three states: the `data`, whether it is
 * `loading`, and the `error` message of the last failure (the data it had before stays on screen).
 *
 * - `reload` reads again without touching the screen (after a mutation: the list stays, then updates).
 * - `retry` is for the "Reintentar" button: it goes back to the loading state first, so the page does not show an
 *   empty list ("no hay datos") while the second attempt is in flight.
 * - `setData` / `setError` let the view apply a change it already knows (e.g. one row edited) or report an error of
 *   its own actions in the same banner.
 *
 * `load` and `describeError` must keep the same identity between renders (module-level functions): they are what
 * `reload` depends on, and a new one on every render would load again on every render.
 */
export function useAsyncResource<T>(load: () => Promise<T>, initial: T, describeError: (err: unknown) => string) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setData(await load());
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [load, describeError]);

  const retry = useCallback(async () => {
    setLoading(true);
    await reload();
  }, [reload]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, loading, error, setError, reload, retry };
}
