// Mirrors GET /auth/me (services/api/auth/schemas.py, MeOut) — keep in sync manually.
export type Role = "admin" | "manager" | "user";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
}

export interface Me {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  profile: Profile;
}

// Mirrors PUT /profiles/me (services/api/profiles/schemas.py, ProfileUpdate): omitted = unchanged,
// null = cleared (not allowed for name).
export interface ProfileUpdate {
  name?: string;
  phone?: string | null;
  address?: string | null;
}

// Mirrors POST /users (services/api/users/schemas.py, UserCreate / SignUpOut).
export interface SignUpPayload {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
}

export interface SignUpOut {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  message: string;
}
