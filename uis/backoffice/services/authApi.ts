const API_BASE_URL = 'https://crispy-space-goggles-qxjqwvjvw4qc9r5g-3001.app.github.dev';
const AUTH_TOKEN_STORAGE_KEY = 'trackflow_token';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  name?: string;
  phone?: string;
  address?: string;
}

interface LoginResponse {
  token?: string;
  access_token?: string;
  jwt?: string;
}

interface ApiErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

function getErrorMessage(payload: ApiErrorResponse | null, fallback: string): string {
  if (!payload) {
    return fallback;
  }

  return payload.detail || payload.message || payload.error || fallback;
}

async function parseErrorResponse(response: Response): Promise<ApiErrorResponse | null> {
  try {
    return (await response.json()) as ApiErrorResponse;
  } catch {
    return null;
  }
}

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setSessionToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearSessionToken(): void {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function logout(): void {
  if (typeof window === 'undefined') {
    return;
  }

  clearSessionToken();
  window.location.assign('/login');
}

export function isTokenValid(token: string): boolean {
  if (!token.trim()) {
    return false;
  }

  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return false;
  }

  try {
    const normalizedPayload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = atob(normalizedPayload);
    const payload = JSON.parse(decodedPayload) as { exp?: number };

    if (!payload.exp) {
      return true;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp > nowInSeconds;
  } catch {
    return false;
  }
}

export async function login(payload: LoginPayload): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseData = (await response.json()) as LoginResponse & ApiErrorResponse;

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Credenciales invalidas.');
    }

    throw new Error(getErrorMessage(responseData, 'No fue posible iniciar sesion.'));
  }

  const token = responseData.token || responseData.access_token || responseData.jwt;

  if (!token) {
    throw new Error('La respuesta de autenticacion no incluye un token valido.');
  }

  return token;
}

export async function register(payload: RegisterPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await parseErrorResponse(response);

    if (response.status === 409) {
      throw new Error(getErrorMessage(errorData, 'El email ya esta registrado.'));
    }

    throw new Error(getErrorMessage(errorData, 'No fue posible crear la cuenta.'));
  }
}
