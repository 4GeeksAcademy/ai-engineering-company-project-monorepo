import { Candidate, CandidateDetail, Note } from '../types/candidate';
import { ApiError, statusMessage } from '../utils/errors';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
).replace(/\/$/, '');

/** Requests are aborted after this long. */
const TIMEOUT_MS = 15_000;

/**
 * fetch + JSON for the records API. Every failure becomes an ApiError whose
 * message is "<action>. <reason>" in plain Spanish; the server's own text, status
 * codes and browser errors ("Failed to fetch") never reach the UI.
 */
async function fetchJson<T>(url: string, action: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (error) {
    const kind = error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'network';
    throw new ApiError(`${action}. ${statusMessage(0, kind)}`, 0, kind);
  }

  if (!response.ok) {
    throw new ApiError(`${action}. ${statusMessage(response.status)}`, response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(`${action}. ${statusMessage(response.status, 'parse')}`, response.status, 'parse');
  }
}

/**
 * Obtener listado completo de candidaturas (GET /records)
 */
export async function getCandidates(options?: RequestInit): Promise<Candidate[]> {
  const data = await fetchJson<
    Candidate[] | { data: Candidate[] } | { records: Candidate[] }
  >(`${API_BASE_URL}/records`, 'No se pudieron cargar las candidaturas', options);

  if (Array.isArray(data)) {
    return data;
  }
  if ('data' in data && Array.isArray(data.data)) {
    return data.data;
  }
  if ('records' in data && Array.isArray(data.records)) {
    return data.records;
  }
  return [];
}

/**
 * Crear candidatura (POST /records)
 */
export async function createCandidate(
  data: Partial<Candidate>
): Promise<CandidateDetail> {
  const newCandidate = await fetchJson<
    CandidateDetail | { data: CandidateDetail } | { record: CandidateDetail }
  >(`${API_BASE_URL}/records`, 'No se pudo crear la candidatura', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if ('data' in newCandidate && newCandidate.data) {
    return newCandidate.data;
  }
  if ('record' in newCandidate && newCandidate.record) {
    return newCandidate.record;
  }
  return newCandidate as CandidateDetail;
}

/**
 * Obtener detalle de candidatura por ID (GET /records/:id)
 */
export async function getCandidateById(id: string): Promise<CandidateDetail> {
  if (!id) {
    throw new Error('ID de candidato requerido.');
  }
  const data = await fetchJson<
    CandidateDetail | { data: CandidateDetail } | { record: CandidateDetail }
  >(`${API_BASE_URL}/records/${encodeURIComponent(id)}`, 'No se pudo cargar el candidato');

  if ('data' in data && data.data) {
    return data.data;
  }
  if ('record' in data && data.record) {
    return data.record;
  }
  return data as CandidateDetail;
}

/**
 * Actualizar candidatura (PATCH / PUT /records/:id)
 */
export async function updateCandidate(
  id: string,
  data: Partial<Candidate>,
  method: 'PATCH' | 'PUT' = 'PATCH'
): Promise<CandidateDetail> {
  if (!id) {
    throw new Error('ID de candidato requerido.');
  }
  const updatedData = await fetchJson<
    CandidateDetail | { data: CandidateDetail } | { record: CandidateDetail }
  >(`${API_BASE_URL}/records/${encodeURIComponent(id)}`, 'No se pudo actualizar la candidatura', {
    method,
    body: JSON.stringify(data),
  });

  if ('data' in updatedData && updatedData.data) {
    return updatedData.data;
  }
  if ('record' in updatedData && updatedData.record) {
    return updatedData.record;
  }
  return updatedData as CandidateDetail;
}

/**
 * Obtener notas de una candidatura (GET /records/:id/notes)
 */
export async function getNotes(candidateId: string): Promise<Note[]> {
  if (!candidateId) {
    throw new Error('ID de candidato requerido.');
  }
  const data = await fetchJson<
    Note[] | { data: Note[] } | { notes: Note[] }
  >(`${API_BASE_URL}/records/${encodeURIComponent(candidateId)}/notes`, 'No se pudieron cargar las notas');

  if (Array.isArray(data)) {
    return data;
  }
  if ('data' in data && Array.isArray(data.data)) {
    return data.data;
  }
  if ('notes' in data && Array.isArray(data.notes)) {
    return data.notes;
  }
  return [];
}

/**
 * Crear nota para una candidatura (POST /records/:id/notes)
 */
export async function createNote(
  candidateId: string,
  content: string
): Promise<Note> {
  if (!candidateId) {
    throw new Error('ID de candidato requerido.');
  }
  if (!content.trim()) {
    throw new Error('El contenido de la nota no puede estar vacío.');
  }
  const newNote = await fetchJson<
    Note | { data: Note } | { note: Note }
  >(`${API_BASE_URL}/records/${encodeURIComponent(candidateId)}/notes`, 'No se pudo guardar la nota', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

  if ('data' in newNote && newNote.data) {
    return newNote.data;
  }
  if ('note' in newNote && newNote.note) {
    return newNote.note;
  }
  return newNote as Note;
}

/**
 * Eliminar nota de una candidatura (DELETE /records/:id/notes/:note_id)
 */
export async function deleteNote(
  candidateId: string,
  noteId: string
): Promise<void> {
  if (!candidateId || !noteId) {
    throw new Error('ID de candidato y ID de nota requeridos.');
  }
  await fetchJson<void>(
    `${API_BASE_URL}/records/${encodeURIComponent(candidateId)}/notes/${encodeURIComponent(noteId)}`,
    'No se pudo eliminar la nota',
    {
      method: 'DELETE',
    }
  );
}
