import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getIncidents,
  updateIncidentStatus,
  INCIDENT_STATUSES,
  INCIDENT_ORIGINS,
  INCIDENT_BRANCHES,
  INCIDENT_CATEGORIES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_ORIGIN_LABELS,
  INCIDENT_BRANCH_LABELS,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_STATUS_TRANSITIONS,
  type Incident,
  type IncidentStatus,
  type IncidentOrigin,
  type IncidentBranch,
  type IncidentCategory,
} from '../api'
import '../App.css'

export default function IncidentsListPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const [status, setStatus] = useState<IncidentStatus | ''>('')
  const [origin, setOrigin] = useState<IncidentOrigin | ''>('')
  const [branch, setBranch] = useState<IncidentBranch | ''>('')
  const [category, setCategory] = useState<IncidentCategory | ''>('')

  const [busyIds, setBusyIds] = useState<Set<number>>(new Set())
  const [actionError, setActionError] = useState<string | null>(null)

  const hasActiveFilters = Boolean(status || origin || branch || category)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const data = await getIncidents({
          status: status || undefined,
          origin: origin || undefined,
          branch: branch || undefined,
          category: category || undefined,
        })
        if (!cancelled) {
          setIncidents(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown API error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [status, origin, branch, category, retryKey])

  function clearFilters() {
    setLoading(true)
    setError(null)
    setStatus('')
    setOrigin('')
    setBranch('')
    setCategory('')
  }

  async function handleStatusChange(incident: Incident, nextStatus: IncidentStatus) {
    if (busyIds.has(incident.id)) return

    setBusyIds((current) => new Set(current).add(incident.id))
    setActionError(null)

    const previousStatus = incident.status

    setIncidents((current) =>
      current.map((item) =>
        item.id === incident.id ? { ...item, status: nextStatus } : item,
      ),
    )

    try {
      const updated = await updateIncidentStatus(incident.id, nextStatus)
      setIncidents((current) =>
        current.map((item) => (item.id === incident.id ? updated : item)),
      )
    } catch (err) {
      setIncidents((current) =>
        current.map((item) =>
          item.id === incident.id ? { ...item, status: previousStatus } : item,
        ),
      )
      setActionError(
        err instanceof Error ? err.message : 'Could not update incident status.',
      )
    } finally {
      setBusyIds((current) => {
        const next = new Set(current)
        next.delete(incident.id)
        return next
      })
    }
  }

  return (
    <main className="page">
      <section className="header">
        <div>
          <p className="eyebrow">TrackFlow Operations</p>
          <h1>Incidents</h1>
          <p className="subtitle">
            Centralized incident tracking across all branches.
          </p>
        </div>

        <div className="header-actions">
          <Link to="/incidents/summary" className="secondary-button nav-link">
            Summary
          </Link>
          <Link to="/incidents/new" className="primary-button nav-link">
            Register incident
          </Link>
          <Link to="/suppliers" className="secondary-button nav-link">
            Suppliers
          </Link>

          <div className="supplier-count">
            <strong>{incidents.length}</strong>
            <span>incidents</span>
          </div>
        </div>
      </section>

      {actionError && (
        <div className="action-message error-message">{actionError}</div>
      )}

      <section className="filters">
        <label>
          Status
          <select
            value={status}
            onChange={(event) => { setLoading(true); setStatus(event.target.value as IncidentStatus | '') }}
          >
            <option value="">All statuses</option>
            {INCIDENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {INCIDENT_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Origin
          <select
            value={origin}
            onChange={(event) => { setLoading(true); setOrigin(event.target.value as IncidentOrigin | '') }}
          >
            <option value="">All origins</option>
            {INCIDENT_ORIGINS.map((item) => (
              <option key={item} value={item}>
                {INCIDENT_ORIGIN_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Branch
          <select
            value={branch}
            onChange={(event) => { setLoading(true); setBranch(event.target.value as IncidentBranch | '') }}
          >
            <option value="">All branches</option>
            {INCIDENT_BRANCHES.map((item) => (
              <option key={item} value={item}>
                {INCIDENT_BRANCH_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Category
          <select
            value={category}
            onChange={(event) => { setLoading(true); setCategory(event.target.value as IncidentCategory | '') }}
          >
            <option value="">All categories</option>
            {INCIDENT_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {INCIDENT_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="secondary-button" onClick={clearFilters}>
          Clear filters
        </button>
      </section>

      {loading && (
        <section className="state-card">Loading incidents...</section>
      )}

      {!loading && error && (
        <section className="state-card error">
          <p>Could not load incidents: {error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => { setLoading(true); setError(null); setRetryKey((k) => k + 1) }}
          >
            Retry
          </button>
        </section>
      )}

      {!loading && !error && incidents.length === 0 && (
        <section className="state-card">
          {hasActiveFilters
            ? 'No incidents match the selected filters.'
            : 'No incidents found.'}
        </section>
      )}

      {!loading && !error && incidents.length > 0 && (
        <section className="table-card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Origin</th>
                  <th>Branch</th>
                  <th>Created</th>
                  <th>Updated</th>
                </tr>
              </thead>

              <tbody>
                {incidents.map((incident) => {
                  const transitions = INCIDENT_STATUS_TRANSITIONS[incident.status]
                  const isBusy = busyIds.has(incident.id)

                  return (
                    <tr key={incident.id}>
                      <td>
                        <strong>{incident.title}</strong>
                        <span className="secondary-text">{incident.description}</span>
                      </td>
                      <td>{INCIDENT_CATEGORY_LABELS[incident.category]}</td>
                      <td>
                        <span className={`status incident-status-${incident.status}`}>
                          {INCIDENT_STATUS_LABELS[incident.status]}
                        </span>
                        {transitions.length > 0 && (
                          <select
                            disabled={isBusy}
                            value=""
                            onChange={(event) => {
                              const value = event.target.value as IncidentStatus
                              if (value) void handleStatusChange(incident, value)
                            }}
                          >
                            <option value="">
                              {isBusy ? 'Updating...' : 'Change status'}
                            </option>
                            {transitions.map((next) => (
                              <option key={next} value={next}>
                                Move to {INCIDENT_STATUS_LABELS[next]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>{INCIDENT_ORIGIN_LABELS[incident.origin]}</td>
                      <td>{INCIDENT_BRANCH_LABELS[incident.branch]}</td>
                      <td>{new Date(incident.created_at).toLocaleString()}</td>
                      <td>{new Date(incident.updated_at).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
