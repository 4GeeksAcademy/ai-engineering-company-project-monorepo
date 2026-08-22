"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Candidate } from "@/types/candidate";

export type AsyncState = "loading" | "success" | "error";

export function useCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [state, setState] = useState<AsyncState>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const data = await api.getCandidates();
      setCandidates(data);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidates.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { candidates, state, error, refresh };
}
