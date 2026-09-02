// ──────────────────────────────────────────────
// Auth helpers — Bearer token & 401 handling
// ──────────────────────────────────────────────

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

function dispatchAuthExpired() {
  localStorage.removeItem('auth_token')
  window.dispatchEvent(new CustomEvent('auth:expired'))
}

type AuthFetchOptions = RequestInit & {
  requireAuth?: boolean
}

async function authFetch(
  url: string,
  options: AuthFetchOptions = {},
): Promise<Response> {
  const { requireAuth = true, ...init } = options
  const token = getAuthToken()

  if (requireAuth && !token) {
    throw new Error('Authentication required')
  }

  const headers = new Headers(init.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, { ...init, headers })

  if (response.status === 401) {
    dispatchAuthExpired()
    throw new Error('Session expired')
  }

  return response
}

export type Country = 'USA' | 'Spain'

export type SupplierCategory =
  | 'carrier_last_mile'
  | 'carrier_international'
  | 'warehouse_supplies'
  | 'packaging_materials'
  | 'reverse_logistics'
  | 'fleet_maintenance'
  | 'it_and_wms_software'
  | 'cleaning_and_facilities'

export type Supplier = {
  id: number
  name: string
  country: Country
  categories: SupplierCategory[]
  rate_per_shipment: number
  currency: 'USD' | 'EUR'
  updated_at: string
  status: 'active' | 'suspended'
  service_zone: string | null
  contact_email: string | null
  notes: string | null
}

export type SupplierFilters = {
  country?: Country
  category?: SupplierCategory
}

export async function getSuppliers(
  filters: SupplierFilters = {},
): Promise<Supplier[]> {
  const params = new URLSearchParams()

  if (filters.country) {
    params.set('country', filters.country)
  }

  if (filters.category) {
    params.set('category', filters.category)
  }

  const query = params.toString()

  const url = query
    ? `/api/suppliers?${query}`
    : '/api/suppliers'

  // GET /suppliers requires Bearer token
  const response = await authFetch(url, { requireAuth: true })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export type SupplierCreateInput = {
  name: string
  country: Country
  categories: SupplierCategory[]
  rate_per_shipment: number
  currency: 'USD' | 'EUR'
  status: 'active' | 'suspended'
  service_zone?: string | null
  contact_email?: string | null
  notes?: string | null
}

async function parseApiError(response: Response) {
  try {
    const data = await response.json()
    return JSON.stringify(data.detail ?? data)
  } catch {
    return `API error: ${response.status}`
  }
}

export async function createSupplier(
  supplier: SupplierCreateInput,
): Promise<Supplier> {
  const response = await authFetch('/api/suppliers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(supplier),
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response))
  }

  return response.json()
}

export async function updateSupplierRate(
  id: number,
  ratePerShipment: number,
): Promise<Supplier> {
  const response = await authFetch(`/api/suppliers/${id}/rate`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rate_per_shipment: ratePerShipment,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response))
  }

  return response.json()
}

export async function updateSupplierStatus(
  id: number,
  status: 'active' | 'suspended',
): Promise<Supplier> {
  const response = await authFetch(`/api/suppliers/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response))
  }

  return response.json()
}

// ──────────────────────────────────────────────
// Incidents
// ──────────────────────────────────────────────

export type IncidentCategory =
  | 'lost_parcel'
  | 'delivery_failure'
  | 'inventory_discrepancy'
  | 'carrier_issue'
  | 'returns_issue'
  | 'warehouse_incident'
  | 'system_failure'
  | 'client_complaint'
  | 'other'

export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'discarded'

export type IncidentOrigin = 'customer' | 'branch' | 'internal'

export type IncidentBranch =
  | 'central'
  | 'la_warehouse'
  | 'la_office'
  | 'zaragoza_warehouse'
  | 'zaragoza_office'

export type Incident = {
  id: number
  title: string
  description: string
  category: IncidentCategory
  status: IncidentStatus
  origin: IncidentOrigin
  branch: IncidentBranch
  created_at: string
  updated_at: string
}

export type IncidentCreatePayload = {
  title: string
  description: string
  category: IncidentCategory
  origin: IncidentOrigin
  branch: IncidentBranch
  status?: IncidentStatus
}

export type IncidentFilters = {
  status?: IncidentStatus
  origin?: IncidentOrigin
  branch?: IncidentBranch
  category?: IncidentCategory
}

export type IncidentSummary = {
  total: number
  by_status: Record<IncidentStatus, number>
  by_category: Record<IncidentCategory, number>
  by_origin: Record<IncidentOrigin, number>
  by_branch: Record<IncidentBranch, number>
}

export const INCIDENT_STATUSES: IncidentStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'discarded',
]

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  'lost_parcel',
  'delivery_failure',
  'inventory_discrepancy',
  'carrier_issue',
  'returns_issue',
  'warehouse_incident',
  'system_failure',
  'client_complaint',
  'other',
]

export const INCIDENT_ORIGINS: IncidentOrigin[] = ['customer', 'branch', 'internal']

export const INCIDENT_BRANCHES: IncidentBranch[] = [
  'central',
  'la_warehouse',
  'la_office',
  'zaragoza_warehouse',
  'zaragoza_office',
]

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  discarded: 'Discarded',
}

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  lost_parcel: 'Lost parcel',
  delivery_failure: 'Delivery failure',
  inventory_discrepancy: 'Inventory discrepancy',
  carrier_issue: 'Carrier issue',
  returns_issue: 'Returns issue',
  warehouse_incident: 'Warehouse incident',
  system_failure: 'System failure',
  client_complaint: 'Client complaint',
  other: 'Other',
}

export const INCIDENT_ORIGIN_LABELS: Record<IncidentOrigin, string> = {
  customer: 'Customer',
  branch: 'Branch',
  internal: 'Internal',
}

// Exact branch labels required by CONTEXT — never invent alternatives.
export const INCIDENT_BRANCH_LABELS: Record<IncidentBranch, string> = {
  central: 'Central',
  la_warehouse: 'Los Ángeles — Almacén',
  la_office: 'Los Ángeles — Oficina',
  zaragoza_warehouse: 'Zaragoza — Almacén',
  zaragoza_office: 'Zaragoza — Oficina',
}

// Mirrors the backend's allowed lifecycle transitions.
export const INCIDENT_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['in_progress', 'discarded'],
  in_progress: ['resolved', 'discarded'],
  resolved: [],
  discarded: [],
}

export class IncidentValidationError extends Error {
  field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'IncidentValidationError'
    this.field = field
  }
}

async function raiseIncidentError(response: Response): Promise<never> {
  let data: unknown

  try {
    data = await response.json()
  } catch {
    throw new Error(`API error: ${response.status}`)
  }

  if (
    data &&
    typeof data === 'object' &&
    'field' in data &&
    'message' in data &&
    typeof (data as Record<string, unknown>).field === 'string' &&
    typeof (data as Record<string, unknown>).message === 'string'
  ) {
    const { field, message } = data as { field: string; message: string }
    throw new IncidentValidationError(field, message)
  }

  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail
    throw new Error(typeof detail === 'string' ? detail : 'Request failed.')
  }

  throw new Error(`API error: ${response.status}`)
}

export async function getIncidents(
  filters: IncidentFilters = {},
): Promise<Incident[]> {
  const params = new URLSearchParams()

  if (filters.status) params.set('status', filters.status)
  if (filters.origin) params.set('origin', filters.origin)
  if (filters.branch) params.set('branch', filters.branch)
  if (filters.category) params.set('category', filters.category)

  const query = params.toString()
  const url = query ? `/api/incidents?${query}` : '/api/incidents'

  const response = await authFetch(url, { requireAuth: true })

  if (!response.ok) {
    await raiseIncidentError(response)
  }

  return response.json()
}

export async function getIncident(id: number): Promise<Incident> {
  const response = await authFetch(`/api/incidents/${id}`, { requireAuth: true })

  if (!response.ok) {
    await raiseIncidentError(response)
  }

  return response.json()
}

export async function createIncident(
  payload: IncidentCreatePayload,
): Promise<Incident> {
  const response = await authFetch('/api/incidents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    await raiseIncidentError(response)
  }

  return response.json()
}

export async function updateIncidentStatus(
  id: number,
  nextStatus: IncidentStatus,
): Promise<Incident> {
  const response = await authFetch(`/api/incidents/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: nextStatus }),
  })

  if (!response.ok) {
    await raiseIncidentError(response)
  }

  return response.json()
}

export async function getIncidentSummary(): Promise<IncidentSummary> {
  const response = await authFetch('/api/incidents/summary', { requireAuth: true })

  if (!response.ok) {
    await raiseIncidentError(response)
  }

  return response.json()
}
