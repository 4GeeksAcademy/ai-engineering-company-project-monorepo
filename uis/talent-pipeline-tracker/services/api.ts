const BASE_URL =
  process.env.NEXT_PUBLIC_TRACKER_API_BASE_URL ?? "https://playground.4geeks.com/tracker/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json();

    if (typeof payload?.detail === "string") {
      return payload.detail;
    }

    if (Array.isArray(payload?.detail) && payload.detail.length > 0) {
      return payload.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(". ");
    }

    return `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
