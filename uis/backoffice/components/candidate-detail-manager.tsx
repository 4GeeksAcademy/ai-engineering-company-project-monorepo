"use client";

import { useState } from "react";
import Link from "next/link";

import { getStageLabel, getStatusLabel } from "@/lib/candidate-labels";
import { validateCandidateForm, type CandidateFormErrors, type CandidateFormValues } from "@/lib/candidate-form-validation";
import {
  addCandidateNote,
  deleteCandidateNote,
  updateCandidate,
  updateCandidateStage,
  updateCandidateStatus,
} from "@/services/api";
import type { Candidate, CandidateNote, CandidateStage, CandidateStatus } from "@/types/models";

interface CandidateDetailManagerProps {
  candidate: Candidate;
  notes: CandidateNote[];
  backHref: string;
}

const STATUS_OPTIONS: CandidateStatus[] = ["received", "in_progress", "selected", "discarded"];
const STAGE_OPTIONS: CandidateStage[] = [
  "pending",
  "review",
  "personal_interview",
  "technical_interview",
  "offer_presented",
];

function toFormValues(candidate: Candidate): CandidateFormValues {
  return {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    position: candidate.position,
    linkedinUrl: candidate.linkedinUrl ?? "",
    resumeUrl: candidate.resumeUrl ?? "",
    yearsOfExperience: String(candidate.yearsOfExperience),
    status: candidate.status,
    stage: candidate.stage,
    appliedAt: candidate.appliedAt.slice(0, 10),
  };
}

export default function CandidateDetailManager({
  candidate: initialCandidate,
  notes: initialNotes,
  backHref,
}: CandidateDetailManagerProps) {
  const [candidate, setCandidate] = useState<Candidate>(initialCandidate);
  const [notes, setNotes] = useState<CandidateNote[]>(initialNotes);
  const [statusDraft, setStatusDraft] = useState<CandidateStatus>(initialCandidate.status);
  const [stageDraft, setStageDraft] = useState<CandidateStage>(initialCandidate.stage);
  const [noteInput, setNoteInput] = useState("");
  const [formValues, setFormValues] = useState<CandidateFormValues>(toFormValues(initialCandidate));
  const [formErrors, setFormErrors] = useState<CandidateFormErrors>({});

  const [statusLoading, setStatusLoading] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [statusError, setStatusError] = useState<string | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [stageSuccess, setStageSuccess] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const onUpdateStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusError(null);
    setStatusSuccess(null);

    try {
      setStatusLoading(true);
      const updated = await updateCandidateStatus(candidate.id, statusDraft);
      setCandidate(updated);
      setStatusDraft(updated.status);
      setStageDraft(updated.stage);
      setFormValues((prev) => ({ ...prev, status: updated.status, stage: updated.stage }));
      setStatusSuccess("Estado actualizado correctamente.");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
    } finally {
      setStatusLoading(false);
    }
  };

  const onUpdateStage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStageError(null);
    setStageSuccess(null);

    try {
      setStageLoading(true);
      const updated = await updateCandidateStage(candidate.id, stageDraft);
      setCandidate(updated);
      setStatusDraft(updated.status);
      setStageDraft(updated.stage);
      setFormValues((prev) => ({ ...prev, status: updated.status, stage: updated.stage }));
      setStageSuccess("Etapa actualizada correctamente.");
    } catch (error) {
      setStageError(error instanceof Error ? error.message : "No se pudo actualizar la etapa.");
    } finally {
      setStageLoading(false);
    }
  };

  const onAddNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNoteError(null);
    setNoteSuccess(null);

    const content = noteInput.trim();
    if (!content) {
      setNoteError("La nota no puede estar vacia.");
      return;
    }

    try {
      setNoteLoading(true);
      const newNote = await addCandidateNote(candidate.id, content);
      setNotes((prev) => [newNote, ...prev]);
      setNoteInput("");
      setNoteSuccess("Nota agregada correctamente.");
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "No se pudo agregar la nota.");
    } finally {
      setNoteLoading(false);
    }
  };

  const onDeleteNote = async (noteId: string) => {
    setNoteError(null);
    setNoteSuccess(null);

    try {
      setNoteLoading(true);
      await deleteCandidateNote(candidate.id, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      setNoteSuccess("Nota eliminada correctamente.");
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "No se pudo eliminar la nota.");
    } finally {
      setNoteLoading(false);
    }
  };

  const onEditCandidate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditError(null);
    setEditSuccess(null);

    const validation = validateCandidateForm(formValues);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    try {
      setEditLoading(true);
      const updated = await updateCandidate(candidate.id, {
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        phone: formValues.phone.trim(),
        position: formValues.position.trim(),
        linkedinUrl: formValues.linkedinUrl.trim() || undefined,
        resumeUrl: formValues.resumeUrl.trim() || undefined,
        yearsOfExperience: Number(formValues.yearsOfExperience),
        status: candidate.status,
        stage: candidate.stage,
        appliedAt: formValues.appliedAt,
      });

      setCandidate(updated);
      setFormValues(toFormValues(updated));
      setStatusDraft(updated.status);
      setStageDraft(updated.stage);
      setFormErrors({});
      setEditSuccess("Candidatura actualizada correctamente.");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "No se pudo editar la candidatura.");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <header className="page-header">
        <h1 className="page-title">{candidate.name}</h1>
        <p className="page-subtitle">Detalle de candidatura</p>
      </header>

      <section className="candidate-card">
        <p><strong>Puesto:</strong> {candidate.position}</p>
        <p><strong>Email:</strong> {candidate.email}</p>
        <p><strong>Telefono:</strong> {candidate.phone}</p>
        <p><strong>Estado:</strong> {getStatusLabel(candidate.status)}</p>
        <p><strong>Etapa:</strong> {getStageLabel(candidate.stage)}</p>
      </section>

      <section className="form-panel" aria-label="Actualizar estado">
        <h2>Actualizar estado</h2>
        <form className="inline-form" onSubmit={onUpdateStatus}>
          <select
            value={statusDraft}
            onChange={(event) => {
              setStatusDraft(event.target.value as CandidateStatus);
            }}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
          <button type="submit" className="primary-button" disabled={statusLoading}>
            {statusLoading ? "Guardando..." : "Guardar estado"}
          </button>
        </form>
        {statusError && <p className="feedback-error" role="alert">{statusError}</p>}
        {statusSuccess && <p className="feedback-success" role="status">{statusSuccess}</p>}
      </section>

      <section className="form-panel" aria-label="Actualizar etapa">
        <h2>Actualizar etapa</h2>
        <form className="inline-form" onSubmit={onUpdateStage}>
          <select
            value={stageDraft}
            onChange={(event) => {
              setStageDraft(event.target.value as CandidateStage);
            }}
          >
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {getStageLabel(stage)}
              </option>
            ))}
          </select>
          <button type="submit" className="primary-button" disabled={stageLoading}>
            {stageLoading ? "Guardando..." : "Guardar etapa"}
          </button>
        </form>
        {stageError && <p className="feedback-error" role="alert">{stageError}</p>}
        {stageSuccess && <p className="feedback-success" role="status">{stageSuccess}</p>}
      </section>

      <section className="form-panel" aria-label="Notas internas">
        <h2>Notas internas</h2>
        <form className="notes-form" onSubmit={onAddNote}>
          <label htmlFor="new-note">Nueva nota</label>
          <textarea
            id="new-note"
            value={noteInput}
            onChange={(event) => {
              setNoteInput(event.target.value);
            }}
            rows={4}
          />
          <button type="submit" className="primary-button" disabled={noteLoading}>
            {noteLoading ? "Guardando..." : "Anadir nota"}
          </button>
        </form>
        {noteError && <p className="feedback-error" role="alert">{noteError}</p>}
        {noteSuccess && <p className="feedback-success" role="status">{noteSuccess}</p>}

        {notes.length === 0 ? (
          <p>No hay notas para esta candidatura.</p>
        ) : (
          <ul className="notes-list">
            {notes.map((note) => (
              <li key={note.id} className="note-item">
                <p>{note.content}</p>
                <small>{new Date(note.createdAt).toLocaleString("es-ES")}</small>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    void onDeleteNote(note.id);
                  }}
                  disabled={noteLoading}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="editar-candidatura" className="form-panel" aria-label="Editar candidatura">
        <h2>Editar candidatura</h2>
        <form className="form-grid" onSubmit={onEditCandidate} noValidate>
          <label>
            Nombre completo
            <input
              type="text"
              value={formValues.name}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, name: event.target.value }));
                setFormErrors((prev) => ({ ...prev, name: undefined }));
              }}
              aria-invalid={Boolean(formErrors.name)}
            />
            {formErrors.name && <span className="field-error">{formErrors.name}</span>}
          </label>

          <label>
            Email
            <input
              type="email"
              value={formValues.email}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, email: event.target.value }));
                setFormErrors((prev) => ({ ...prev, email: undefined }));
              }}
              aria-invalid={Boolean(formErrors.email)}
            />
            {formErrors.email && <span className="field-error">{formErrors.email}</span>}
          </label>

          <label>
            Telefono
            <input
              type="tel"
              value={formValues.phone}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, phone: event.target.value }));
                setFormErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              aria-invalid={Boolean(formErrors.phone)}
            />
            {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
          </label>

          <label>
            Puesto
            <input
              type="text"
              value={formValues.position}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, position: event.target.value }));
                setFormErrors((prev) => ({ ...prev, position: undefined }));
              }}
              aria-invalid={Boolean(formErrors.position)}
            />
            {formErrors.position && <span className="field-error">{formErrors.position}</span>}
          </label>

          <label>
            LinkedIn (opcional)
            <input
              type="url"
              value={formValues.linkedinUrl}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, linkedinUrl: event.target.value }));
                setFormErrors((prev) => ({ ...prev, linkedinUrl: undefined }));
              }}
              aria-invalid={Boolean(formErrors.linkedinUrl)}
            />
            {formErrors.linkedinUrl && <span className="field-error">{formErrors.linkedinUrl}</span>}
          </label>

          <label>
            URL del CV (opcional)
            <input
              type="url"
              value={formValues.resumeUrl}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, resumeUrl: event.target.value }));
                setFormErrors((prev) => ({ ...prev, resumeUrl: undefined }));
              }}
              aria-invalid={Boolean(formErrors.resumeUrl)}
            />
            {formErrors.resumeUrl && <span className="field-error">{formErrors.resumeUrl}</span>}
          </label>

          <label>
            Anos de experiencia
            <input
              type="number"
              min={0}
              step={1}
              value={formValues.yearsOfExperience}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, yearsOfExperience: event.target.value }));
                setFormErrors((prev) => ({ ...prev, yearsOfExperience: undefined }));
              }}
              aria-invalid={Boolean(formErrors.yearsOfExperience)}
            />
            {formErrors.yearsOfExperience && (
              <span className="field-error">{formErrors.yearsOfExperience}</span>
            )}
          </label>

          <label>
            Fecha de aplicacion
            <input
              type="date"
              value={formValues.appliedAt}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, appliedAt: event.target.value }));
                setFormErrors((prev) => ({ ...prev, appliedAt: undefined }));
              }}
              aria-invalid={Boolean(formErrors.appliedAt)}
            />
            {formErrors.appliedAt && <span className="field-error">{formErrors.appliedAt}</span>}
          </label>

          <div className="form-actions full-row">
            <button type="submit" className="primary-button" disabled={editLoading}>
              {editLoading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
        {editError && <p className="feedback-error" role="alert">{editError}</p>}
        {editSuccess && <p className="feedback-success" role="status">{editSuccess}</p>}
      </section>

      <nav>
        <Link className="candidate-link" href={backHref}>
          Volver al listado
        </Link>
      </nav>
    </main>
  );
}
