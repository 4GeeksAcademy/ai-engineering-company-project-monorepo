import { getSessionToken } from './auth'

export const categories = [
  'carrier_last_mile', 'carrier_international', 'warehouse_supplies',
  'packaging_materials', 'reverse_logistics', 'fleet_maintenance',
  'it_and_wms_software', 'cleaning_and_facilities',
] as const

export const categoryLabels: Record<Category, string> = {
  carrier_last_mile: 'Última milla',
  carrier_international: 'Transporte internacional',
  warehouse_supplies: 'Suministros de almacén',
  packaging_materials: 'Materiales de embalaje',
  reverse_logistics: 'Logística inversa',
  fleet_maintenance: 'Mantenimiento de flota',
  it_and_wms_software: 'Software IT y WMS',
  cleaning_and_facilities: 'Limpieza e instalaciones',
}

export type Category = typeof categories[number]
export type Country = 'USA' | 'Spain'
export type SupplierStatus = 'active' | 'suspended'

export interface SupplierInput {
  name: string
  country: Country
  categories: Category[]
  rate_per_shipment: number
  currency: 'USD' | 'EUR'
  status: SupplierStatus
  service_zone: string | null
  contact_email: string | null
  notes: string | null
}

export interface Supplier extends SupplierInput {
  id: number
  updated_at: string
}

const fieldLabels: Record<string, string> = {
  name: 'Nombre', country: 'País', categories: 'Categorías',
  rate_per_shipment: 'Tarifa por envío / unidad', currency: 'Moneda',
  status: 'Estado', service_zone: 'Zona de cobertura', contact_email: 'Email de contacto', notes: 'Notas',
}

export async function supplierRequest<Result>(path = '', options: RequestInit = {}): Promise<Result> {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
  const response = await fetch(`${base}/suppliers${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(getSessionToken() ? { Authorization: `Bearer ${getSessionToken()}` } : {}), ...options.headers },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const details = payload?.detail
    const message = Array.isArray(details)
      ? details.map((item: { loc: string[]; msg: string }) => `${fieldLabels[item.loc[1]] ?? item.loc[1] ?? 'Solicitud'}: ${item.msg}`).join('. ')
      : typeof details === 'string' ? details : payload?.error ?? `No se pudo completar la operación (${response.status}).`
    throw new Error(message)
  }
  return payload as Result
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo conectar con el directorio de proveedores.'
}

export function positiveRate(value: string): number {
  const rate = Number(value)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('La tarifa debe ser un número mayor que cero.')
  return rate
}