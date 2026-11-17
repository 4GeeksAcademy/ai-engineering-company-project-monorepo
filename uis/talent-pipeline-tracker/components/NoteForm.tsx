"use client";

import { useState } from "react";

interface NoteFormProps {
  onSubmit: (content: string) => Promise<void>;
  /** Placeholder text per BRIEFING */
  placeholder?: string;
  /** Submit button label per BRIEFING */
  submitLabel?: string;
}

export function NoteForm({
  onSubmit,
  placeholder = "Write a note…",
  submitLabel = "Add Note",
}: NoteFormProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        className="input"
        style={{ minHeight: "80px", resize: "vertical" }}
        placeholder={placeholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={submitting}
      />
      <div style={{ marginTop: "0.5rem" }}>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!content.trim() || submitting}
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}