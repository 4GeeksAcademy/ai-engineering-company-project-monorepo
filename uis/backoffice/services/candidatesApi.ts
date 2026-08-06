import type {
  Candidate,
  CandidatePayload,
  CandidateStage,
  CandidateStatus,
  Note,
  NotePayload,
} from '../types/candidate';

const PLAYGROUND_API_BASE_URL = 'https://playground.4geeks.com/tracker/api/v1';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const FALLBACK_ERROR_MESSAGE = 'No pudimos procesar la solicitud. Intenta nuevamente en unos minutos.';

function isReadableServerMessage(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const blockedTokens = ['unexpected token', 'request failed with status', 'traceback', 'syntaxerror'];
  return !blockedTokens.some((token) => normalized.includes(token));
}

function getOperationFallback(operation: string): string {
  return `No fue posible ${operation}.`;
}

function extractCandidatesList(payload: unknown): Candidate[] {
  if (Array.isArray(payload)) {
    return payload as Candidate[];
  }

  if (payload && typeof payload === 'object') {
    const wrappedPayload = payload as {
      data?: unknown;
      results?: unknown;
      items?: unknown;
      records?: unknown;
      candidates?: unknown;
    };

    const possibleLists = [
      wrappedPayload.data,
      wrappedPayload.results,
      wrappedPayload.items,
      wrappedPayload.records,
      wrappedPayload.candidates,
    ];

    const firstList = possibleLists.find((value) => Array.isArray(value));
    if (Array.isArray(firstList)) {
      return firstList as Candidate[];
    }
  }

  return [];
}

function extractNotesList(payload: unknown): Note[] {
  if (Array.isArray(payload)) {
    return payload as Note[];
  }

  if (payload && typeof payload === 'object') {
    const wrappedPayload = payload as {
      data?: unknown;
      results?: unknown;
      items?: unknown;
      notes?: unknown;
    };

    const possibleLists = [
      wrappedPayload.data,
      wrappedPayload.results,
      wrappedPayload.items,
      wrappedPayload.notes,
    ];

    const firstList = possibleLists.find((value) => Array.isArray(value));
    if (Array.isArray(firstList)) {
      return firstList as Note[];
    }
  }

  return [];
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = FALLBACK_ERROR_MESSAGE;

    try {
      const errorData = (await response.json()) as { message?: string; error?: string };
      if (isReadableServerMessage(errorData?.message)) {
        errorMessage = errorData.message;
      } else if (isReadableServerMessage(errorData?.error)) {
        errorMessage = errorData.error;
      }
    } catch {
      // Keep fallback message when body is not JSON.
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getCandidates(): Promise<Candidate[]> {
  try {
    const response = await fetch(`${PLAYGROUND_API_BASE_URL}/records`);
    const payload = await handleResponse<unknown>(response);
    return extractCandidatesList(payload);
  } catch {
    throw new Error(getOperationFallback('cargar las candidaturas'));
  }
}

export async function getCandidateById(candidateId: string): Promise<Candidate> {
  try {
    const response = await fetch(`${PLAYGROUND_API_BASE_URL}/records/${candidateId}`);
    return await handleResponse<Candidate>(response);
  } catch {
    throw new Error(getOperationFallback('cargar la candidatura'));
  }
}

export async function createCandidate(payload: CandidatePayload): Promise<Candidate> {
  try {
    const response = await fetch(`${PLAYGROUND_API_BASE_URL}/records`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });

    return await handleResponse<Candidate>(response);
  } catch {
    throw new Error(getOperationFallback('crear la candidatura'));
  }
}

export async function updateCandidate(
  candidateId: string,
  payload: CandidatePayload,
): Promise<Candidate> {
  try {
    const response = await fetch(`${PLAYGROUND_API_BASE_URL}/records/${candidateId}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });

    return await handleResponse<Candidate>(response);
  } catch {
    throw new Error(getOperationFallback('actualizar la candidatura'));
  }
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  try {
    const response = await fetch(`${PLAYGROUND_API_BASE_URL}/records/${candidateId}`, {
      method: 'DELETE',
    });

    await handleResponse<void>(response);
  } catch {
    throw new Error(getOperationFallback('eliminar la candidatura'));
  }
}

export async function getCandidateNotes(candidateId: string): Promise<Note[]> {
  try {
    const response = await fetch(`${PLAYGROUND_API_BASE_URL}/records/${candidateId}/notes`);
    const payload = await handleResponse<unknown>(response);
    return extractNotesList(payload);
  } catch {
    throw new Error(getOperationFallback('cargar las notas'));
  }
}

export async function createCandidateNote(
  candidateId: string,
  payload: NotePayload,
): Promise<Note> {
  try {
    const response = await fetch(`${PLAYGROUND_API_BASE_URL}/records/${candidateId}/notes`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });

    return await handleResponse<Note>(response);
  } catch {
    throw new Error(getOperationFallback('crear la nota'));
  }
}

export async function updateCandidateStatus(
  candidateId: string,
  status: CandidateStatus,
): Promise<Candidate> {
  try {
    const response = await fetch(`${PLAYGROUND_API_BASE_URL}/records/${candidateId}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ status }),
    });

    return await handleResponse<Candidate>(response);
  } catch {
    throw new Error(getOperationFallback('actualizar el estado'));
  }
}

export async function updateCandidateStage(
  candidateId: string,
  stage: CandidateStage,
): Promise<Candidate> {
  try {
    const response = await fetch(`${PLAYGROUND_API_BASE_URL}/records/${candidateId}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ stage }),
    });

    return await handleResponse<Candidate>(response);
  } catch {
    throw new Error(getOperationFallback('actualizar la etapa'));
  }
}

export async function deleteCandidateNote(
  candidateId: string,
  noteId: string,
): Promise<void> {
  try {
    const response = await fetch(`${PLAYGROUND_API_BASE_URL}/records/${candidateId}/notes/${noteId}`, {
      method: 'DELETE',
    });

    await handleResponse<void>(response);
  } catch {
    throw new Error(getOperationFallback('eliminar la nota'));
  }
}
