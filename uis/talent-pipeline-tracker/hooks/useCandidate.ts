"use client";

import { useCallback, useEffect, useState } from "react";
import { getRecord } from "@/lib/api";
import type { RecordOut } from "@/types";

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: RecordOut };

export function useCandidate(id: string) {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!id) return;

    let isActive = true;

    async function loadCandidate() {
      setState({ status: "loading" });
      try {
        const data = await getRecord(id);
        if (isActive) {
          setState({ status: "success", data });
        }
      } catch (error) {
        if (!isActive) return;
        const message =
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar la candidatura.";
        setState({ status: "error", message });
      }
    }

    void loadCandidate();

    return () => {
      isActive = false;
    };
  }, [id, reloadKey]);

  const setCandidate = useCallback((data: RecordOut) => {
    setState({ status: "success", data });
  }, []);

  return { state, refetch, setCandidate };
}
