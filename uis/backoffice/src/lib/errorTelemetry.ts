import { track } from "@/lib/telemetry";

export type ErrorSource = "error_boundary" | "global_error" | "window_error" | "unhandled_rejection";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "dev";

/** Current page as a path: no query string, no hash (they can carry ids or tokens). */
export function currentRoute(): string {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

/** The message with numbers, hex ids and quoted values removed, so the same bug groups together. */
function normalize(message: string): string {
  return message
    .replace(/"[^"]*"|'[^']*'/g, "?")
    .replace(/\b[0-9a-f]{8,}\b/gi, "?")
    .replace(/\d+/g, "?")
    .slice(0, 200);
}

async function fingerprint(message: string): Promise<string> {
  const text = normalize(message);
  try {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    // crypto.subtle needs a secure context: fall back to a small non-cryptographic hash.
    let hash = 5381;
    for (const char of text) hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
    return hash.toString(16).padStart(8, "0");
  }
}

/**
 * Reports an uncaught error. Never the message or the stack (they can hold URLs with tokens or data):
 * only the class name, a hash of the normalized message and Next.js's own digest.
 */
export function reportError(source: ErrorSource, reason: unknown): void {
  const error = reason instanceof Error ? reason : null;
  const message = error?.message ?? (typeof reason === "string" ? reason : "");
  const digest = (error as { digest?: unknown } | null)?.digest;
  void fingerprint(message).then((hash) =>
    track("frontend_error_captured", {
      source,
      route_template: currentRoute(),
      error_name: error?.name ?? "NonError",
      fingerprint: hash,
      digest: typeof digest === "string" ? digest : undefined,
      app_version: APP_VERSION,
    }),
  );
}
