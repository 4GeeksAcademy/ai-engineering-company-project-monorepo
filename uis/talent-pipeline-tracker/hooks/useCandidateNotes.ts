"use client";

import { useCallback, useState } from "react";
import { addNote, deleteNote } from "@/lib/api";
import type { Note } from "@/lib/types";

interface UseCandidateNotesResult {
  notes: Note[];
  loading: boolean;
  adding: boolean;
  error: string | null;
  add: (content: string) => Promise<void>;
  remove: (noteId: string) => Promise<void>;
}

export function useCandidateNotes(
  recordId: string,
  initialNotes: Note[] = [],
): UseCandidateNotesResult {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(
    async (content: string) => {
      setAdding(true);
      setError(null);
      try {
        const created = await addNote(recordId, { content });
        setNotes((prev) => [...prev, created]);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al añadir nota";
        setError(message);
        throw err;
      } finally {
        setAdding(false);
      }
    },
    [recordId],
  );

  const remove = useCallback(
    async (noteId: string) => {
      setLoading(true);
      setError(null);
      try {
        await deleteNote(recordId, noteId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al eliminar nota";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [recordId],
  );

  return { notes, loading, adding, error, add, remove };
}
