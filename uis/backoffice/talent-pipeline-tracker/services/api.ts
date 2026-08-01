import type {
  Candidate,
  CandidatePayload,
  CandidateStage,
  CandidateStatus,
  Note,
  NotePayload,
} from '../types/candidate';
import { apiFetch } from './httpClient';

const PLAYGROUND_API_BASE_URL = 'https://playground.4geeks.com/tracker/api/v1';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const errorData = (await response.json()) as { message?: string };
      if (errorData?.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parse failures and keep status-based error.
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
  } catch (error) {
    throw new Error(`Error fetching candidates: ${(error as Error).message}`);
  }
}

export async function getCandidateById(candidateId: string): Promise<Candidate> {
  try {
    // Reemplazado /candidates/ por /records/
    const response = await apiFetch(`/records/${candidateId}`);
    return await handleResponse<Candidate>(response);
  } catch (error) {
    throw new Error(`Error fetching candidate: ${(error as Error).message}`);
  }
}

export async function createCandidate(payload: CandidatePayload): Promise<Candidate> {
  try {
    const body: CandidatePayload = {
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      position: payload.position,
      linkedin_url: payload.linkedin_url,
      cv_url: payload.cv_url,
      experience_years: payload.experience_years,
    };

    // Reemplazado /candidates por /records
    const response = await apiFetch('/records', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });

    return await handleResponse<Candidate>(response);
  } catch (error) {
    throw new Error(`Error creating candidate: ${(error as Error).message}`);
  }
}

export async function updateCandidate(
  candidateId: string,
  payload: CandidatePayload,
): Promise<Candidate> {
  try {
    const body: CandidatePayload = {
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      position: payload.position,
      linkedin_url: payload.linkedin_url,
      cv_url: payload.cv_url,
      experience_years: payload.experience_years,
    };

    // Reemplazado /candidates/ por /records/
    const response = await apiFetch(`/records/${candidateId}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });

    return await handleResponse<Candidate>(response);
  } catch (error) {
    throw new Error(`Error updating candidate: ${(error as Error).message}`);
  }
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  try {
    // Reemplazado /candidates/ por /records/
    const response = await apiFetch(`/records/${candidateId}`, {
      method: 'DELETE',
    });

    await handleResponse<void>(response);
  } catch (error) {
    throw new Error(`Error deleting candidate: ${(error as Error).message}`);
  }
}

export async function getCandidateNotes(candidateId: string): Promise<Note[]> {
  try {
    // Reemplazado /candidates/ por /records/
    const response = await apiFetch(`/records/${candidateId}/notes`);
    const payload = await handleResponse<unknown>(response);
    return extractNotesList(payload);
  } catch (error) {
    throw new Error(`Error fetching candidate notes: ${(error as Error).message}`);
  }
}

export async function createCandidateNote(
  candidateId: string,
  payload: NotePayload,
): Promise<Note> {
  try {
    const body: NotePayload = {
      content: payload.content,
    };

    // Reemplazado /candidates/ por /records/
    const response = await apiFetch(`/records/${candidateId}/notes`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });

    return await handleResponse<Note>(response);
  } catch (error) {
    throw new Error(`Error creating candidate note: ${(error as Error).message}`);
  }
}

export async function updateCandidateStatus(
  candidateId: string,
  status: CandidateStatus,
): Promise<Candidate> {
  try {
    // Reemplazado /candidates/ por /records/
    const response = await apiFetch(`/records/${candidateId}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ status }),
    });

    return await handleResponse<Candidate>(response);
  } catch (error) {
    throw new Error(`Error updating candidate status: ${(error as Error).message}`);
  }
}

export async function updateCandidateStage(
  candidateId: string,
  stage: CandidateStage,
): Promise<Candidate> {
  try {
    // Reemplazado /candidates/ por /records/
    const response = await apiFetch(`/records/${candidateId}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ stage }),
    });

    return await handleResponse<Candidate>(response);
  } catch (error) {
    throw new Error(`Error updating candidate stage: ${(error as Error).message}`);
  }
}

export async function deleteCandidateNote(
  candidateId: string,
  noteId: string,
): Promise<void> {
  try {
    // Reemplazado /candidates/ por /records/
    const response = await apiFetch(`/records/${candidateId}/notes/${noteId}`, {
      method: 'DELETE',
    });

    await handleResponse<void>(response);
  } catch (error) {
    throw new Error(`Error deleting candidate note: ${(error as Error).message}`);
  }
}