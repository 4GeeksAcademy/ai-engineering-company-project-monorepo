"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Candidate, Note } from "@/types/candidate";
import { AsyncState } from "./useCandidates";

export function useCandidate(id: string) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [state, setState] = useState<AsyncState>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [candidateData, notesData] = await Promise.all([
        api.getCandidate(id),
        api.getNotes(id),
      ]);
      setCandidate(candidateData);
      setNotes(notesData);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidate.");
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { candidate, notes, state, error, refresh, setCandidate, setNotes };
}
