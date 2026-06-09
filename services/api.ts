import type {
  Candidate,
  CandidatePayload,
  Note,
  NotePayload,
} from '../types/candidate';

const API_BASE_URL = 'https://playground.4geeks.com/tracker/api/v1';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

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
    const response = await fetch(`${API_BASE_URL}/candidates`);
    return await handleResponse<Candidate[]>(response);
  } catch (error) {
    throw new Error(`Error fetching candidates: ${(error as Error).message}`);
  }
}

export async function getCandidateById(candidateId: string): Promise<Candidate> {
  try {
    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}`);
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

    const response = await fetch(`${API_BASE_URL}/candidates`, {
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

    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}`, {
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
    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}`, {
      method: 'DELETE',
    });

    await handleResponse<void>(response);
  } catch (error) {
    throw new Error(`Error deleting candidate: ${(error as Error).message}`);
  }
}

export async function getCandidateNotes(candidateId: string): Promise<Note[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/notes`);
    return await handleResponse<Note[]>(response);
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

    const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}/notes`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });

    return await handleResponse<Note>(response);
  } catch (error) {
    throw new Error(`Error creating candidate note: ${(error as Error).message}`);
  }
}
