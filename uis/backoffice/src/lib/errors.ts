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
  return err.message || fallback;
}

export const isConflict = (err: unknown) => err instanceof ApiError && err.status === 409;
export const isNotFound = (err: unknown) => err instanceof ApiError && err.status === 404;
