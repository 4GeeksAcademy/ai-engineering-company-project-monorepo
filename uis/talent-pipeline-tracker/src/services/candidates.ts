import { Candidate, CandidateDetail, Note } from '../types/candidate';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
).replace(/\/$/, '');

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // No JSON body
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Obtener listado completo de candidaturas (GET /records)
 */
export async function getCandidates(): Promise<Candidate[]> {
  try {
    const data = await fetchJson<
      Candidate[] | { data: Candidate[] } | { records: Candidate[] }
    >(`${API_BASE_URL}/records`);

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
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener candidaturas: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener candidaturas.');
  }
}

/**
 * Crear candidatura (POST /records)
 */
export async function createCandidate(
  data: Partial<Candidate>
): Promise<CandidateDetail> {
  try {
    const newCandidate = await fetchJson<
      CandidateDetail | { data: CandidateDetail } | { record: CandidateDetail }
    >(`${API_BASE_URL}/records`, {
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
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al crear candidatura: ${error.message}`);
    }
    throw new Error('Error desconocido al crear candidatura.');
  }
}

/**
 * Obtener detalle de candidatura por ID (GET /records/:id)
 */
export async function getCandidateById(id: string): Promise<CandidateDetail> {
  if (!id) {
    throw new Error('ID de candidato requerido.');
  }
  try {
    const data = await fetchJson<
      CandidateDetail | { data: CandidateDetail } | { record: CandidateDetail }
    >(`${API_BASE_URL}/records/${encodeURIComponent(id)}`);

    if ('data' in data && data.data) {
      return data.data;
    }
    if ('record' in data && data.record) {
      return data.record;
    }
    return data as CandidateDetail;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener el candidato: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener el candidato.');
  }
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
  try {
    const updatedData = await fetchJson<
      CandidateDetail | { data: CandidateDetail } | { record: CandidateDetail }
    >(`${API_BASE_URL}/records/${encodeURIComponent(id)}`, {
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
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al actualizar la candidatura: ${error.message}`);
    }
    throw new Error('Error desconocido al actualizar la candidatura.');
  }
}

/**
 * Obtener notas de una candidatura (GET /records/:id/notes)
 */
export async function getNotes(candidateId: string): Promise<Note[]> {
  if (!candidateId) {
    throw new Error('ID de candidato requerido.');
  }
  try {
    const data = await fetchJson<
      Note[] | { data: Note[] } | { notes: Note[] }
    >(`${API_BASE_URL}/records/${encodeURIComponent(candidateId)}/notes`);

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
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al cargar las notas: ${error.message}`);
    }
    throw new Error('Error desconocido al cargar las notas.');
  }
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
  try {
    const newNote = await fetchJson<
      Note | { data: Note } | { note: Note }
    >(`${API_BASE_URL}/records/${encodeURIComponent(candidateId)}/notes`, {
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
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al crear la nota: ${error.message}`);
    }
    throw new Error('Error desconocido al crear la nota.');
  }
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
  try {
    await fetchJson<void>(
      `${API_BASE_URL}/records/${encodeURIComponent(candidateId)}/notes/${encodeURIComponent(noteId)}`,
      {
        method: 'DELETE',
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al eliminar la nota: ${error.message}`);
    }
    throw new Error('Error desconocido al eliminar la nota.');
  }
}
