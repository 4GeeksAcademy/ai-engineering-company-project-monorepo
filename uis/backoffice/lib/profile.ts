import {
  authenticatedFetch,
  AuthenticationRequiredError,
} from "@/lib/authenticated-fetch";

export const PROFILE_UPDATED_EVENT = "brasaland:profile-updated";

export interface Profile {
  id: number;
  user_id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
}

interface CurrentUser {
  email: string;
}

interface ApiEnvelope<T> {
  data: T;
  message: string;
  success: boolean;
}

interface ValidationIssue {
  loc?: Array<string | number>;
  msg?: string;
}

interface ApiErrorPayload {
  detail?: string | ValidationIssue[];
  message?: string;
}

export interface ProfileUpdate {
  name: string | null;
  phone: string | null;
  address: string | null;
}

export class ProfileRequestError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ProfileRequestError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await authenticatedFetch(url, init);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      throw new ProfileRequestError("Please sign in to view your profile.", 401);
    }
    throw new ProfileRequestError("Unable to connect to the profile service.", 0);
  }

  const payload = (await response.json().catch(() => ({}))) as
    | ApiEnvelope<T>
    | ApiErrorPayload;

  if (response.ok) {
    return (payload as ApiEnvelope<T>).data;
  }

  const errorPayload = payload as ApiErrorPayload;
  const fieldErrors: Record<string, string> = {};

  if (Array.isArray(errorPayload.detail)) {
    for (const issue of errorPayload.detail) {
      const field = issue.loc?.at(-1);
      if (typeof field === "string" && issue.msg) {
        fieldErrors[field] = issue.msg.replace(/^Value error,\s*/i, "");
      }
    }
  }

  const message =
    typeof errorPayload.detail === "string"
      ? errorPayload.detail
      : errorPayload.message ?? "The profile request could not be completed.";

  throw new ProfileRequestError(message, response.status, fieldErrors);
}

export async function getCurrentAccount() {
  const [user, profile] = await Promise.all([
    request<CurrentUser>("/api/proxy/auth/me"),
    request<Profile>("/api/proxy/profiles/me"),
  ]);

  return { email: user.email, profile };
}

export async function updateCurrentProfile(profile: ProfileUpdate) {
  const updatedProfile = await request<Profile>("/api/proxy/profiles/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });

  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
  return updatedProfile;
}