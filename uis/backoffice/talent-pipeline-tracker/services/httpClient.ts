const API_BASE_URL = 'https://crispy-space-goggles-qxjqwvjvw4qc9r5g-3001.app.github.dev';
const AUTH_TOKEN_STORAGE_KEY = 'trackflow_token';
const LOGIN_PATH = '/login';

interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
}

function resolveEndpointUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

export function logout(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);

  if (window.location.pathname !== LOGIN_PATH) {
    window.location.assign(LOGIN_PATH);
  }
}

export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuth = false, headers, ...restOptions } = options;
  const requestHeaders = new Headers(headers ?? undefined);

  if (!skipAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  if (
    restOptions.body &&
    !(restOptions.body instanceof FormData) &&
    !requestHeaders.has('Content-Type')
  ) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(resolveEndpointUrl(endpoint), {
    ...restOptions,
    headers: requestHeaders,
  });

  if (response.status === 401) {
    logout();
  }

  return response;
}
