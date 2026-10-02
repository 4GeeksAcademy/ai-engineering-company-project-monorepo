import type { Supplier, SupplierCreate, SupplierStatus } from "./types";

// Vacío = mismo origen: en desarrollo el proxy de Vite reenvía /api a la API local (routes/suppliers.py).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((e: { loc?: unknown[]; msg?: string }) => {
          const field = e.loc?.slice(1).join(".");
          const message = (e.msg ?? "").replace(/^Value error, /, "");
          return field ? `${field}: ${message}` : message;
        })
        .join("; ");
    }
    return response.statusText;
  } catch {
    return response.statusText;
  }
}

async function suppliersRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/suppliers${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response), response.status);
  }
  return response.json();
}

export const listSuppliers = () => suppliersRequest<Supplier[]>("");

export const createSupplier = (payload: SupplierCreate) =>
  suppliersRequest<Supplier>("", { method: "POST", body: JSON.stringify(payload) });

export const updateSupplierRate = (id: number, monthly_rate: number) =>
  suppliersRequest<Supplier>(`/${id}/rate`, { method: "PATCH", body: JSON.stringify({ monthly_rate }) });

export const setSupplierStatus = (id: number, status: SupplierStatus) =>
  suppliersRequest<Supplier>(`/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
