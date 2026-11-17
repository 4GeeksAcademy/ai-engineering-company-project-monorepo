"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Synchronizes status & stage filter values with URL search params.
 *
 * Returns the current filter values and a setter that pushes to the URL
 * so shared links restore the same filters.  Also provides a "clear"
 * helper.
 */
export function useRecordsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const stage = searchParams.get("stage") ?? "";
  const search = searchParams.get("search") ?? "";

  const setFilters = useCallback(
    (updates: { status?: string; stage?: string; search?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  return { status, stage, search, setFilters, clearFilters };
}

/**
 * Client-side search filter.
 * Returns the search query (from URL or local state) and a predicate
 * to run over the candidate list.
 */
export function useLocalSearch() {
  const [query, setQuery] = useState("");

  const matches = useCallback(
    (candidate: { name: string; email: string }) => {
      if (!query) return true;
      const lower = query.toLowerCase();
      return (
        candidate.name.toLowerCase().includes(lower) ||
        candidate.email.toLowerCase().includes(lower)
      );
    },
    [query]
  );

  return { query, setQuery, matches };
}