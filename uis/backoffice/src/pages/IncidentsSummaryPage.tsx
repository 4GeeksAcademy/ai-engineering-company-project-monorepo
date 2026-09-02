import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getIncidentSummary,
  INCIDENT_STATUSES,
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
  INCIDENT_BRANCHES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_ORIGIN_LABELS,
  INCIDENT_BRANCH_LABELS,
  type IncidentSummary,
} from '../api'
import '../App.css'

export default function IncidentsSummaryPage() {
  const [summary, setSummary] = useState<IncidentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const data = await getIncidentSummary()
        if (!cancelled) {
          setSummary(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load summary.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [retryKey])

  return (
    <main className="page">
      <section className="header">
        <div>
          <p className="eyebrow">TrackFlow Operations</p>
          <h1>Incidents summary</h1>
          <p className="subtitle">Aggregated metrics across all incidents.</p>
        </div>

        <div className="header-actions">
          <Link to="/incidents" className="secondary-button nav-link">
            Back to list
          </Link>

          <div className="supplier-count">
            <strong>{summary?.total ?? 0}</strong>
            <span>total</span>
          </div>
        </div>
      </section>

      {loading && (
        <section className="state-card">Loading summary...</section>
      )}

      {!loading && error && (
        <section className="state-card error">
          <p>Could not load summary: {error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => { setLoading(true); setError(null); setRetryKey((k) => k + 1) }}
          >
            Retry
          </button>
        </section>
      )}

      {!loading && !error && summary && (
        <div className="summary-grid">
          <section className="summary-card">
            <h2>By status</h2>
            <ul>
              {INCIDENT_STATUSES.map((item) => (
                <li key={item}>
                  <span>{INCIDENT_STATUS_LABELS[item]}</span>
                  <strong>{summary.by_status[item] ?? 0}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="summary-card">
            <h2>By category</h2>
            <ul>
              {INCIDENT_CATEGORIES.map((item) => (
                <li key={item}>
                  <span>{INCIDENT_CATEGORY_LABELS[item]}</span>
                  <strong>{summary.by_category[item] ?? 0}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="summary-card">
            <h2>By origin</h2>
            <ul>
              {INCIDENT_ORIGINS.map((item) => (
                <li key={item}>
                  <span>{INCIDENT_ORIGIN_LABELS[item]}</span>
                  <strong>{summary.by_origin[item] ?? 0}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="summary-card">
            <h2>By branch</h2>
            <ul>
              {INCIDENT_BRANCHES.map((item) => (
                <li key={item}>
                  <span>{INCIDENT_BRANCH_LABELS[item]}</span>
                  <strong>{summary.by_branch[item] ?? 0}</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  )
}
