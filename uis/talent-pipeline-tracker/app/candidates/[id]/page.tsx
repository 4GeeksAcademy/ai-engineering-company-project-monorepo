"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CandidateForm } from "@/src/lib/candidate-form";
import { addNote, deleteNote, getCandidate, listNotes, patchCandidate, updateCandidate } from "@/src/lib/api";
import { STAGE_LABELS, STATUS_LABELS, STAGES, STATUSES, type Candidate, type CandidateNote, type CandidatePayload, type CandidateStage, type CandidateStatus } from "@/src/lib/types";

function formatDate(date: string | undefined) {
  if (!date) return "—";
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function CandidateDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [updatingField, setUpdatingField] = useState<"status" | "stage" | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [record, recordNotes] = await Promise.all([getCandidate(id), listNotes(id)]);
      setCandidate(record);
      setNotes(recordNotes);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load candidate.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function updateField(field: "status" | "stage", value: string) {
    if (!candidate) return;
    setActionError(""); setNotice(""); setUpdatingField(field);
    const patch = field === "status" ? { status: value as CandidateStatus } : { stage: value as CandidateStage };
    try {
      const updated = await patchCandidate(id, patch);
      setCandidate((current) => ({ ...current!, ...updated, ...patch }));
      setNotice("Candidate updated successfully.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to update candidate.");
    } finally {
      setUpdatingField(null);
    }
  }

  async function saveEdit(payload: CandidatePayload) {
    const updated = await updateCandidate(id, payload);
    setCandidate(updated);
    setEditing(false);
    setNotice("Candidate details saved successfully.");
  }

  async function submitNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true); setActionError(""); setNotice("");
    try {
      const note = await addNote(id, noteText.trim());
      setNotes((current) => [note, ...current]); setNoteText(""); setNotice("Note added.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to add note.");
    } finally { setSavingNote(false); }
  }

  async function removeNote(noteId: string) {
    setActionError(""); setNotice(""); setDeletingNoteId(noteId);
    try {
      await deleteNote(id, noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId)); setNotice("Note removed.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to delete note.");
    } finally {
      setDeletingNoteId(null);
    }
  }

  if (loading) return <main className="shell"><div className="loading-state detail-loading"><span className="spinner" />Loading candidate…</div></main>;
  if (error || !candidate) return <main className="shell"><Link className="back-link" href="/">← Back to pipeline</Link><div className="feedback error" role="alert">{error || "Candidate not found."}<button className="text-button" onClick={() => void load()}>Try again</button></div></main>;

  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/"><span className="brand-mark">H</span><span>HealthCore <small>PEOPLE OPERATIONS</small></span></Link><span className="topbar-note"><span className="online-dot" /> Austin headquarters · Talent team</span></header>
    <Link className="back-link" href="/">← All candidates</Link>
    <section className="detail-hero"><div className="detail-identity"><span className="avatar avatar-large">{candidate.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><p className="eyebrow">CANDIDATE PROFILE</p><h1>{candidate.name}</h1><p>{candidate.position} <span>·</span> Applied {formatDate(candidate.application_date)}</p></div></div><button className="button secondary" onClick={() => setEditing(true)}>Edit details</button></section>
    {(notice || actionError) && <p className={`feedback ${actionError ? "error" : "success"}`} role={actionError ? "alert" : "status"}>{actionError || notice}</p>}
    <div className="detail-layout"><div className="detail-main">
      <section className="detail-card"><div className="card-title"><div><p className="eyebrow">APPLICATION</p><h2>Candidate details</h2></div><span className={`status-badge status-${candidate.status}`}>{STATUS_LABELS[candidate.status]}</span></div><div className="details-grid"><div className="detail-field"><span>Email address</span><a href={`mailto:${candidate.email}`}>{candidate.email}</a></div><div className="detail-field"><span>Phone</span><a href={candidate.phone ? `tel:${candidate.phone}` : undefined}>{candidate.phone || "Not provided"}</a></div><div className="detail-field"><span>Position</span><strong>{candidate.position}</strong></div><div className="detail-field"><span>Years of experience</span><strong>{candidate.years_experience == null ? "Not provided" : `${candidate.years_experience} years`}</strong></div><div className="detail-field"><span>Application date</span><strong>{formatDate(candidate.application_date)}</strong></div><div className="detail-field"><span>Current stage</span><strong>{STAGE_LABELS[candidate.stage]}</strong></div><div className="detail-field"><span>LinkedIn</span>{candidate.linkedin ? <a href={candidate.linkedin} target="_blank" rel="noreferrer">View profile ↗</a> : <strong>Not provided</strong>}</div><div className="detail-field"><span>CV / résumé</span>{candidate.cv_link ? <a href={candidate.cv_link} target="_blank" rel="noreferrer">Open document ↗</a> : <strong>Not provided</strong>}</div></div></section>
      <section className="detail-card notes-card"><div className="card-title"><div><p className="eyebrow">PRIVATE · INTERNAL ONLY</p><h2>Team notes <span className="count-pill">{notes.length}</span></h2></div></div><form className="note-form" onSubmit={submitNote}><label className="sr-only" htmlFor="new-note">Add an internal note</label><textarea id="new-note" rows={3} maxLength={2000} placeholder="Add a note after a call or interview…" value={noteText} onChange={(e) => setNoteText(e.target.value)} required /><div className="note-form-footer"><span>Visible only to the talent team</span><button className="button primary compact" type="submit" disabled={savingNote || !noteText.trim()}>{savingNote ? "Adding…" : "Add note"}</button></div></form>{notes.length === 0 ? <p className="notes-empty">No notes yet. Add a note to keep the team informed.</p> : <ul className="notes-list">{notes.map((note) => <li className="note-item" key={note.id}><span className="note-avatar">T</span><div className="note-body"><div className="note-meta"><strong>Talent team</strong><time>{note.created_at ? formatDate(note.created_at) : "Internal note"}</time></div><p>{note.content}</p></div><button className="delete-note" disabled={deletingNoteId === note.id} onClick={() => void removeNote(note.id)} aria-label={deletingNoteId === note.id ? "Deleting note" : "Delete note"} title={deletingNoteId === note.id ? "Deleting note" : "Delete note"}>{deletingNoteId === note.id ? "…" : "×"}</button></li>)}</ul>}</section>
    </div><aside className="detail-sidebar"><section className="detail-card stage-card"><p className="eyebrow">PIPELINE PROGRESS</p><h2>Move candidate</h2><label>Status<select disabled={updatingField !== null} value={candidate.status} onChange={(e) => void updateField("status", e.target.value)}>{STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></label><label>Stage<select disabled={updatingField !== null} value={candidate.stage} onChange={(e) => void updateField("stage", e.target.value)}>{STAGES.map((item) => <option key={item} value={item}>{STAGE_LABELS[item]}</option>)}</select></label><p className="sidebar-hint" role="status">{updatingField ? `Saving ${updatingField}…` : "Changes are saved immediately to the candidate record."}</p></section><div className="privacy-card"><span>◈</span><div><strong>Confidential information</strong><p>Candidate records and internal notes should only be accessed by authorised team members.</p></div></div></aside></div>
    <footer className="page-footer"><span>HealthCore Digital · People Operations</span><span>Candidate information is confidential</span></footer>
    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(false); }}><div className="modal" role="dialog" aria-modal="true"><CandidateForm initial={candidate} onSubmit={saveEdit} onCancel={() => setEditing(false)} /></div></div>}
  </main>;
}

export default function CandidateDetailPage() {
  return <Suspense fallback={<main className="shell"><div className="loading-state detail-loading"><span className="spinner" />Loading candidate…</div></main>}><CandidateDetailContent /></Suspense>;
}
