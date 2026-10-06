import { useEffect, useState } from "react";

/** `value`, but only after it has stopped changing for `ms` milliseconds (used to wait for the user to stop typing). */
export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
