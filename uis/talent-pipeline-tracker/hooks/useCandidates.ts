"use client";

import { useCallback, useEffect, useState } from "react";
import { getRecords } from "@/lib/api";
import type { PaginatedRecords, RecordsQueryParams } from "@/types";

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: PaginatedRecords };

export function useCandidates(params: RecordsQueryParams) {
  const { status, stage, search } = params;
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadCandidates() {
      setState({ status: "loading" });
      try {
        const data = await getRecords({ limit: 100, status, stage, search });
        if (isActive) {
          setState({ status: "success", data });
        }
      } catch (error) {
        if (!isActive) return;
        const message =
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar las candidaturas.";
        setState({ status: "error", message });
      }
    }

    void loadCandidates();

    return () => {
      isActive = false;
    };
  }, [status, stage, search, reloadKey]);

  return { state, refetch };
}
