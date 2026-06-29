"use client";

import { useCallback, useEffect, useState } from "react";
import { getRecords, type GetRecordsParams } from "@/lib/api";
import type { Candidate, RecordsResponse } from "@/lib/types";

interface UseCandidatesResult {
  candidates: Candidate[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function paramsKey(params: GetRecordsParams): string {
  return `${params.status ?? ""}|${params.stage ?? ""}|${params.search ?? ""}|${params.page ?? ""}|${params.limit ?? ""}`;
}

export function useCandidates(
  params: GetRecordsParams = {},
): UseCandidatesResult {
  const [data, setData] = useState<RecordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const key = `${paramsKey(params)}::${refreshKey}`;

  useEffect(() => {
    let cancelled = false;

    getRecords(params)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Error al cargar candidatos";
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const totalPages = data ? Math.ceil(data.total / (params.limit ?? 20)) : 0;

  return {
    candidates: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages,
    loading,
    error,
    refetch,
  };
}
