import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createIncident,
  IncidentValidationError,
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
  INCIDENT_BRANCHES,
  INCIDENT_STATUSES,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_ORIGIN_LABELS,
  INCIDENT_BRANCH_LABELS,
  INCIDENT_STATUS_LABELS,
  type IncidentCategory,
  type IncidentOrigin,
  type IncidentBranch,
  type IncidentStatus,
} from '../api'
import '../App.css'

type FieldErrors = Partial<Record<'title' | 'description' | 'category' | 'origin' | 'branch' | 'status', string>>

export default function IncidentFormPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<IncidentCategory | ''>('')
  const [origin, setOrigin] = useState<IncidentOrigin | ''>('')
  const [branch, setBranch] = useState<IncidentBranch | ''>('')
  const [status, setStatus] = useState<IncidentStatus>('open')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (!title.trim()) errors.title = 'Title is required.'
    if (!description.trim()) errors.description = 'Description is required.'
    if (!category) errors.category = 'Select a category.'
    if (!origin) errors.origin = 'Select an origin.'
    if (!branch) errors.branch = 'Select a branch.'

    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting) return

    const errors = validate()
    setFieldErrors(errors)
    setFormError(null)
    setSuccessMessage(null)

    if (Object.keys(errors).length > 0) return

    setSubmitting(true)

    try {
      await createIncident({
        title: title.trim(),
        description: description.trim(),
        category: category as IncidentCategory,
        origin: origin as IncidentOrigin,
        branch: branch as IncidentBranch,
        status,
      })

      setSuccessMessage('Incident created successfully.')
      setTitle('')
      setDescription('')
      setCategory('')
      setOrigin('')
      setBranch('')
      setStatus('open')
      setFieldErrors({})
    } catch (err) {
      if (err instanceof IncidentValidationError) {
        setFieldErrors({ [err.field as keyof FieldErrors]: err.message })
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not create incident.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const branchEmphasis = origin === 'branch'

  return (
    <main className="page">
      <section className="header">
        <div>
          <p className="eyebrow">TrackFlow Operations</p>
          <h1>Register incident</h1>
          <p className="subtitle">Report a new operational incident.</p>
        </div>

        <div className="header-actions">
          <Link to="/incidents" className="secondary-button nav-link">
            Back to list
          </Link>
        </div>
      </section>

      {successMessage && (
        <div className="action-message success-message">{successMessage}</div>
      )}

      {formError && (
        <div className="action-message error-message">{formError}</div>
      )}

      <form className="create-card" onSubmit={handleSubmit} noValidate>
        <div className="form-heading">
          <h2>Incident details</h2>
        </div>

        <div className="form-grid">
          <label className="notes-field">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            {fieldErrors.title && (
              <span className="field-error">{fieldErrors.title}</span>
            )}
          </label>

          <label className="notes-field">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            {fieldErrors.description && (
              <span className="field-error">{fieldErrors.description}</span>
            )}
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as IncidentCategory | '')
              }
            >
              <option value="">Select a category</option>
              {INCIDENT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {INCIDENT_CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <span className="field-error">{fieldErrors.category}</span>
            )}
          </label>

          <label>
            Origin
            <select
              value={origin}
              onChange={(event) =>
                setOrigin(event.target.value as IncidentOrigin | '')
              }
            >
              <option value="">Select an origin</option>
              {INCIDENT_ORIGINS.map((item) => (
                <option key={item} value={item}>
                  {INCIDENT_ORIGIN_LABELS[item]}
                </option>
              ))}
            </select>
            {fieldErrors.origin && (
              <span className="field-error">{fieldErrors.origin}</span>
            )}
          </label>

          <label>
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as IncidentStatus)}
            >
              {INCIDENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {INCIDENT_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <label className={branchEmphasis ? 'branch-highlight' : undefined}>
            Branch
            {branchEmphasis && (
              <span className="field-hint">
                Required — this incident was reported by a branch.
              </span>
            )}
            <select
              value={branch}
              onChange={(event) =>
                setBranch(event.target.value as IncidentBranch | '')
              }
            >
              <option value="">Select a branch</option>
              {INCIDENT_BRANCHES.map((item) => (
                <option key={item} value={item}>
                  {INCIDENT_BRANCH_LABELS[item]}
                </option>
              ))}
            </select>
            {fieldErrors.branch && (
              <span className="field-error">{fieldErrors.branch}</span>
            )}
          </label>
        </div>

        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Creating...' : 'Create incident'}
        </button>
      </form>
    </main>
  )
}
