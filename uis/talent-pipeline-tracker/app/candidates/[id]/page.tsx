"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCandidate, patchCandidate, updateCandidate, listNotes, addNote, deleteNote } from "@/lib/api";
import type { Candidate, CreateCandidatePayload, Note } from "@/types";
import { CandidateForm } from "@/components/CandidateForm";
import { LoadingPage, ErrorBanner, SuccessBanner } from "@/components/StatusBanners";
import { getStatusColor, getStageColor } from "@/lib/colors";
import { NoteItem } from "@/components/NoteItem";
import { NoteForm } from "@/components/NoteForm";

const STATUS_OPTIONS = [
  { value: "received", label: "Received" },
  { value: "in_progress", label: "In progress" },
  { value: "selected", label: "Selected" },
  { value: "discarded", label: "Discarded" },
];

const STAGE_OPTIONS = [
  { value: "pending", label: "Pending review" },
  { value: "review", label: "Under review" },
  { value: "personal_interview", label: "Personal interview" },
  { value: "technical_interview", label: "Technical interview" },
  { value: "offer_presented", label: "Offer presented" },
];

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status/stage update
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Notes
  const [notesError, setNotesError] = useState<string | null>(null);

  // Edit candidate (PUT)
  const [showEditForm, setShowEditForm] = useState(false);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [candidateData, notesResponse] = await Promise.all([
        getCandidate(id),
        listNotes(id),
      ]);
      setCandidate(candidateData);
      setNotes(notesResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidate");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update status or stage via PATCH
  const handlePatch = async (field: "status" | "stage", value: string) => {
    setUpdating(true);
    setUpdateSuccess(null);
    setUpdateError(null);
    try {
      const updated = await patchCandidate(id, { [field]: value });
      setCandidate(updated);
      setUpdateSuccess(
        field === "status" ? "Status updated successfully" : "Stage updated successfully"
      );
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : `Failed to update ${field}`);
    } finally {
      setUpdating(false);
    }
  };

  // Add note
  const handleAddNote = async (content: string) => {
    setNotesError(null);
    try {
      const newNote = await addNote(id, { content });
      setNotes((prev) => [...prev, newNote]);
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Failed to add note");
      throw err;
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    setNotesError(null);
    try {
      await deleteNote(id, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  // Update full candidate via PUT
  const handleUpdate = async (payload: CreateCandidatePayload) => {
    setEditError(null);
    setEditSuccess(null);
    try {
      const updated = await updateCandidate(id, payload);
      setCandidate(updated);
      setEditSuccess("Candidate updated successfully!");
      setShowEditForm(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update candidate");
      throw err;
    }
  };

  if (loading) return <LoadingPage />;
  if (error) return <div className="container"><ErrorBanner message={error} /></div>;
  if (!candidate) return <div className="container"><ErrorBanner message="Candidate not found" /></div>;

  return (
    <div className="container">
      {/* Back link */}
      <div style={{ marginBottom: "1rem" }}>
        <button
          className="btn btn-secondary"
          onClick={() => router.push("/")}
        >
          &larr; Back to list
        </button>
      </div>

      {/* Candidate info */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
          {candidate.full_name}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
          {candidate.position}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "0.75rem",
            fontSize: "0.875rem",
          }}
        >
          <Field label="Email" value={candidate.email} />
          <Field label="Phone" value={candidate.phone} />
          <Field label="LinkedIn" value={candidate.linkedin_url ? <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">Profile</a> : "—"} />
          <Field label="CV" value={candidate.cv_url ? <a href={candidate.cv_url} target="_blank" rel="noopener noreferrer">View CV</a> : "—"} />
          <Field label="Years of Exp." value={candidate.experience_years.toString()} />
          <Field label="Applied At" value={new Date(candidate.applied_at).toLocaleDateString()} />
          <Field label="Notes" value={candidate.notes_count.toString()} />
        </div>
      </div>

      {/* Edit button */}
      <div style={{ marginBottom: "1rem", textAlign: "right" }}>
        <button
          className="btn btn-secondary"
          onClick={() => setShowEditForm(!showEditForm)}
        >
          {showEditForm ? "Cancel Editing" : "Edit Candidate"}
        </button>
      </div>

      {/* Edit form */}
      {showEditForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
            Edit Candidate
          </h2>
          {editSuccess && <SuccessBanner message={editSuccess} />}
          {editError && <ErrorBanner message={editError} />}
          <CandidateForm
            initial={candidate}
            onSubmit={handleUpdate}
            onCancel={() => setShowEditForm(false)}
            statusOptions={STATUS_OPTIONS}
            stageOptions={STAGE_OPTIONS}
          />
        </div>
      )}

      {/* Status & Stage controls */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Status &amp; Stage
        </h2>

        {updateSuccess && <SuccessBanner message={updateSuccess} />}
        {updateError && <ErrorBanner message={updateError} />}

        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          {/* Status */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
              Status
            </label>
            <select
              className="select"
              style={{
                width: "200px",
                background: candidate ? getStatusColor(candidate.status).bg : undefined,
                color: candidate ? getStatusColor(candidate.status).text : undefined,
              }}
              value={candidate.status}
              onChange={(e) => handlePatch("status", e.target.value)}
              disabled={updating}
            >
              {STATUS_OPTIONS.map((opt) => {
                const c = getStatusColor(opt.value);
                return (
                  <option key={opt.value} value={opt.value} style={{ background: c.bg, color: c.text }}>
                    {opt.label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Stage */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
              Stage
            </label>
            <select
              className="select"
              style={{
                width: "200px",
                background: candidate ? getStageColor(candidate.stage).bg : undefined,
                color: candidate ? getStageColor(candidate.stage).text : undefined,
              }}
              value={candidate.stage}
              onChange={(e) => handlePatch("stage", e.target.value)}
              disabled={updating}
            >
              {STAGE_OPTIONS.map((opt) => {
                const c = getStageColor(opt.value);
                return (
                  <option key={opt.value} value={opt.value} style={{ background: c.bg, color: c.text }}>
                    {opt.label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Notes
        </h2>

        {notesError && <ErrorBanner message={notesError} />}

        <NoteForm onSubmit={handleAddNote} />

        <div style={{ marginTop: "1rem" }}>
          {notes.length === 0 && (
            <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
              No notes yet. Add one above.
            </p>
          )}
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} onDelete={handleDeleteNote} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}