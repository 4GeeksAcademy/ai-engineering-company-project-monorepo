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
