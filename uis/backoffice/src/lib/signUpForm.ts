// Sign-up form rules, moved out of views/RegisterPage.tsx so they can be tested on their own.
import { ApiError } from "./api";
import { validateProfileFields } from "./profileFields";

// Same limits as the API (services/api/users/schemas.py, UserCreate); the profile ones live in ./profileFields.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX_BYTES = 72;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Field = "email" | "password" | "confirmPassword" | "name" | "phone" | "address";
export type FieldErrors = Partial<Record<Field, string>>;
export type Form = Record<Field, string>;

export const emptyForm: Form = { email: "", password: "", confirmPassword: "", name: "", phone: "", address: "" };

export function validateSignUp(form: Form): FieldErrors {
  const errors: FieldErrors = {};
  const email = form.email.trim();
  if (!email) errors.email = "El email es obligatorio.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "El email no es válido.";

  if (!form.password) errors.password = "La contraseña es obligatoria.";
  else if (form.password.length < PASSWORD_MIN)
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  else if (new TextEncoder().encode(form.password).length > PASSWORD_MAX_BYTES)
    errors.password = `La contraseña es demasiado larga (máximo ${PASSWORD_MAX_BYTES} bytes).`;

  if (form.confirmPassword !== form.password) errors.confirmPassword = "Las contraseñas no coinciden.";

  return { ...errors, ...validateProfileFields(form, { nameRequired: false }) };
}

/** Translates the API's rejection into per-field messages where possible, plus a general one. */
export function signUpErrorFromApi(err: unknown): { fields: FieldErrors; general: string | null } {
  if (!(err instanceof ApiError)) {
    return { fields: {}, general: "No se pudo crear la cuenta. Comprueba tu conexión e inténtalo de nuevo." };
  }
  if (err.status === 409) return { fields: { email: "Ya existe una cuenta con ese email." }, general: null };
  if (err.status === 422) {
    const fields: FieldErrors = {};
    const unknown: string[] = [];
    for (const [field, message] of Object.entries(err.fieldErrors)) {
      if (field in emptyForm) fields[field as Field] = message;
      else unknown.push(message);
    }
    const general =
      unknown.length || !Object.keys(fields).length ? `Revisa los datos del formulario. ${unknown.join(" ")}`.trim() : null;
    return { fields, general };
  }
  return { fields: {}, general: "No se pudo crear la cuenta. Inténtalo de nuevo." };
}
