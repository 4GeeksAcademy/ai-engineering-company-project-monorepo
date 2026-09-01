import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  createSupplier,
  getSuppliers,
  updateSupplierRate,
  updateSupplierStatus,
  type Country,
  type Supplier,
  type SupplierCategory,
} from '../api'
import '../App.css'

const CATEGORIES: SupplierCategory[] = [
  'carrier_last_mile',
  'carrier_international',
  'warehouse_supplies',
  'packaging_materials',
  'reverse_logistics',
  'fleet_maintenance',
  'it_and_wms_software',
  'cleaning_and_facilities',
]

function formatCategory(category: string) {
  return category
    .split('_')
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [country, setCountry] = useState<Country | ''>('')
  const [category, setCategory] =
    useState<SupplierCategory | ''>('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rateDrafts, setRateDrafts] =
    useState<Record<number, string>>({})

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionMessage, setActionMessage] =
    useState<string | null>(null)
  const [actionError, setActionError] =
    useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newCountry, setNewCountry] =
    useState<Country>('USA')
  const [newCategory, setNewCategory] =
    useState<SupplierCategory>('carrier_last_mile')
  const [newRate, setNewRate] = useState('')
  const [newStatus, setNewStatus] =
    useState<'active' | 'suspended'>('active')
  const [newServiceZone, setNewServiceZone] = useState('')
  const [newContactEmail, setNewContactEmail] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const refreshSuppliers = useCallback(async () => {
    setLoading(true)

    try {
      const data = await getSuppliers({
        country: country || undefined,
        category: category || undefined,
      })

      setSuppliers(data)
      setError(null)

      setRateDrafts(
        Object.fromEntries(
          data.map((supplier) => [
            supplier.id,
            String(supplier.rate_per_shipment),
          ]),
        ),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unknown API error',
      )
    } finally {
      setLoading(false)
    }
  }, [country, category])

  useEffect(() => {
    void refreshSuppliers()
  }, [refreshSuppliers])

  function clearFilters() {
    setCountry('')
    setCategory('')
  }

  async function handleCreateSupplier(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const parsedRate = Number(newRate)

    if (
      !newName.trim() ||
      !Number.isFinite(parsedRate) ||
      parsedRate <= 0
    ) {
      setActionError(
        'Name and a rate greater than 0 are required.',
      )
      return
    }

    setActionBusy(true)
    setActionError(null)
    setActionMessage(null)

    try {
      const created = await createSupplier({
        name: newName.trim(),
        country: newCountry,
        categories: [newCategory],
        rate_per_shipment: parsedRate,
        currency: newCountry === 'USA' ? 'USD' : 'EUR',
        status: newStatus,
        service_zone: newServiceZone.trim() || null,
        contact_email: newContactEmail.trim() || null,
        notes: newNotes.trim() || null,
      })

      setNewName('')
      setNewRate('')
      setNewServiceZone('')
      setNewContactEmail('')
      setNewNotes('')
      setNewStatus('active')
      setShowCreateForm(false)

      setActionMessage(
        `Supplier "${created.name}" created successfully.`,
      )

      await refreshSuppliers()
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not create supplier.',
      )
    } finally {
      setActionBusy(false)
    }
  }

  async function handleRateUpdate(supplier: Supplier) {
    const parsedRate = Number(rateDrafts[supplier.id])

    if (
      !Number.isFinite(parsedRate) ||
      parsedRate <= 0
    ) {
      setActionError(
        'Rate per shipment must be greater than 0.',
      )
      return
    }

    setActionBusy(true)
    setActionError(null)
    setActionMessage(null)

    try {
      await updateSupplierRate(
        supplier.id,
        parsedRate,
      )

      setActionMessage(
        `Rate updated for "${supplier.name}".`,
      )

      await refreshSuppliers()
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not update rate.',
      )
    } finally {
      setActionBusy(false)
    }
  }

  async function handleStatusToggle(supplier: Supplier) {
    const nextStatus =
      supplier.status === 'active'
        ? 'suspended'
        : 'active'

    setActionBusy(true)
    setActionError(null)
    setActionMessage(null)

    try {
      await updateSupplierStatus(
        supplier.id,
        nextStatus,
      )

      setActionMessage(
        `Status updated for "${supplier.name}".`,
      )

      await refreshSuppliers()
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not update status.',
      )
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <main className="page">
      <section className="header">
        <div>
          <p className="eyebrow">TrackFlow Operations</p>
          <h1>Supplier Directory</h1>
          <p className="subtitle">
            Centralized supplier management for USA and Spain.
          </p>
        </div>

        <div className="header-actions">
          <Link to="/account/profile" className="secondary-button nav-link">
            Profile
          </Link>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              setShowCreateForm((current) => !current)
            }
          >
            {showCreateForm
              ? 'Close form'
              : 'New supplier'}
          </button>

          <div className="supplier-count">
            <strong>{suppliers.length}</strong>
            <span>suppliers</span>
          </div>
        </div>
      </section>

      {showCreateForm && (
        <form
          className="create-card"
          onSubmit={handleCreateSupplier}
        >
          <div className="form-heading">
            <div>
              <p className="eyebrow">Registration</p>
              <h2>New supplier</h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Name
              <input
                required
                value={newName}
                onChange={(event) =>
                  setNewName(event.target.value)
                }
              />
            </label>

            <label>
              Country
              <select
                value={newCountry}
                onChange={(event) =>
                  setNewCountry(
                    event.target.value as Country,
                  )
                }
              >
                <option value="USA">USA</option>
                <option value="Spain">Spain</option>
              </select>
            </label>

            <label>
              Category
              <select
                value={newCategory}
                onChange={(event) =>
                  setNewCategory(
                    event.target
                      .value as SupplierCategory,
                  )
                }
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {formatCategory(item)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Rate per shipment
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={newRate}
                onChange={(event) =>
                  setNewRate(event.target.value)
                }
              />
            </label>

            <label>
              Currency
              <input
                readOnly
                value={
                  newCountry === 'USA' ? 'USD' : 'EUR'
                }
              />
            </label>

            <label>
              Status
              <select
                value={newStatus}
                onChange={(event) =>
                  setNewStatus(
                    event.target.value as
                      | 'active'
                      | 'suspended',
                  )
                }
              >
                <option value="active">Active</option>
                <option value="suspended">
                  Suspended
                </option>
              </select>
            </label>

            <label>
              Service zone
              <input
                value={newServiceZone}
                onChange={(event) =>
                  setNewServiceZone(event.target.value)
                }
              />
            </label>

            <label>
              Contact email
              <input
                type="email"
                value={newContactEmail}
                onChange={(event) =>
                  setNewContactEmail(event.target.value)
                }
              />
            </label>

            <label className="notes-field">
              Notes
              <textarea
                value={newNotes}
                onChange={(event) =>
                  setNewNotes(event.target.value)
                }
              />
            </label>
          </div>

          <button
            className="primary-button"
            disabled={actionBusy}
            type="submit"
          >
            Create supplier
          </button>
        </form>
      )}

      {actionMessage && (
        <div className="action-message success-message">
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div className="action-message error-message">
          {actionError}
        </div>
      )}

      <section className="filters">
        <label>
          Country
          <select
            value={country}
            onChange={(event) =>
              setCountry(
                event.target.value as Country | '',
              )
            }
          >
            <option value="">All countries</option>
            <option value="USA">USA</option>
            <option value="Spain">Spain</option>
          </select>
        </label>

        <label>
          Category
          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target
                  .value as SupplierCategory | '',
              )
            }
          >
            <option value="">All categories</option>

            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {formatCategory(item)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="secondary-button"
          onClick={clearFilters}
        >
          Clear filters
        </button>
      </section>

      {loading && (
        <section className="state-card">
          Loading suppliers...
        </section>
      )}

      {error && (
        <section className="state-card error">
          Could not load suppliers: {error}
        </section>
      )}

      {!loading && !error && (
        <section className="table-card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Country</th>
                  <th>Categories</th>
                  <th>Rate</th>
                  <th>Status</th>
                  <th>Service zone</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <strong>{supplier.name}</strong>

                      {supplier.contact_email && (
                        <span className="secondary-text">
                          {supplier.contact_email}
                        </span>
                      )}
                    </td>

                    <td>{supplier.country}</td>

                    <td>
                      <div className="category-list">
                        {supplier.categories.map((item) => (
                          <span
                            className="category"
                            key={item}
                          >
                            {formatCategory(item)}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td>
                      <div className="rate-editor">
                        <span>{supplier.currency}</span>

                        <input
                          min="0.01"
                          step="0.01"
                          type="number"
                          value={
                            rateDrafts[supplier.id] ?? ''
                          }
                          onChange={(event) =>
                            setRateDrafts((current) => ({
                              ...current,
                              [supplier.id]:
                                event.target.value,
                            }))
                          }
                        />

                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() =>
                            void handleRateUpdate(
                              supplier,
                            )
                          }
                        >
                          Save
                        </button>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status ${supplier.status}`}
                      >
                        {supplier.status}
                      </span>
                    </td>

                    <td>
                      {supplier.service_zone ?? '—'}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="small-button"
                        disabled={actionBusy}
                        onClick={() =>
                          void handleStatusToggle(
                            supplier,
                          )
                        }
                      >
                        {supplier.status === 'active'
                          ? 'Suspend'
                          : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {suppliers.length === 0 && (
            <div className="empty-state">
              No suppliers match the selected filters.
            </div>
          )}
        </section>
      )}
    </main>
  )
}