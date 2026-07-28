import {
  Candidate,
  CandidateNote,
  CreateCandidateInput,
  UpdateCandidateInput,
  PatchCandidateInput,
  CandidateFilters,
} from '@/types/candidate';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://playground.4geeks.com/tracker/api/v1';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData && typeof errorData === 'object') {
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      }
    } catch {
      // Si no hay cuerpo JSON en el error, mantenemos el statusText
    }
    throw new Error(errorMessage);
  }

  // Si la respuesta no tiene contenido (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Obtiene el listado de candidaturas desde la API REST (GET /records).
 */
export async function getCandidates(filters?: CandidateFilters): Promise<Candidate[]> {
  const url = new URL(`${API_BASE_URL}/records`);
  
  if (filters?.status && filters.status !== 'ALL') {
    url.searchParams.append('status', filters.status);
  }
  if (filters?.stage && filters.stage !== 'ALL') {
    url.searchParams.append('stage', filters.stage);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = await handleResponse<Candidate[] | { records: Candidate[] }>(response);
  const candidatesList = Array.isArray(data) ? data : data.records || [];

  // Filtrado adicional por búsqueda cliente (nombre o email)
  if (filters?.query && filters.query.trim() !== '') {
    const q = filters.query.toLowerCase().trim();
    return candidatesList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q)
    );
  }

  return candidatesList;
}

/**
 * Obtiene el detalle de un candidato específico (GET /records/:id).
 */
export async function getCandidateById(id: number | string): Promise<Candidate> {
  const response = await fetch(`${API_BASE_URL}/records/${id}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  return handleResponse<Candidate>(response);
}

/**
 * Registra una nueva candidatura en la API (POST /records).
 */
export async function createCandidate(data: CreateCandidateInput): Promise<Candidate> {
  const response = await fetch(`${API_BASE_URL}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Candidate>(response);
}

/**
 * Actualiza completamente los datos de una candidatura (PUT /records/:id).
 */
export async function updateCandidate(
  id: number | string,
  data: UpdateCandidateInput
): Promise<Candidate> {
  const response = await fetch(`${API_BASE_URL}/records/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Candidate>(response);
}

/**
 * Actualiza rápidamente el Estado o la Etapa de un candidato (PATCH /records/:id).
 */
export async function patchCandidateStatusStage(
  id: number | string,
  updates: PatchCandidateInput
): Promise<Candidate> {
  const response = await fetch(`${API_BASE_URL}/records/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  return handleResponse<Candidate>(response);
}

/**
 * Obtiene las notas internas de un candidato (GET /records/:id/notes).
 */
export async function getCandidateNotes(id: number | string): Promise<CandidateNote[]> {
  const response = await fetch(`${API_BASE_URL}/records/${id}/notes`, {
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = await handleResponse<CandidateNote[] | { notes: CandidateNote[] }>(response);
  return Array.isArray(data) ? data : data.notes || [];
}

/**
 * Agrega una nueva nota interna a un candidato (POST /records/:id/notes).
 */
export async function addCandidateNote(
  id: number | string,
  content: string
): Promise<CandidateNote> {
  const response = await fetch(`${API_BASE_URL}/records/${id}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  return handleResponse<CandidateNote>(response);
}

/**
 * Elimina una nota interna (DELETE /records/:id/notes/:noteId).
 */
export async function deleteCandidateNote(
  id: number | string,
  noteId: number | string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/records/${id}/notes/${noteId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  await handleResponse<void>(response);
}
