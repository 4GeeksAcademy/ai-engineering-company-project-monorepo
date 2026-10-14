function buildUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL;

  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_URL in .env.local.",
    );
  }

  const cleanBase = base.replace(/\/+$/, ""); // remove slashes at the end
  const cleanPath = path.replace(/^\/+/, ""); // remove slashes at the start
  return `${cleanBase}/${cleanPath}`;
}

type ApiFetchOptions = RequestInit & {
  allowEmpty?: boolean; // true for endpoints that may return no body (e.g. DELETE)
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { allowEmpty = false, ...init } = options;

  // keep any headers the caller passed, and add JSON headers if missing
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), { ...init, headers });
  } catch {
    throw new Error(
      "Could not reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status} ${response.statusText}).`,
    );
  }

  const text = await response.text();

  if (!text) {
    if (allowEmpty) return undefined as T;
    throw new Error("The server returned an empty response.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The server returned an invalid response.");
  }
}
