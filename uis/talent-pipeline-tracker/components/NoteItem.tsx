import type { Note } from "@/types";

interface NoteItemProps {
  note: Note;
  onDelete: (noteId: string) => void;
  /** Label override for delete, e.g. from BRIEFING */
  deleteLabel?: string;
}

export function NoteItem({ note, onDelete, deleteLabel }: NoteItemProps) {
  return (
    <div
      className="card"
      style={{
        marginBottom: "0.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "0.75rem",
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
          {note.content}
        </p>
        {note.created_at && (
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
            {new Date(note.created_at).toLocaleString()}
          </p>
        )}
      </div>
      <button
        className="btn btn-danger"
        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
        onClick={() => onDelete(note.id)}
      >
        {deleteLabel ?? "Delete"}
      </button>
    </div>
  );
}