"use client";

import { useState } from "react";

interface NoteFormProps {
  onAdd: (content: string) => Promise<void>;
  adding?: boolean;
}

export function NoteForm({ onAdd, adding }: NoteFormProps) {
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await onAdd(content.trim());
      setContent("");
    } catch {}
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Añadir nota..."
        disabled={adding}
        className="min-w-0 flex-1 rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-400 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={adding || !content.trim()}
        className="shrink-0 rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {adding ? "..." : "Añadir"}
      </button>
    </form>
  );
}
