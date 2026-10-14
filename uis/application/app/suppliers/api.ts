import type { Supplier, SupplierInput, SupplierStatus } from "./types";

const BASE_URL = "/api/suppliers";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    throw new Error(await extractError(response));
  }

  return (response.status === 204 ? undefined : await response.json()) as T;
}

async function extractError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((err: { loc?: (string | number)[]; msg: string }) => {
          const field = err.loc?.filter((part) => part !== "body").join(".");
          return field ? `${field}: ${err.msg}` : err.msg;
        })
        .join(" · ");
    }
  } catch {
    // Non-JSON error body: fall through to generic message.
  }
  return `Error ${response.status}`;
}

export function fetchSuppliers(): Promise<Supplier[]> {
  return request<Supplier[]>(BASE_URL, { cache: "no-store" });
}

export function createSupplier(data: SupplierInput): Promise<Supplier> {
  return request<Supplier>(BASE_URL, { method: "POST", body: JSON.stringify(data) });
}

export function updateRate(id: number, rate_per_unit: number): Promise<Supplier> {
  return request<Supplier>(`${BASE_URL}/${id}/rate`, {
    method: "PATCH",
    body: JSON.stringify({ rate_per_unit }),
  });
}

export function updateStatus(id: number, status: SupplierStatus): Promise<Supplier> {
  return request<Supplier>(`${BASE_URL}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
