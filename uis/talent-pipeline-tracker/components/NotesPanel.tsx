"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/Alert";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { useNotes } from "@/hooks/useNotes";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export default function NotesPanel({ recordId }: { recordId: string }) {
  const { state, actionError, isSubmitting, refetch, createNote, removeNote } =
    useNotes(recordId);
  const [content, setContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;

    setSuccessMessage(null);
    const success = await createNote(content.trim());
    if (success) {
      setContent("");
      setSuccessMessage("Nota añadida correctamente.");
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    setSuccessMessage(null);
    const success = await removeNote(noteId);
    setDeletingId(null);
    if (success) {
      setSuccessMessage("Nota eliminada correctamente.");
    }
  };

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Notas internas</h2>
      <p className="mt-1 text-sm text-stone-600">
        Observaciones del equipo de People & Talent sobre esta candidatura.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
        <label htmlFor="note-content" className="sr-only">
          Nueva nota
        </label>
        <textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Escribe una nota interna..."
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2"
        />
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Guardando..." : "Añadir nota"}
        </button>
      </form>

      {actionError && (
        <div className="mt-4">
          <Alert variant="error" message={actionError} />
        </div>
      )}
      {successMessage && (
        <div className="mt-4">
          <Alert variant="success" message={successMessage} />
        </div>
      )}

      <div className="mt-6">
        {state.status === "loading" && (
          <LoadingState label="Cargando notas..." />
        )}
        {state.status === "error" && (
          <ErrorState message={state.message} onRetry={refetch} />
        )}
        {state.status === "success" && state.data.length === 0 && (
          <EmptyState
            title="Sin notas todavía"
            description="Añade la primera observación sobre este candidato."
          />
        )}
        {state.status === "success" && state.data.length > 0 && (
          <ul className="space-y-3">
            {state.data.map((note) => (
              <li
                key={note.id}
                className="rounded-lg border border-stone-200 bg-stone-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-stone-800">{note.content}</p>
                  <button
                    type="button"
                    onClick={() => void handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="shrink-0 text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                  >
                    {deletingId === note.id ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  {formatDate(note.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
