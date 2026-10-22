const sessionKey = 'trackflow.accessToken'

export function getSessionToken(): string | null {
  return sessionStorage.getItem(sessionKey)
}

export function saveSession(token: string): void {
  sessionStorage.setItem(sessionKey, token)
}

export function clearSession(): void {
  sessionStorage.removeItem(sessionKey)
}

export async function authRequest<Result>(path: string, options: RequestInit = {}): Promise<Result> {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
  const response = await fetch(`${base}/auth${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') {
      clearSession()
      window.location.replace('/login?session=expired')
    }
    const detail = payload?.detail
    throw new Error(typeof detail === 'string' ? detail : response.status === 422
      ? 'Revisa los campos. La nueva contraseña debe tener entre 8 caracteres y 72 bytes UTF-8.'
      : 'No se pudo completar la solicitud. Inténtalo de nuevo.')
  }
  return payload as Result
}