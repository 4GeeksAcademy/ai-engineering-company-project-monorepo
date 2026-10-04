export const CATEGORIES = [
  "medical_supplies",
  "laboratory_services",
  "pharmaceutical",
  "clinical_software",
  "it_infrastructure",
  "hr_and_payroll_software",
  "cleaning_and_facilities",
  "patient_communication",
  "billing_and_coding_software",
  "training_platforms",
] as const

export const STATUSES = ["active", "suspended"] as const
export const COUNTRIES = ["USA", "UK"] as const

export type Category = (typeof CATEGORIES)[number]
export type SupplierStatus = (typeof STATUSES)[number]
export type Country = (typeof COUNTRIES)[number]
export type Currency = "USD" | "GBP"
export type ComplianceAgreement = "BAA" | "DPA" | "both"

export type Supplier = {
  id: number
  name: string
  country: Country
  categories: Category[]
  monthly_rate: number
  currency: Currency
  updated_at: string
  status: SupplierStatus
  compliance_agreement: ComplianceAgreement | null
  contract_renewal_date: string | null
  contact_email: string | null
  notes: string | null
}

export type SupplierCreate = Omit<Supplier, "id" | "updated_at">

export function currencyForCountry(country: Country): Currency {
  return country === "USA" ? "USD" : "GBP"
}

export function formatCategory(value: string): string {
  return value.replaceAll("_", " ")
}

export function formatRate(rate: number, currency: Currency): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(rate)
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      error?: string
      detail?: string | Array<{ msg?: string }>
    }
    if (typeof payload.detail === "string") return payload.detail
    if (Array.isArray(payload.detail)) {
      const messages = payload.detail
        .map((item) => item.msg)
        .filter((item): item is string => Boolean(item))
      if (messages.length) return messages.join(" ")
    }
    if (payload.error) return payload.error
  } catch {
    /* ignore parse errors */
  }
  return `Request failed (${response.status})`
}

function queryString(params: { country?: string; category?: string }): string {
  const search = new URLSearchParams()
  if (params.country) search.set("country", params.country)
  if (params.category) search.set("category", params.category)
  const value = search.toString()
  return value ? `?${value}` : ""
}

export async function listSuppliers(params: {
  country?: string
  category?: string
}): Promise<Supplier[]> {
  const response = await fetch(`/api/suppliers${queryString(params)}`)
  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()) as Supplier[]
}

export async function createSupplier(body: SupplierCreate): Promise<Supplier> {
  const response = await fetch("/api/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()) as Supplier
}

export async function updateSupplierRate(
  id: number,
  monthly_rate: number,
): Promise<Supplier> {
  const response = await fetch(`/api/suppliers/${id}/rate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ monthly_rate }),
  })
  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()) as Supplier
}

export async function updateSupplierStatus(
  id: number,
  status: SupplierStatus,
): Promise<Supplier> {
  const response = await fetch(`/api/suppliers/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()) as Supplier
}
