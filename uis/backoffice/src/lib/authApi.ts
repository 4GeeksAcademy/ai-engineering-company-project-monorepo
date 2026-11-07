import { ApiError, apiJson } from "@/lib/apiClient";
import { statusMessage } from "@/lib/errors";

export type ProfileFields = { name: string | null; phone: string | null; address: string | null };

export type Me = { email: string; role: "admin" | "manager" | "user"; profile: ProfileFields | null };

export type Profile = ProfileFields;

export type RegisterInput = { email: string; password: string } & Partial<ProfileFields>;

export const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  password: "Contraseña",
  name: "Nombre",
  phone: "Teléfono",
  address: "Dirección",
  current_password: "Contraseña actual",
  new_password: "Nueva contraseña",
};

/** OAuth2 password flow: the API expects a form with the email in `username`, not JSON. */
export async function login(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username: email, password });
  try {
    const { access_token } = await apiJson<{ access_token: string }>("/auth/login", {
      method: "POST",
      body,
      auth: false,
      fallback: "No se pudo iniciar sesión",
    });
    if (typeof access_token !== "string" || !access_token) {
      throw new ApiError(200, [`No se pudo iniciar sesión. ${statusMessage(200, "parse")}`], {}, "parse");
    }
    return access_token;
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) {
      throw new ApiError(401, ["Email o contraseña incorrectos."]);
    }
    throw reason;
  }
}

/** POST /users (public sign-up). A 409 means the email is taken: it is reported on the email field. */
export async function register(input: RegisterInput): Promise<void> {
  try {
    await apiJson("/users", { method: "POST", json: input, auth: false, labels: FIELD_LABELS, fallback: "No se pudo crear la cuenta" });
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 409) {
      const message = "Ya existe una cuenta con este email.";
      throw new ApiError(409, [message], { email: message });
    }
    // email-validator explains the problem in English; one Spanish line is enough here.
    if (reason instanceof ApiError && reason.fieldErrors.email) reason.fieldErrors.email = "Introduce un email válido.";
    throw reason;
  }
}

export function getMe(): Promise<Me> {
  return apiJson<Me>("/auth/me", { fallback: "No se pudo cargar tu cuenta" });
}

export function updateProfile(fields: ProfileFields): Promise<Profile> {
  return apiJson<Profile>("/profiles/me", {
    method: "PUT",
    json: fields,
    labels: FIELD_LABELS,
    fallback: "No se pudo guardar el perfil",
  });
}

/** POST /auth/forgot-password: the API answers the same whether or not the email exists. */
export async function forgotPassword(email: string): Promise<void> {
  await apiJson("/auth/forgot-password", { method: "POST", json: { email }, auth: false, fallback: "No se pudo enviar la solicitud" });
}

export const INVALID_RESET_LINK = "Este enlace no es válido, ha caducado o ya se ha usado.";

/** POST /auth/reset-password with the token from the email link. A 400 means the link cannot be used. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  try {
    await apiJson("/auth/reset-password", {
      method: "POST",
      json: { token, new_password: newPassword },
      auth: false,
      labels: FIELD_LABELS,
      fallback: "No se pudo cambiar la contraseña",
    });
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 400) throw new ApiError(400, [INVALID_RESET_LINK]);
    throw reason;
  }
}

/** POST /auth/change-password for the signed-in user. A 400 means the current password is wrong. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await apiJson("/auth/change-password", {
      method: "POST",
      json: { current_password: currentPassword, new_password: newPassword },
      labels: FIELD_LABELS,
      fallback: "No se pudo cambiar la contraseña",
    });
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 400) {
      const message = "La contraseña actual no es correcta.";
      throw new ApiError(400, [message], { current_password: message });
    }
    throw reason;
  }
}
