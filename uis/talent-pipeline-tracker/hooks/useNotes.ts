"use client";

import { useCallback, useEffect, useState } from "react";
import { addNote, deleteNote, getNotes } from "@/lib/api";
import type { Note } from "@/types";

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: Note[] };

export function useNotes(recordId: string) {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!recordId) return;

    let isActive = true;

    async function loadNotes() {
      setState({ status: "loading" });
      try {
        const data = await getNotes(recordId);
        if (isActive) {
          setState({ status: "success", data });
        }
      } catch (error) {
        if (!isActive) return;
        const message =
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar las notas.";
        setState({ status: "error", message });
      }
    }

    void loadNotes();

    return () => {
      isActive = false;
    };
  }, [recordId, reloadKey]);

  const createNote = async (content: string) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const note = await addNote(recordId, { content });
      setState((prev) =>
        prev.status === "success"
          ? { status: "success", data: [note, ...prev.data] }
          : { status: "success", data: [note] },
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo añadir la nota.";
      setActionError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeNote = async (noteId: string) => {
    setActionError(null);
    try {
      await deleteNote(recordId, noteId);
      setState((prev) =>
        prev.status === "success"
          ? {
              status: "success",
              data: prev.data.filter((note) => note.id !== noteId),
            }
          : prev,
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la nota.";
      setActionError(message);
      return false;
    }
  };

  return {
    state,
    actionError,
    isSubmitting,
    refetch,
    createNote,
    removeNote,
  };
}
