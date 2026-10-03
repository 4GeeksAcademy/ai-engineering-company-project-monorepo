// Where to go after logging in. The guard sends to /login?next=<page>; login reads it back.
// Only paths inside this app are accepted: "?next=https://evil.example" or "//evil.example" would turn the
// login page into an open redirect, so anything that isn't a plain local path falls back to "/".

export function loginUrl(returnTo?: string): string {
  return returnTo && returnTo !== "/" ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
}

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

/** Reads ?next= from the current URL (browser only; call it from effects and handlers). */
export function currentReturnTo(): string {
  return safeReturnTo(new URLSearchParams(window.location.search).get("next"));
}
