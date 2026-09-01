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
