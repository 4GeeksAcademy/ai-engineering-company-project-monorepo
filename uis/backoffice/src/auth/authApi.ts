/**
 * API functions for authentication and user profile endpoints.
 */

export type LoginPayload = {
  email: string
  password: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
}

export type RegisterPayload = {
  email: string
  password: string
  name?: string
  phone?: string
  address?: string
}

export type UserResponse = {
  id: number
  email: string
  is_active: boolean
  role: 'admin' | 'manager' | 'user'
  created_at: string
}

export type ProfileResponse = {
  id: number
  user_id: number
  name: string | null
  phone: string | null
  address: string | null
}

export type ProfileUpdatePayload = {
  name?: string
  phone?: string
  address?: string
}

export type UserWithProfileResponse = UserResponse & {
  profile: ProfileResponse | null
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail ?? `Login failed: ${response.status}`)
  }

  return response.json()
}

export async function register(payload: RegisterPayload): Promise<UserResponse> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail ?? `Registration failed: ${response.status}`)
  }

  return response.json()
}

export async function getMe(token: string): Promise<UserWithProfileResponse> {
  const response = await fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Session expired')
  }

  return response.json()
}

export async function getProfile(token: string): Promise<ProfileResponse> {
  const response = await fetch('/api/profiles/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail ?? `Failed to load profile: ${response.status}`)
  }

  return response.json()
}

export async function updateProfile(
  token: string,
  payload: ProfileUpdatePayload,
): Promise<ProfileResponse> {
  const response = await fetch('/api/profiles/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail ?? `Failed to update profile: ${response.status}`)
  }

  return response.json()
}