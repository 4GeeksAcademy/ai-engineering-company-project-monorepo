"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CATEGORIES,
  COUNTRIES,
  STATUSES,
  createSupplier,
  currencyForCountry,
  formatCategory,
  formatRate,
  listSuppliers,
  type Category,
  type Country,
  type Supplier,
  type SupplierStatus,
  updateSupplierRate,
  updateSupplierStatus,
} from "@/lib/suppliers"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type FormState = {
  name: string
  country: Country
  categories: Category[]
  monthly_rate: string
  status: SupplierStatus
  compliance_agreement: "" | "BAA" | "DPA" | "both"
  contract_renewal_date: string
  contact_email: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: "",
  country: "USA",
  categories: [],
  monthly_rate: "",
  status: "active",
  compliance_agreement: "",
  contract_renewal_date: "",
  contact_email: "",
  notes: "",
}

export function SupplierDirectory({
  initialCountry = "",
  initialCategory = "",
}: {
  initialCountry?: string
  initialCategory?: string
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [country, setCountry] = useState(initialCountry)
  const [category, setCategory] = useState(initialCategory)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({})
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setListError("")
    try {
      const rows = await listSuppliers({
        country: country || undefined,
        category: category || undefined,
      })
      setSuppliers(rows)
      setRateDrafts(
        Object.fromEntries(rows.map((row) => [row.id, String(row.monthly_rate)])),
      )
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Unable to load suppliers")
    } finally {
      setLoading(false)
    }
  }, [country, category])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(
    () => ({
      total: suppliers.length,
      suspended: suppliers.filter((row) => row.status === "suspended").length,
    }),
    [suppliers],
  )

  function toggleCategory(value: Category) {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(value)
        ? current.categories.filter((item) => item !== value)
        : [...current.categories, value],
    }))
  }

  async function onRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")

    const name = form.name.trim()
    const monthlyRate = Number(form.monthly_rate)
    if (!name) {
      setFormError("Name is required.")
      return
    }
    if (form.categories.length < 1) {
      setFormError("Select at least one category.")
      return
    }
    if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) {
      setFormError("Monthly rate must be a number greater than zero.")
      return
    }

    setSubmitting(true)
    try {
      await createSupplier({
        name,
        country: form.country,
        categories: form.categories,
        monthly_rate: monthlyRate,
        currency: currencyForCountry(form.country),
        status: form.status,
        compliance_agreement: form.compliance_agreement || null,
        contract_renewal_date: form.contract_renewal_date || null,
        contact_email: form.contact_email.trim() || null,
        notes: form.notes.trim() || null,
      })
      setForm(EMPTY_FORM)
      await load()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Registration was rejected")
    } finally {
      setSubmitting(false)
    }
  }

  async function onRateSave(supplier: Supplier) {
    const nextRate = Number(rateDrafts[supplier.id])
    if (!Number.isFinite(nextRate) || nextRate <= 0) {
      setListError("Monthly rate must be a number greater than zero.")
      return
    }
    setBusyId(supplier.id)
    setListError("")
    try {
      const updated = await updateSupplierRate(supplier.id, nextRate)
      setSuppliers((rows) => rows.map((row) => (row.id === updated.id ? updated : row)))
      setRateDrafts((drafts) => ({ ...drafts, [updated.id]: String(updated.monthly_rate) }))
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Rate update failed")
    } finally {
      setBusyId(null)
    }
  }

  async function onStatusToggle(supplier: Supplier) {
    const nextStatus: SupplierStatus =
      supplier.status === "active" ? "suspended" : "active"
    setBusyId(supplier.id)
    setListError("")
    try {
      const updated = await updateSupplierStatus(supplier.id, nextStatus)
      setSuppliers((rows) => rows.map((row) => (row.id === updated.id ? updated : row)))
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Status update failed")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Supplier directory</h2>
        <p className="mt-2 text-muted-foreground">
          Central registry for clinic and technology vendors. Filter by market and
          category without leaving this page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            {loading
              ? "Loading directory"
              : `${counts.total} suppliers shown · ${counts.suspended} suspended`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="filter-country">Country</Label>
            <select
              id="filter-country"
              className={selectClassName}
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="">All countries</option>
              {COUNTRIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-category">Category</Label>
            <select
              id="filter-category"
              className={selectClassName}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {formatCategory(value)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {listError ? (
        <Alert variant="destructive">
          <AlertTitle>Directory error</AlertTitle>
          <AlertDescription>{listError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Registered suppliers</CardTitle>
          <CardDescription>
            Monthly rate and status update in place after the API responds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading suppliers…</p>
          ) : suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No suppliers match these filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Monthly rate</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className={
                      supplier.status === "suspended" ? "bg-muted/40 text-muted-foreground" : ""
                    }
                  >
                    <TableCell className="font-medium whitespace-normal">
                      {supplier.name}
                    </TableCell>
                    <TableCell>{supplier.country}</TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-wrap gap-1">
                        {supplier.categories.map((item) => (
                          <Badge key={item} variant="outline">
                            {formatCategory(item)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-40 items-center gap-2">
                        <Input
                          aria-label={`Monthly rate for ${supplier.name}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={rateDrafts[supplier.id] ?? ""}
                          onChange={(event) =>
                            setRateDrafts((drafts) => ({
                              ...drafts,
                              [supplier.id]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === supplier.id}
                          onClick={() => void onRateSave(supplier)}
                        >
                          Save
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRate(supplier.monthly_rate, supplier.currency)}
                      </p>
                    </TableCell>
                    <TableCell>{supplier.compliance_agreement ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          supplier.status === "active" ? "default" : "destructive"
                        }
                      >
                        {supplier.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={
                          supplier.status === "active" ? "destructive" : "secondary"
                        }
                        disabled={busyId === supplier.id}
                        onClick={() => void onStatusToggle(supplier)}
                      >
                        {supplier.status === "active" ? "Suspend" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Register supplier</CardTitle>
          <CardDescription>
            Required fields are validated here before the request is sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onRegister}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  className={selectClassName}
                  value={form.country}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      country: event.target.value as Country,
                    }))
                  }
                >
                  {COUNTRIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_rate">Monthly rate</Label>
                <Input
                  id="monthly_rate"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.monthly_rate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      monthly_rate: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Currency is set to {currencyForCountry(form.country)} for {form.country}.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className={selectClassName}
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as SupplierStatus,
                    }))
                  }
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Categories</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.categories.includes(value)}
                      onChange={() => toggleCategory(value)}
                    />
                    {formatCategory(value)}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="compliance">Compliance agreement</Label>
                <select
                  id="compliance"
                  className={selectClassName}
                  value={form.compliance_agreement}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      compliance_agreement: event.target.value as FormState["compliance_agreement"],
                    }))
                  }
                >
                  <option value="">Not applicable</option>
                  <option value="BAA">BAA</option>
                  <option value="DPA">DPA</option>
                  <option value="both">both</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewal">Contract renewal date</Label>
                <Input
                  id="renewal"
                  type="date"
                  value={form.contract_renewal_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contract_renewal_date: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.contact_email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contact_email: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </div>
            </div>

            {formError ? (
              <Alert variant="destructive">
                <AlertTitle>Could not register supplier</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={submitting} className="w-fit">
              {submitting ? "Registering…" : "Register supplier"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
