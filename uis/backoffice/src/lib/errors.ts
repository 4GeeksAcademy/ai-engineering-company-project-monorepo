import { ApiError } from "./api";

/** A message a user can act on, whatever went wrong. `fallback` is for errors that are not API errors. */
export function describeError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  if (err.status === 0) return "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
  if (err.status >= 500) {
    const reference = err.errorId ? ` Si el problema continúa, indica esta referencia: ${err.errorId}.` : "";
    return `El servidor ha tenido un problema. Inténtalo de nuevo en unos minutos.${reference}`;
  }
  if (err.status === 403) return "No tienes permiso para hacer esto.";
  if (err.status === 404) return "No se encontró la incidencia. Puede que ya no exista.";
  if (err.status === 409)
    return "Esta acción ya no es posible porque la incidencia ha cambiado de estado. Hemos cargado los datos actuales.";
  if (err.status === 400) return "Hay datos que no son válidos. Revisa lo que has introducido e inténtalo de nuevo.";
  return err.message || fallback;
}

/**
 * The message shown next to a field the server rejected. The server speaks English and technically
 * ("title must have at least 3 characters"); the person gets plain Spanish. `known` is what the
 * form's own validation already says about that field, which is more specific when available.
 */
export function friendlyFieldError(field: string, type: string | undefined, known?: string): string {
  if (known) return known;
  if (field === "branch") return "Elige una de las oficinas de la lista.";
  if (field === "customer_email") return "Indica un email válido (ejemplo: cliente@empresa.com).";
  switch (type) {
    case "missing":
      return "Este campo es obligatorio.";
    case "enum":
      return "Elige una de las opciones de la lista.";
    case "string_too_short":
      return "Este texto es demasiado corto.";
    case "string_too_long":
      return "Este texto es demasiado largo.";
    case "string_pattern_mismatch":
      return "El formato no es válido.";
    default:
      return "Revisa este campo.";
  }
}

export const isConflict = (err: unknown) => err instanceof ApiError && err.status === 409;
export const isNotFound = (err: unknown) => err instanceof ApiError && err.status === 404;
