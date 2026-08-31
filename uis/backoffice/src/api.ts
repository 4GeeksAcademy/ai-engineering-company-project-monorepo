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

  const response = await fetch(url)

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
  const response = await fetch('/api/suppliers', {
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
  const response = await fetch(`/api/suppliers/${id}/rate`, {
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
  const response = await fetch(`/api/suppliers/${id}/status`, {
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
